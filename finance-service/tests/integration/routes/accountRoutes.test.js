const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const Account = require('../../../src/models/Account');
const Transaction = require('../../../src/models/Transaction');

// Create a basic express app for testing
const app = express();
app.use(bodyParser.json());

// Mock auth middleware
jest.mock('../../../src/middleware/auth', () => ({
  authMiddleware: (req, res, next) => next(),
  requireRole: () => (req, res, next) => {
    // Simulate auth data being added by the JWT middleware
    req.auth = {
      sub: req.headers['x-user-id'] || 'test-user-id',
      realm_access: {
        roles: [req.headers['x-user-role'] || 'user']
      }
    };
    next();
  },
  ROLES: {
    ADMIN: 'admin',
    USER: 'user'
  }
}));

// Import routes after mocking dependencies
const routes = require('../../../src/routes');
app.use('/api', routes);

describe('Account API - Integration Tests', () => {
  let mongoServer;
  
  beforeAll(async () => {
    // Create a MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(uri);
  });
  
  afterAll(async () => {
    // Disconnect from the database
    await mongoose.disconnect();
    
    // Stop the MongoDB Memory Server
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // Clear the database before each test
    await Account.deleteMany({});
    await Transaction.deleteMany({});
  });
  
  describe('GET /api/accounts', () => {
    it('should return all accounts for a user', async () => {
      // Create test accounts
      await Account.create([
        {
          userId: 'test-user-id',
          name: 'Checking Account',
          type: 'CHECKING',
          balance: 1000,
          currency: 'PLN'
        },
        {
          userId: 'test-user-id',
          name: 'Savings Account',
          type: 'SAVINGS',
          balance: 5000,
          currency: 'PLN'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/accounts')
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
      expect(response.body.data.accounts).toHaveLength(2);
      expect(response.body.data.accounts[0].name).toBeDefined();
      expect(response.body.data.accounts[1].name).toBeDefined();
    });
    
    it('should only return accounts for the authenticated user', async () => {
      // Create accounts for multiple users
      await Account.create([
        {
          userId: 'test-user-id',
          name: 'My Account',
          type: 'CHECKING',
          balance: 1000,
          currency: 'PLN'
        },
        {
          userId: 'other-user-id',
          name: 'Someone Else Account',
          type: 'CHECKING',
          balance: 2000,
          currency: 'PLN'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/accounts')
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.accounts).toHaveLength(1);
      expect(response.body.data.accounts[0].name).toBe('My Account');
    });
    
    it('should allow admin to filter accounts by userId', async () => {
      // Create accounts for multiple users
      await Account.create([
        {
          userId: 'test-user-id',
          name: 'User Account',
          type: 'CHECKING',
          balance: 1000,
          currency: 'PLN'
        },
        {
          userId: 'other-user-id',
          name: 'Other User Account',
          type: 'SAVINGS',
          balance: 2000,
          currency: 'USD'
        }
      ]);
      
      // Make API request as admin
      const response = await request(app)
        .get('/api/accounts')
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .query({ userId: 'other-user-id' })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.accounts).toHaveLength(1);
      expect(response.body.data.accounts[0].name).toBe('Other User Account');
      expect(response.body.data.accounts[0].userId).toBe('other-user-id');
    });
  });
  
  describe('POST /api/accounts', () => {
    it('should create a new account', async () => {
      const accountData = {
        name: 'New Test Account',
        type: 'CHECKING',
        balance: 1500,
        currency: 'PLN',
        description: 'Integration test account'
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/accounts')
        .set('x-user-id', 'test-user-id')
        .send(accountData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.account.name).toBe('New Test Account');
      expect(response.body.data.account.balance).toBe(1500);
      expect(response.body.data.account.userId).toBe('test-user-id');
      
      // Verify the account was created in the database
      const account = await Account.findOne({ name: 'New Test Account' });
      expect(account).toBeTruthy();
      expect(account.userId).toBe('test-user-id');
    });
    
    it('should handle validation errors', async () => {
      const invalidAccountData = {
        name: 'Invalid Account',
        // Missing required 'type' field
        balance: 1000,
        currency: 'PLN'
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/accounts')
        .set('x-user-id', 'test-user-id')
        .send(invalidAccountData);
      
      // Expect an error response (exact status code depends on your error handling middleware)
      expect(response.status).not.toBe(201);
      expect(response.body.status).not.toBe('success');
    });
  });
  
  describe('GET /api/accounts/:id', () => {
    it('should return a specific account', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN',
        description: 'Account details test'
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/accounts/${account._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.account.name).toBe('Test Account');
      expect(response.body.data.account.balance).toBe(1000);
      expect(response.body.data.account.description).toBe('Account details test');
    });
    
    it('should return 404 if account does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Make API request
      const response = await request(app)
        .get(`/api/accounts/${nonExistentId}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Account not found');
    });
    
    it('should return 403 if user tries to access another user\'s account', async () => {
      // Create a test account for a different user
      const account = await Account.create({
        userId: 'other-user-id',
        name: 'Other User Account',
        type: 'SAVINGS',
        balance: 2000,
        currency: 'USD'
      });
      
      // Make API request with different user ID
      const response = await request(app)
        .get(`/api/accounts/${account._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(403);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('You do not have permission to access this account');
    });
    
    it('should allow admin to access any account', async () => {
      // Create a test account for a specific user
      const account = await Account.create({
        userId: 'some-user-id',
        name: 'User Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      // Make API request as admin
      const response = await request(app)
        .get(`/api/accounts/${account._id}`)
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.account.name).toBe('User Account');
      expect(response.body.data.account.userId).toBe('some-user-id');
    });
  });
  
  describe('PUT /api/accounts/:id', () => {
    it('should update an existing account', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Original Name',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN',
        description: 'Original description'
      });
      
      const updateData = {
        name: 'Updated Name',
        balance: 1500,
        description: 'Updated description'
      };
      
      // Make API request
      const response = await request(app)
        .put(`/api/accounts/${account._id}`)
        .set('x-user-id', 'test-user-id')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.account.name).toBe('Updated Name');
      expect(response.body.data.account.balance).toBe(1500);
      expect(response.body.data.account.description).toBe('Updated description');
      
      // Verify only specified fields were updated
      expect(response.body.data.account.type).toBe('CHECKING');
      expect(response.body.data.account.currency).toBe('PLN');
      
      // Verify the changes in the database
      const updatedAccount = await Account.findById(account._id);
      expect(updatedAccount.name).toBe('Updated Name');
      expect(updatedAccount.balance).toBe(1500);
    });
    
    it('should return 404 if account does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Make API request
      const response = await request(app)
        .put(`/api/accounts/${nonExistentId}`)
        .set('x-user-id', 'test-user-id')
        .send({ name: 'New Name' })
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Account not found');
    });
    
    it('should return 403 if user tries to update another user\'s account', async () => {
      // Create a test account for a different user
      const account = await Account.create({
        userId: 'other-user-id',
        name: 'Other User Account',
        type: 'SAVINGS',
        balance: 2000,
        currency: 'USD'
      });
      
      // Make API request with different user ID
      const response = await request(app)
        .put(`/api/accounts/${account._id}`)
        .set('x-user-id', 'test-user-id')
        .send({ name: 'Attempted Update' })
        .expect('Content-Type', /json/)
        .expect(403);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('You do not have permission to update this account');
    });
  });
  
  describe('DELETE /api/accounts/:id', () => {
    it('should delete an existing account', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Account to Delete',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      // Make API request
      const response = await request(app)
        .delete(`/api/accounts/${account._id}`)
        .set('x-user-id', 'test-user-id')
        .expect(204);
      
      // Verify the account was deleted from the database
      const deletedAccount = await Account.findById(account._id);
      expect(deletedAccount).toBeNull();
    });
    
    it('should return 404 if account does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Make API request
      const response = await request(app)
        .delete(`/api/accounts/${nonExistentId}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Account not found');
    });
    
    it('should return 403 if user tries to delete another user\'s account', async () => {
      // Create a test account for a different user
      const account = await Account.create({
        userId: 'other-user-id',
        name: 'Other User Account',
        type: 'SAVINGS',
        balance: 2000,
        currency: 'USD'
      });
      
      // Make API request with different user ID
      const response = await request(app)
        .delete(`/api/accounts/${account._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(403);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('You do not have permission to delete this account');
    });
  });
});
