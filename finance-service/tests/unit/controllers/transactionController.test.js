const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const transactionController = require('../../../src/controllers/transactionController');
const Transaction = require('../../../src/models/Transaction');
const Account = require('../../../src/models/Account');
const Category = require('../../../src/models/Category');

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  }
}));

describe('Transaction Controller - Unit Tests', () => {
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
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('getAllTransactions', () => {
    it('should return all transactions for a user', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create a test category
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Test Category',
        type: 'income'
      });
      
      // Create test transactions
      const testTransactions = [
        {
          userId: 'test-user-id',
          accountId: account._id,
          categoryId: category._id,
          amount: 100,
          type: 'income',
          date: new Date('2025-01-15'),
          description: 'Test income',
          payee: 'Test payer',
          isRecurring: false,
          tags: ['test', 'income']
        },
        {
          userId: 'test-user-id',
          accountId: account._id,
          categoryId: category._id,
          amount: 50,
          type: 'expense',
          date: new Date('2025-01-20'),
          description: 'Test expense',
          payee: 'Test vendor',
          isRecurring: false,
          tags: ['test', 'expense']
        }
      ];
      
      await Transaction.create(testTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.getAllTransactions(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          results: 2,
          data: expect.objectContaining({
            transactions: expect.arrayContaining([
              expect.objectContaining({
                amount: 100,
                type: 'income'
              }),
              expect.objectContaining({
                amount: 50,
                type: 'expense'
              })
            ])
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should filter transactions by date range', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions with different dates
      const testTransactions = [
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
      ];
      
      await Transaction.create(testTransactions);
      
      // Create mock request and response objects with date filters
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        query: {
          startDate: '2025-02-01',
          endDate: '2025-02-28'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.getAllTransactions(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          results: 1,  // Only the February transaction
          data: expect.objectContaining({
            transactions: expect.arrayContaining([
              expect.objectContaining({
                description: 'February Transaction'
              })
            ])
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should call next with error if database query fails', async () => {
      // Mock Transaction.find to throw an error
      jest.spyOn(Transaction, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.getAllTransactions(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
  
  describe('createTransaction', () => {
    it('should create a new transaction and update account balance', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create a test category
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Test Category',
        type: 'income'
      });
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        body: {
          accountId: account._id,
          categoryId: category._id,
          amount: 100,
          type: 'income',
          description: 'Test income',
          payee: 'Test payer',
          date: '2025-05-10',
          isRecurring: false,
          tags: ['test', 'income']
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.createTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            transaction: expect.objectContaining({
              amount: 100,
              type: 'income',
              description: 'Test income'
            })
          })
        })
      );
      
      // Verify account balance was updated
      const updatedAccount = await Account.findById(account._id);
      expect(updatedAccount.balance).toBe(1100); // Original 1000 + 100 income
    });
    
    it('should create an expense transaction and reduce account balance', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create a test category
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Test Category',
        type: 'expense'
      });
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        body: {
          accountId: account._id,
          categoryId: category._id,
          amount: 200,
          type: 'expense',
          description: 'Test expense',
          payee: 'Test vendor',
          date: '2025-05-10',
          isRecurring: false,
          tags: ['test', 'expense']
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.createTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(201);
      
      // Verify account balance was updated
      const updatedAccount = await Account.findById(account._id);
      expect(updatedAccount.balance).toBe(800); // Original 1000 - 200 expense
    });
    
    it('should return 404 if account does not exist', async () => {
      // Mock request with non-existent account ID
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        body: {
          accountId: new mongoose.Types.ObjectId(), // Random ID that doesn't exist
          amount: 100,
          type: 'income',
          description: 'Test transaction'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.createTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'Account not found or does not belong to the user'
        })
      );
    });
  });
  
  describe('getTransactionById', () => {
    it('should return a transaction by ID', async () => {
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
        amount: 150,
        type: 'income',
        date: new Date(),
        description: 'Test transaction'
      });
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        params: {
          id: transaction._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.getTransactionById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            transaction: expect.objectContaining({
              description: 'Test transaction',
              amount: 150
            })
          })
        })
      );
    });
    
    it('should return 404 if transaction does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        params: {
          id: nonExistentId
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.getTransactionById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'Transaction not found'
        })
      );
    });
    
    it('should return 403 if user tries to access another user\'s transaction', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'other-user-id', // Different user ID
        name: 'Other Account',
        type: 'CHECKING',
        balance: 1000
      });
      
      // Create a test transaction for other user
      const transaction = await Transaction.create({
        userId: 'other-user-id', // Different user ID
        accountId: account._id,
        amount: 150,
        type: 'income',
        date: new Date(),
        description: 'Other user transaction'
      });
      
      // Mock request and response with current user trying to access other user's transaction
      const req = {
        auth: {
          sub: 'test-user-id', // Current user
          realm_access: { roles: ['user'] }
        },
        params: {
          id: transaction._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.getTransactionById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'You do not have permission to access this transaction'
        })
      );
    });
  });
  
  describe('updateTransaction', () => {
    it('should update a transaction and adjust account balance', async () => {
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
      
      // Mock request and response for updating
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        params: {
          id: transaction._id
        },
        body: {
          amount: 150, // Changing amount from 100 to 150
          description: 'Updated description'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.updateTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            transaction: expect.objectContaining({
              amount: 150,
              description: 'Updated description'
            })
          })
        })
      );
      
      // Verify account balance adjustment
      const updatedAccount = await Account.findById(account._id);
      // Original balance: 1000, Original transaction: +100, Updated transaction: +150
      // Net change: +50, New balance should be 1050
      expect(updatedAccount.balance).toBe(1050);
    });
    
    it('should return 404 if transaction does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        params: {
          id: nonExistentId
        },
        body: {
          description: 'Updated description'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.updateTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'Transaction not found'
        })
      );
    });
  });
  
  describe('deleteTransaction', () => {
    it('should delete a transaction and adjust account balance', async () => {
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
      
      // Mock request and response for deleting
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        params: {
          id: transaction._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.deleteTransaction(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(204);
      
      // Verify transaction was deleted
      const deletedTransaction = await Transaction.findById(transaction._id);
      expect(deletedTransaction).toBeNull();
      
      // Verify account balance adjustment
      const updatedAccount = await Account.findById(account._id);
      // Original balance after transaction: 1200, Removing +200 income should result in 1000
      expect(updatedAccount.balance).toBe(1000);
    });
    
    it('should delete an expense transaction and increase account balance', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 800 // Starting with 800 after a 200 expense
      });
      
      // Create a test expense transaction
      const transaction = await Transaction.create({
        userId: 'test-user-id',
        accountId: account._id,
        amount: 200,
        type: 'expense',
        date: new Date(),
        description: 'Expense to delete'
      });
      
      // Mock request and response for deleting
      const req = {
        auth: {
          sub: 'test-user-id',
          realm_access: { roles: ['user'] }
        },
        params: {
          id: transaction._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await transactionController.deleteTransaction(req, res, next);
      
      // Verify account balance adjustment
      const updatedAccount = await Account.findById(account._id);
      // Original balance: 800, Adding back 200 that was deducted as expense should result in 1000
      expect(updatedAccount.balance).toBe(1000);
    });
  });
});
