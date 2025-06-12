const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const ScheduledTransaction = require('../../../src/models/ScheduledTransaction');
const Account = require('../../../src/models/Account');
const Category = require('../../../src/models/Category');
const express = require('express');
const bodyParser = require('body-parser');

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

describe('ScheduledTransaction Routes - Integration Tests', () => {
  let mongoServer;
  let testAccount;
  let testCategory;
  
  beforeAll(async () => {
    // Create an in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(uri);
  });
  
  afterAll(async () => {
    // Disconnect and stop the MongoDB Memory Server
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // Clear the database before each test
    await ScheduledTransaction.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    
    // Create test account and category
    testAccount = await Account.create({
      userId: 'user-id-1',
      name: 'Test Account',
      type: 'CHECKING',
      balance: 1000,
      currency: 'PLN'
    });
    
    testCategory = await Category.create({
      userId: 'user-id-1',
      name: 'Test Category',
      type: 'expense',
      color: '#FF0000',
      icon: 'shopping-cart'
    });
  });
  
  describe('GET /api/scheduled-transactions', () => {
    it('should return all scheduled transactions for authenticated user', async () => {
      // Create test scheduled transactions
      const scheduledTransactions = [
        {
          userId: 'user-id-1',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 500,
          type: 'expense',
          description: 'Monthly rent',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'active'
        },
        {
          userId: 'user-id-1',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 3000,
          type: 'income',
          description: 'Monthly salary',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'active'
        }
      ];
      
      await ScheduledTransaction.create(scheduledTransactions);
      
      const response = await request(app)
        .get('/api/scheduled-transactions')
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .expect(200);
      
      expect(response.body).toEqual({
        status: 'success',
        results: 2,
        totalCount: 2,
        pagination: {
          page: 1,
          limit: 100,
          totalPages: 1
        },
        data: {
          scheduledTransactions: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-id-1',
              amount: 500,
              description: 'Monthly rent'
            }),
            expect.objectContaining({
              userId: 'user-id-1',
              amount: 3000,
              description: 'Monthly salary'
            })
          ])
        }
      });
    });
    
    it('should filter scheduled transactions by status', async () => {
      // Create test scheduled transactions with different statuses
      const scheduledTransactions = [
        {
          userId: 'user-id-1',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 500,
          type: 'expense',
          description: 'Active transaction',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'active'
        },
        {
          userId: 'user-id-1',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 100,
          type: 'expense',
          description: 'Paused transaction',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'paused'
        }
      ];
      
      await ScheduledTransaction.create(scheduledTransactions);
      
      const response = await request(app)
        .get('/api/scheduled-transactions?status=active')
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .expect(200);
      
      expect(response.body.results).toBe(1);
      expect(response.body.data.scheduledTransactions[0]).toMatchObject({
        description: 'Active transaction',
        status: 'active'
      });
    });
    
    it('should support pagination', async () => {
      // Create multiple test scheduled transactions
      const scheduledTransactions = [];
      for (let i = 1; i <= 5; i++) {
        scheduledTransactions.push({
          userId: 'user-id-1',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 100 * i,
          type: 'expense',
          description: `Transaction ${i}`,
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'active'
        });
      }
      
      await ScheduledTransaction.create(scheduledTransactions);
      
      const response = await request(app)
        .get('/api/scheduled-transactions?page=2&limit=2')
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .expect(200);
      
      expect(response.body.results).toBe(2);
      expect(response.body.totalCount).toBe(5);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 2,
        totalPages: 3
      });
    });
  });
  
  describe('POST /api/scheduled-transactions', () => {
    it('should create a new scheduled transaction', async () => {
      const transactionData = {
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Monthly rent',
        payee: 'Landlord',
        tags: ['rent', 'housing'],
        frequency: 'monthly',
        startDate: '2025-01-15',
        dayOfMonth: 15,
        autoExecute: true
      };
      
      const response = await request(app)
        .post('/api/scheduled-transactions')
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .send(transactionData)
        .expect(201);
      
      expect(response.body).toEqual({
        status: 'success',
        data: {
          scheduledTransaction: expect.objectContaining({
            userId: 'user-id-1',
            amount: 500,
            type: 'expense',
            description: 'Monthly rent',
            payee: 'Landlord',
            tags: ['rent', 'housing'],
            frequency: 'monthly',
            dayOfMonth: 15,
            autoExecute: true,
            status: 'active'
          })
        }
      });
      
      // Verify the transaction was saved to the database
      const savedTransaction = await ScheduledTransaction.findOne({
        userId: 'user-id-1',
        description: 'Monthly rent'
      });
      expect(savedTransaction).not.toBeNull();
      expect(savedTransaction.amount).toBe(500);
    });
    
    it('should handle validation errors', async () => {
      const invalidTransactionData = {
        // Missing required fields
        amount: 500,
        type: 'expense'
      };
      
      const response = await request(app)
        .post('/api/scheduled-transactions')
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .send(invalidTransactionData)
        .expect(400); // Expecting an error due to missing required fields
    });
  });
  
  describe('GET /api/scheduled-transactions/:id', () => {
    it('should return a specific scheduled transaction', async () => {
      // Create test scheduled transaction
      const scheduledTransaction = await ScheduledTransaction.create({
        userId: 'user-id-1',
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Monthly rent',
        frequency: 'monthly',
        startDate: new Date('2025-01-01'),
        nextExecutionDate: new Date('2025-02-01'),
        status: 'active'
      });
      
      const response = await request(app)
        .get(`/api/scheduled-transactions/${scheduledTransaction._id}`)
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .expect(200);
      
      expect(response.body).toEqual({
        status: 'success',
        data: {
          scheduledTransaction: expect.objectContaining({
            _id: scheduledTransaction._id.toString(),
            userId: 'user-id-1',
            amount: 500,
            description: 'Monthly rent'
          })
        }
      });
    });
    
    it('should return 404 for non-existent scheduled transaction', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/scheduled-transactions/${nonExistentId}`)
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .expect(404); // Expecting error for non-existent transaction
    });
    
    it('should not allow access to another user\'s scheduled transaction', async () => {
      // Create test scheduled transaction for different user
      const scheduledTransaction = await ScheduledTransaction.create({
        userId: 'user-id-2',
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Monthly rent',
        frequency: 'monthly',
        startDate: new Date('2025-01-01'),
        nextExecutionDate: new Date('2025-02-01'),
        status: 'active'
      });
      
      await request(app)
        .get(`/api/scheduled-transactions/${scheduledTransaction._id}`)
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .expect(403); // Expecting error for unauthorized access
    });
    
    it('should allow admin to access any scheduled transaction', async () => {
      // Create test scheduled transaction for different user
      const scheduledTransaction = await ScheduledTransaction.create({
        userId: 'user-id-2',
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Monthly rent',
        frequency: 'monthly',
        startDate: new Date('2025-01-01'),
        nextExecutionDate: new Date('2025-02-01'),
        status: 'active'
      });
      
      const response = await request(app)
        .get(`/api/scheduled-transactions/${scheduledTransaction._id}`)
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .expect(200);
      
      expect(response.body.data.scheduledTransaction.userId).toBe('user-id-2');
    });
  });
  
  describe('PUT /api/scheduled-transactions/:id', () => {
    it('should update a scheduled transaction', async () => {
      // Create test scheduled transaction
      const scheduledTransaction = await ScheduledTransaction.create({
        userId: 'user-id-1',
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Monthly rent',
        frequency: 'monthly',
        startDate: new Date('2025-01-01'),
        nextExecutionDate: new Date('2025-02-01'),
        status: 'active'
      });
      
      const updateData = {
        amount: 600,
        description: 'Updated monthly rent',
        status: 'paused'
      };
      
      await request(app)
        .put(`/api/scheduled-transactions/${scheduledTransaction._id}`)
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .send(updateData)
        .expect(200);
      
      // Verify the transaction was updated in the database
      const updatedTransaction = await ScheduledTransaction.findById(scheduledTransaction._id);
      expect(updatedTransaction.amount).toBe(600);
      expect(updatedTransaction.description).toBe('Updated monthly rent');
      expect(updatedTransaction.status).toBe('paused');
    });
    
    it('should not allow updating another user\'s scheduled transaction', async () => {
      // Create test scheduled transaction for different user
      const scheduledTransaction = await ScheduledTransaction.create({
        userId: 'user-id-2',
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Monthly rent',
        frequency: 'monthly',
        startDate: new Date('2025-01-01'),
        nextExecutionDate: new Date('2025-02-01'),
        status: 'active'
      });
      
      const updateData = {
        amount: 600
      };
      
      await request(app)
        .put(`/api/scheduled-transactions/${scheduledTransaction._id}`)
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .send(updateData)
        .expect(403); // Expecting error for unauthorized access
    });
  });
  
  describe('DELETE /api/scheduled-transactions/:id', () => {
    it('should delete a scheduled transaction', async () => {
      // Create test scheduled transaction
      const scheduledTransaction = await ScheduledTransaction.create({
        userId: 'user-id-1',
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Monthly rent',
        frequency: 'monthly',
        startDate: new Date('2025-01-01'),
        nextExecutionDate: new Date('2025-02-01'),
        status: 'active'
      });
      
      await request(app)
        .delete(`/api/scheduled-transactions/${scheduledTransaction._id}`)
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .expect(200);
      
      // Verify the transaction was deleted from the database
      const deletedTransaction = await ScheduledTransaction.findById(scheduledTransaction._id);
      expect(deletedTransaction).toBeNull();
    });
    
    it('should not allow deleting another user\'s scheduled transaction', async () => {
      // Create test scheduled transaction for different user
      const scheduledTransaction = await ScheduledTransaction.create({
        userId: 'user-id-2',
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Monthly rent',
        frequency: 'monthly',
        startDate: new Date('2025-01-01'),
        nextExecutionDate: new Date('2025-02-01'),
        status: 'active'
      });
      
      await request(app)
        .delete(`/api/scheduled-transactions/${scheduledTransaction._id}`)
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .expect(403); // Expecting error for unauthorized access

      // Verify the transaction was not deleted
      const stillExistsTransaction = await ScheduledTransaction.findById(scheduledTransaction._id);
      expect(stillExistsTransaction).not.toBeNull();
    });
    
    it('should allow admin to delete any scheduled transaction', async () => {
      // Create test scheduled transaction for different user
      const scheduledTransaction = await ScheduledTransaction.create({
        userId: 'user-id-2',
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Monthly rent',
        frequency: 'monthly',
        startDate: new Date('2025-01-01'),
        nextExecutionDate: new Date('2025-02-01'),
        status: 'active'
      });
      
      await request(app)
        .delete(`/api/scheduled-transactions/${scheduledTransaction._id}`)
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .expect(200);

      // Verify the transaction was deleted from the database
      const deletedTransaction = await ScheduledTransaction.findById(scheduledTransaction._id);
      expect(deletedTransaction).toBeNull();
    });
  });
  
  describe('GET /api/scheduled-transactions/upcoming', () => {
    it('should return upcoming scheduled transactions', async () => {
      // Create test scheduled transactions with different next execution dates
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const scheduledTransactions = [
        {
          userId: 'user-id-1',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 500,
          type: 'expense',
          description: 'Due tomorrow',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: tomorrow,
          status: 'active'
        },
        {
          userId: 'user-id-1',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 300,
          type: 'expense',
          description: 'Due next week',
          frequency: 'weekly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: nextWeek,
          status: 'active'
        }
      ];
      
      await ScheduledTransaction.create(scheduledTransactions);
      
      const response = await request(app)
        .get('/api/scheduled-transactions/upcoming')
        .set('x-user-id', 'user-id-1')
        .set('x-user-role', 'user')
        .expect(200);
    });
  });
});
