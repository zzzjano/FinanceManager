const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const Transaction = require('../../../src/models/Transaction');
const Account = require('../../../src/models/Account');
const Category = require('../../../src/models/Category');

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
      role: req.headers['x-user-role'] || 'user',
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

describe('Transaction API - Integration Tests', () => {
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
    await Transaction.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
  });
  
  describe('GET /api/transactions', () => {
    it('should return all transactions for a user', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions
      await Transaction.create([
        {
          userId: 'test-user-id',
          accountId: account._id,
          amount: 100,
          type: 'income',
          date: new Date('2025-05-01'),
          description: 'Test income'
        },
        {
          userId: 'test-user-id',
          accountId: account._id,
          amount: 50,
          type: 'expense',
          date: new Date('2025-05-02'),
          description: 'Test expense'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/transactions')
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.transactions[0].amount).toBeDefined();
      expect(response.body.data.transactions[1].amount).toBeDefined();
    });
    
    it('should filter transactions by date range', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000
      });
      
      // Create test transactions with different dates
      await Transaction.create([
        {
          userId: 'test-user-id',
          accountId: account._id,
          amount: 100,
          type: 'income',
          date: new Date('2025-01-15'),
          description: 'January Transaction'
        },
        {
          userId: 'test-user-id',
          accountId: account._id,
          amount: 50,
          type: 'expense',
          date: new Date('2025-02-20'),
          description: 'February Transaction'
        },
        {
          userId: 'test-user-id',
          accountId: account._id,
          amount: 75,
          type: 'income',
          date: new Date('2025-03-25'),
          description: 'March Transaction'
        }
      ]);
      
      // Make API request with date filters
      const response = await request(app)
        .get('/api/transactions')
        .query({
          startDate: '2025-02-01',
          endDate: '2025-02-28'
        })
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].description).toBe('February Transaction');
    });
    
    it('should filter transactions by account', async () => {
      // Create test accounts
      const account1 = await Account.create({
        userId: 'test-user-id',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000
      });
      
      const account2 = await Account.create({
        userId: 'test-user-id',
        name: 'Savings Account',
        type: 'SAVINGS',
        balance: 5000
      });
      
      // Create test transactions for different accounts
      await Transaction.create([
        {
          userId: 'test-user-id',
          accountId: account1._id,
          amount: 100,
          type: 'income',
          date: new Date(),
          description: 'Checking transaction'
        },
        {
          userId: 'test-user-id',
          accountId: account2._id,
          amount: 500,
          type: 'income',
          date: new Date(),
          description: 'Savings transaction'
        }
      ]);
      
      // Make API request with account filter
      const response = await request(app)
        .get('/api/transactions')
        .query({ accountId: account2._id.toString() })
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].description).toBe('Savings transaction');
    });
  });
  
  describe('POST /api/transactions', () => {
    it('should create a new transaction', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000
      });
      
      // Create a test category
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Test Category',
        type: 'income'
      });
      
      // Transaction data
      const transactionData = {
        accountId: account._id,
        categoryId: category._id,
        amount: 250,
        type: 'income',
        description: 'Test income',
        payee: 'Test payer',
        date: '2025-05-10T12:00:00Z',
        isRecurring: false,
        tags: ['test', 'income']
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/transactions')
        .set('x-user-id', 'test-user-id')
        .send(transactionData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.transaction.amount).toBe(250);
      expect(response.body.data.transaction.type).toBe('income');
      expect(response.body.data.transaction.description).toBe('Test income');
      
      // Check that account balance was updated
      const updatedAccount = await Account.findById(account._id);
      expect(updatedAccount.balance).toBe(1250); // 1000 + 250
    });
    
    it('should return 404 if account does not exist', async () => {
      // Non-existent account ID
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Transaction data with non-existent account
      const transactionData = {
        accountId: nonExistentId,
        amount: 100,
        type: 'income',
        description: 'Test transaction'
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/transactions')
        .set('x-user-id', 'test-user-id')
        .send(transactionData)
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Account not found or does not belong to the user');
    });
  });
  
  describe('GET /api/transactions/:id', () => {
    it('should return a specific transaction', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000
      });
      
      // Create a test transaction
      const transaction = await Transaction.create({
        userId: 'test-user-id',
        accountId: account._id,
        amount: 100,
        type: 'income',
        date: new Date(),
        description: 'Test transaction'
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/transactions/${transaction._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.transaction.amount).toBe(100);
      expect(response.body.data.transaction.description).toBe('Test transaction');
    });
    
    it('should return 404 if transaction does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Make API request
      const response = await request(app)
        .get(`/api/transactions/${nonExistentId}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Transaction not found');
    });
    
    it('should return 403 if user tries to access another user\'s transaction', async () => {
      // Create a test account for other user
      const account = await Account.create({
        userId: 'other-user-id',
        name: 'Other Account',
        type: 'CHECKING',
        balance: 1000
      });
      
      // Create a test transaction for other user
      const transaction = await Transaction.create({
        userId: 'other-user-id',
        accountId: account._id,
        amount: 100,
        type: 'income',
        date: new Date(),
        description: 'Other user transaction'
      });
      
      // Make API request with different user ID
      const response = await request(app)
        .get(`/api/transactions/${transaction._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(403);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('You do not have permission to access this transaction');
    });
  });
  
  describe('PUT /api/transactions/:id', () => {
    it('should update a transaction', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000
      });
      
      // Create a test transaction
      const transaction = await Transaction.create({
        userId: 'test-user-id',
        accountId: account._id,
        amount: 100,
        type: 'income',
        date: new Date(),
        description: 'Original description'
      });
      
      // Update data
      const updateData = {
        amount: 150,
        description: 'Updated description'
      };
      
      // Make API request
      const response = await request(app)
        .put(`/api/transactions/${transaction._id}`)
        .set('x-user-id', 'test-user-id')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.transaction.amount).toBe(150);
      expect(response.body.data.transaction.description).toBe('Updated description');
      
      // Check that account balance was updated correctly
      const updatedAccount = await Account.findById(account._id);
      expect(updatedAccount.balance).toBe(1050); // 1000 + 100 - 100 + 150 = 1150
    });
  });
  
  describe('DELETE /api/transactions/:id', () => {
    it('should delete a transaction and update account balance', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000
      });
      
      // Create a test transaction
      const transaction = await Transaction.create({
        userId: 'test-user-id',
        accountId: account._id,
        amount: 200,
        type: 'income',
        date: new Date(),
        description: 'Transaction to delete'
      });
      
      // Manually update account balance to reflect the transaction
      await Account.findByIdAndUpdate(account._id, { $inc: { balance: 200 } });
      
      // Make API request
      const response = await request(app)
        .delete(`/api/transactions/${transaction._id}`)
        .set('x-user-id', 'test-user-id')
        .expect(204);
      
      // Verify transaction was deleted
      const deletedTransaction = await Transaction.findById(transaction._id);
      expect(deletedTransaction).toBeNull();
      
      // Verify account balance adjustment
      const updatedAccount = await Account.findById(account._id);
      expect(updatedAccount.balance).toBe(1000); // 1200 - 200 = 1000
    });
  });
});
