const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const scheduledTransactionController = require('../../../src/controllers/scheduledTransactionController');
const ScheduledTransaction = require('../../../src/models/ScheduledTransaction');
const Account = require('../../../src/models/Account');
const Category = require('../../../src/models/Category');
const { logger } = require('../../../src/utils/logger');

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

describe('ScheduledTransaction Controller - Unit Tests', () => {
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
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('getAllScheduledTransactions', () => {
    it('should return all scheduled transactions for a user', async () => {
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getAllScheduledTransactions(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
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
              type: 'expense',
              description: 'Monthly rent'
            }),
            expect.objectContaining({
              userId: 'user-id-1',
              amount: 3000,
              type: 'income',
              description: 'Monthly salary'
            })
          ])
        }
      });
      expect(next).not.toHaveBeenCalled();
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
          amount: 100,
          type: 'expense',
          description: 'Paused subscription',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'paused'
        }
      ];
      
      await ScheduledTransaction.create(scheduledTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          status: 'active'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getAllScheduledTransactions(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        totalCount: 1,
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
              status: 'active'
            })
          ])
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should filter scheduled transactions by account', async () => {
      // Create another test account
      const testAccount2 = await Account.create({
        userId: 'user-id-1',
        name: 'Test Account 2',
        type: 'SAVINGS',
        balance: 2000,
        currency: 'PLN'
      });
      
      // Create test scheduled transactions
      const scheduledTransactions = [
        {
          userId: 'user-id-1',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 500,
          type: 'expense',
          description: 'From checking',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'active'
        },
        {
          userId: 'user-id-1',
          accountId: testAccount2._id,
          categoryId: testCategory._id,
          amount: 100,
          type: 'expense',
          description: 'From savings',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'active'
        }
      ];
      
      await ScheduledTransaction.create(scheduledTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          accountId: testAccount._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getAllScheduledTransactions(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        totalCount: 1,
        pagination: {
          page: 1,
          limit: 100,
          totalPages: 1
        },
        data: {
          scheduledTransactions: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-id-1',
              description: 'From checking',
              accountId: testAccount._id
            })
          ])
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should filter scheduled transactions by frequency', async () => {
      // Create test scheduled transactions with different frequencies
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
          amount: 100,
          type: 'expense',
          description: 'Weekly groceries',
          frequency: 'weekly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-01-08'),
          status: 'active'
        }
      ];
      
      await ScheduledTransaction.create(scheduledTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          frequency: 'weekly'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getAllScheduledTransactions(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        totalCount: 1,
        pagination: {
          page: 1,
          limit: 100,
          totalPages: 1
        },
        data: {
          scheduledTransactions: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-id-1',
              description: 'Weekly groceries',
              frequency: 'weekly'
            })
          ])
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return only the user\'s own scheduled transactions', async () => {
      // Create test scheduled transactions for different users
      const scheduledTransactions = [
        {
          userId: 'user-id-1',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 500,
          type: 'expense',
          description: 'User 1 transaction',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'active'
        },
        {
          userId: 'user-id-2',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 300,
          type: 'expense',
          description: 'User 2 transaction',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'active'
        }
      ];
      
      await ScheduledTransaction.create(scheduledTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getAllScheduledTransactions(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        totalCount: 1,
        pagination: {
          page: 1,
          limit: 100,
          totalPages: 1
        },
        data: {
          scheduledTransactions: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-id-1',
              description: 'User 1 transaction'
            })
          ])
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should allow admin to get all scheduled transactions for a specific user', async () => {
      // Create test scheduled transactions for different users
      const scheduledTransactions = [
        {
          userId: 'user-id-1',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 500,
          type: 'expense',
          description: 'User 1 transaction',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'active'
        },
        {
          userId: 'user-id-2',
          accountId: testAccount._id,
          categoryId: testCategory._id,
          amount: 300,
          type: 'expense',
          description: 'User 2 transaction',
          frequency: 'monthly',
          startDate: new Date('2025-01-01'),
          nextExecutionDate: new Date('2025-02-01'),
          status: 'active'
        }
      ];
      
      await ScheduledTransaction.create(scheduledTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        query: {
          userId: 'user-id-2'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getAllScheduledTransactions(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        totalCount: 1,
        pagination: {
          page: 1,
          limit: 100,
          totalPages: 1
        },
        data: {
          scheduledTransactions: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-id-2',
              description: 'User 2 transaction'
            })
          ])
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should handle pagination correctly', async () => {
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          page: '2',
          limit: '2'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getAllScheduledTransactions(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 2,
        totalCount: 5,
        pagination: {
          page: 2,
          limit: 2,
          totalPages: 3
        },
        data: {
          scheduledTransactions: expect.any(Array)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should handle database errors', async () => {
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Mock ScheduledTransaction.find to throw an error
      jest.spyOn(ScheduledTransaction, 'find').mockImplementation(() => {
        throw new Error('Database error');
      });
      
      // Call the controller function
      await scheduledTransactionController.getAllScheduledTransactions(req, res, next);
      
      // Assertions
      expect(logger.error).toHaveBeenCalledWith('Error fetching scheduled transactions:', expect.any(Error));
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      
      // Restore the original method
      ScheduledTransaction.find.mockRestore();
    });
  });
  
  describe('createScheduledTransaction', () => {
    it('should create a new scheduled transaction with monthly frequency', async () => {
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: transactionData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.createScheduledTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          scheduledTransaction: expect.objectContaining({
            userId: 'user-id-1',
            accountId: testAccount._id,
            categoryId: testCategory._id,
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
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should create a new scheduled transaction with weekly frequency', async () => {
      const transactionData = {
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 100,
        type: 'expense',
        description: 'Weekly groceries',
        frequency: 'weekly',
        startDate: '2025-01-01',
        dayOfWeek: 1, // Monday
        autoExecute: false
      };
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: transactionData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.createScheduledTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          scheduledTransaction: expect.objectContaining({
            userId: 'user-id-1',
            amount: 100,
            type: 'expense',
            description: 'Weekly groceries',
            frequency: 'weekly',
            dayOfWeek: 1,
            autoExecute: false,
            status: 'active'
          })
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
      it('should allow admin to create a scheduled transaction for another user', async () => {
      // First create an account for user-id-2
      const testAccount2 = await Account.create({
        userId: 'user-id-2',
        name: 'Test Account 2',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      const transactionData = {
        userId: 'user-id-2',
        accountId: testAccount2._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Admin created transaction',
        frequency: 'monthly',
        startDate: '2025-01-01'
      };
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        body: transactionData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.createScheduledTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          scheduledTransaction: expect.objectContaining({
            userId: 'user-id-2',
            description: 'Admin created transaction'
          })
        }
      });
      expect(next).not.toHaveBeenCalled();
    });    it('should handle account not found error', async () => {
      const transactionData = {
        accountId: new mongoose.Types.ObjectId(),
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Test transaction',
        frequency: 'monthly',
        startDate: '2025-01-01'
      };
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: transactionData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.createScheduledTransaction(req, res, next);
      
      // Assertions - The controller should return 404 since account is not found
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Account not found or does not belong to the user'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should handle errors when creating a scheduled transaction', async () => {
      const transactionData = {
        accountId: testAccount._id,
        categoryId: testCategory._id,
        amount: 500,
        type: 'expense',
        description: 'Test transaction',
        frequency: 'monthly',
        startDate: '2025-01-01'
      };
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: transactionData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Mock ScheduledTransaction.create to throw an error
      jest.spyOn(ScheduledTransaction, 'create').mockImplementation(() => {
        throw new Error('Database error');
      });
      
      // Call the controller function
      await scheduledTransactionController.createScheduledTransaction(req, res, next);
      
      // Assertions
      expect(logger.error).toHaveBeenCalledWith('Error creating scheduled transaction:', expect.any(Error));
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      
      // Restore the original method
      ScheduledTransaction.create.mockRestore();
    });
  });
  
  describe('getScheduledTransactionById', () => {
    it('should return the scheduled transaction with the given ID', async () => {
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: scheduledTransaction._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getScheduledTransactionById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          scheduledTransaction: expect.objectContaining({
            _id: scheduledTransaction._id,
            userId: 'user-id-1',
            amount: 500,
            description: 'Monthly rent'
          })
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
      it('should return 404 if scheduled transaction not found', async () => {
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getScheduledTransactionById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Scheduled transaction not found'
      });
      expect(next).not.toHaveBeenCalled();
    });
      it('should return 403 if user tries to access another user\'s scheduled transaction', async () => {
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: scheduledTransaction._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getScheduledTransactionById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'You do not have permission to access this scheduled transaction'
      });
      expect(next).not.toHaveBeenCalled();
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        params: {
          id: scheduledTransaction._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getScheduledTransactionById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          scheduledTransaction: expect.objectContaining({
            _id: scheduledTransaction._id,
            userId: 'user-id-2',
            amount: 500,
            description: 'Monthly rent'
          })
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should handle errors', async () => {
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: 'invalid-id'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.getScheduledTransactionById(req, res, next);
      
      // Assertions
      expect(logger.error).toHaveBeenCalledWith(`Error fetching scheduled transaction with ID ${req.params.id}:`, expect.any(Error));
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
  
  describe('updateScheduledTransaction', () => {
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: scheduledTransaction._id.toString()
        },
        body: updateData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
        // Call the controller function
      await scheduledTransactionController.updateScheduledTransaction(req, res, next);
      
      // Verify the transaction was updated
      const updatedTransaction = await ScheduledTransaction.findById(scheduledTransaction._id);
      expect(updatedTransaction.amount).toBe(600);
      expect(updatedTransaction.description).toBe('Updated monthly rent');
      expect(updatedTransaction.status).toBe('paused');
      
      // Verify the response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          scheduledTransaction: expect.objectContaining({
            amount: 600,
            description: 'Updated monthly rent',
            status: 'paused'
          })
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
      it('should return 404 if scheduled transaction not found', async () => {
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          amount: 600
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.updateScheduledTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Scheduled transaction not found'
      });
      expect(next).not.toHaveBeenCalled();
    });
      it('should return 403 if user tries to update another user\'s scheduled transaction', async () => {
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: scheduledTransaction._id.toString()
        },
        body: {
          amount: 600
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.updateScheduledTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'You do not have permission to update this scheduled transaction'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should handle errors', async () => {
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: 'invalid-id'
        },
        body: {
          amount: 600
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.updateScheduledTransaction(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
  
  describe('deleteScheduledTransaction', () => {    it('should delete a scheduled transaction', async () => {
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: scheduledTransaction._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.deleteScheduledTransaction(req, res, next);
      
      // Verify the transaction was deleted
      const deletedTransaction = await ScheduledTransaction.findById(scheduledTransaction._id);
      expect(deletedTransaction).toBeNull();
      
      // Verify the response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: null
      });
      expect(next).not.toHaveBeenCalled();
    });
      it('should return 404 if scheduled transaction not found', async () => {
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.deleteScheduledTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Scheduled transaction not found'
      });
      expect(next).not.toHaveBeenCalled();
    });
      it('should return 403 if user tries to delete another user\'s scheduled transaction', async () => {
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: scheduledTransaction._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.deleteScheduledTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'You do not have permission to delete this scheduled transaction'
      });
      expect(next).not.toHaveBeenCalled();
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
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        params: {
          id: scheduledTransaction._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.deleteScheduledTransaction(req, res, next);
      
      // Verify the transaction was deleted
      const deletedTransaction = await ScheduledTransaction.findById(scheduledTransaction._id);
      expect(deletedTransaction).toBeNull();
      
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should handle errors', async () => {
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: 'invalid-id'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await scheduledTransactionController.deleteScheduledTransaction(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
