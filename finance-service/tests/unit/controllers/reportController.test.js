const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const reportController = require('../../../src/controllers/reportController');
const Transaction = require('../../../src/models/Transaction');
const Category = require('../../../src/models/Category');
const Account = require('../../../src/models/Account');

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  }
}));

describe('Report Controller - Unit Tests', () => {
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
    await Category.deleteMany({});
    await Account.deleteMany({});
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('getPeriodicReport', () => {
    it('should return periodic report for a user for a month', async () => {
      // Create test categories
      const category1 = await Category.create({
        userId: 'user-id-1',
        name: 'Groceries',
        type: 'expense'
      });
      
      const category2 = await Category.create({
        userId: 'user-id-1',
        name: 'Salary',
        type: 'income'
      });
      
      // Create test account
      const account = await Account.create({
        userId: 'user-id-1',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions
      const testTransactions = [
        {
          userId: 'user-id-1',
          amount: 500,
          description: 'Grocery shopping',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        },
        {
          userId: 'user-id-1',
          amount: 200,
          description: 'Grocery shopping 2',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-05-15'),
          type: 'expense'
        },
        {
          userId: 'user-id-1',
          amount: 3000,
          description: 'Monthly salary',
          categoryId: category2._id,
          accountId: account._id,
          date: new Date('2025-05-05'),
          type: 'income'
        }
      ];
      
      await Transaction.create(testTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          period: 'month',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getPeriodicReport(req, res, next);
        // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            period: 'month'
          })
        })
      );
      
      // Get the response data
      const responseData = res.json.mock.calls[0][0].data;
      
      // The report should contain entries for each date
      expect(responseData.report.length).toBeGreaterThan(0);
      
      // Verify there's an income entry
      const incomeEntry = responseData.report.find(entry => entry.income.total > 0);
      expect(incomeEntry).toBeDefined();
      expect(incomeEntry.income.total).toBe(3000);
      
      // Verify the expense entries
      const expenseEntries = responseData.report.filter(entry => entry.expense.total > 0);
      const totalExpense = expenseEntries.reduce((sum, entry) => sum + entry.expense.total, 0);
      expect(totalExpense).toBe(700); // 500 + 200
      
      // The combined balance should be income - expense = 2300
      const totalBalance = responseData.report.reduce((sum, entry) => sum + entry.balance, 0);
      expect(totalBalance).toBe(2300); // 3000 - 700
      expect(next).not.toHaveBeenCalled();
    });

    it('should return forbidden if normal user tries to access another user reports', async () => {
      // Create test account
      const account = await Account.create({
        userId: 'user-id-2',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions for a different user
      const testTransactions = [
        {
          userId: 'user-id-2',
          amount: 500,
          description: 'Grocery shopping',
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ];
      
      await Transaction.create(testTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          period: 'month',
          userId: 'user-id-2'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getPeriodicReport(req, res, next);
      
      // Ensure we don't get the other user's data
      expect(res.status).toHaveBeenCalledWith(200);
      const jsonResponse = res.json.mock.calls[0][0];
      expect(jsonResponse.data.report).toEqual([]);
    });
    
    it('should allow admin to fetch reports for a specific user', async () => {
      // Create test account
      const account = await Account.create({
        userId: 'user-id-2',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions for a specific user
      const testTransactions = [
        {
          userId: 'user-id-2',
          amount: 500,
          description: 'Grocery shopping',
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ];
      
      await Transaction.create(testTransactions);
      
      // Create mock request and response objects with admin role
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        query: {
          period: 'month',
          userId: 'user-id-2',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getPeriodicReport(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            report: expect.arrayContaining([
              expect.objectContaining({
                expense: expect.objectContaining({
                  total: 500
                })
              })
            ])
          })
        })
      );
    });
    
    it('should call next with error if database query fails', async () => {
      // Mock Transaction.aggregate to throw an error
      jest.spyOn(Transaction, 'aggregate').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          period: 'month'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getPeriodicReport(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });    it('should handle invalid period parameter', async () => {
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          period: 'invalid-period'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getPeriodicReport(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: expect.stringContaining('Invalid period')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('getTrends', () => {
    it('should return trends data for a user', async () => {
      // Create test categories
      const category1 = await Category.create({
        userId: 'user-id-1',
        name: 'Groceries',
        type: 'expense'
      });
      
      const category2 = await Category.create({
        userId: 'user-id-1',
        name: 'Utilities',
        type: 'expense'
      });
      
      // Create test account
      const account = await Account.create({
        userId: 'user-id-1',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions
      const testTransactions = [
        {
          userId: 'user-id-1',
          amount: 500,
          description: 'Grocery shopping',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-04-10'),
          type: 'expense'
        },
        {
          userId: 'user-id-1',
          amount: 300,
          description: 'Utility bill',
          categoryId: category2._id,
          accountId: account._id,
          date: new Date('2025-04-15'),
          type: 'expense'
        },
        {
          userId: 'user-id-1',
          amount: 600,
          description: 'Grocery shopping',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ];
      
      await Transaction.create(testTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          months: '2' // Ensure it's a string since query parameters are strings
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getTrends(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            months: 2,
            trends: expect.arrayContaining([
              expect.objectContaining({
                date: expect.objectContaining({
                  month: 4,
                  year: 2025
                }),
                data: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'expense',
                    total: 800
                  })
                ])
              }),
              expect.objectContaining({
                date: expect.objectContaining({
                  month: 5,
                  year: 2025
                }),
                data: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'expense',
                    total: 600
                  })
                ])
              })
            ])
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should allow admin to fetch trends data for a specific user', async () => {
      // Create test categories
      const category = await Category.create({
        userId: 'user-id-2',
        name: 'Groceries',
        type: 'expense'
      });
      
      // Create test account
      const account = await Account.create({
        userId: 'user-id-2',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions for another user
      const testTransactions = [
        {
          userId: 'user-id-2',
          amount: 400,
          description: 'Grocery shopping',
          categoryId: category._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ];
      
      await Transaction.create(testTransactions);
      
      // Create mock request and response objects with admin role
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        query: {
          months: '1', // Ensure it's a string since query parameters are strings
          userId: 'user-id-2'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getTrends(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            months: 1,
            trends: expect.arrayContaining([
              expect.objectContaining({
                date: expect.objectContaining({
                  month: 5,
                  year: 2025
                }),
                data: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'expense',
                    total: 400
                  })
                ])
              })
            ])
          })
        })
      );
    });
    
    it('should call next with error if database query fails', async () => {
      // Mock Transaction.aggregate to throw an error
      jest.spyOn(Transaction, 'aggregate').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          months: '12' // Ensure it's a string since query parameters are strings
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getTrends(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });
  });
  
  describe('exportData', () => {
    it('should export transactions in JSON format', async () => {
      // Create test categories
      const category = await Category.create({
        userId: 'user-id-1',
        name: 'Groceries',
        type: 'expense'
      });
      
      // Create test account
      const account = await Account.create({
        userId: 'user-id-1',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      // Create test transactions
      const testTransactions = [
        {
          userId: 'user-id-1',
          amount: 500,
          description: 'Grocery shopping',
          categoryId: category._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ];
      
      await Transaction.create(testTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          format: 'json',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.exportData(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            transactions: expect.arrayContaining([
              expect.objectContaining({
                amount: 500,
                description: 'Grocery shopping'
              })
            ])
          })
        })
      );
    });
    
    it('should export transactions in CSV format', async () => {
      // Create test categories and transactions
      const category = await Category.create({
        userId: 'user-id-1',
        name: 'Groceries',
        type: 'expense'
      });
      
      const account = await Account.create({
        userId: 'user-id-1',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      const testTransactions = [
        {
          userId: 'user-id-1',
          amount: 500,
          description: 'Grocery shopping',
          categoryId: category._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ];
      
      await Transaction.create(testTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          format: 'csv',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        }
      };
        let csvContent = '';
      const res = {
        setHeader: jest.fn(),
        send: jest.fn().mockImplementation((text) => {
          csvContent = text;
          return res;
        }),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.exportData(req, res, next);
      
      // Assertions
      expect(res.send).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename=')
      );
      expect(csvContent).toContain('date,description,amount,type,categoryName,accountName');
      expect(csvContent).toContain('Grocery shopping');
    });
      it('should handle invalid format parameter', async () => {
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          format: 'invalid-format'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.exportData(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: expect.stringContaining('Invalid format')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('getCategoryDistribution', () => {
    it('should return category distribution data', async () => {
      // Create test categories
      const category1 = await Category.create({
        userId: 'user-id-1',
        name: 'Groceries',
        type: 'expense'
      });
      
      const category2 = await Category.create({
        userId: 'user-id-1',
        name: 'Utilities',
        type: 'expense'
      });
      
      // Create test account
      const account = await Account.create({
        userId: 'user-id-1',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions
      const testTransactions = [
        {
          userId: 'user-id-1',
          amount: 500,
          description: 'Grocery shopping',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        },
        {
          userId: 'user-id-1',
          amount: 300,
          description: 'Utility bill',
          categoryId: category2._id,
          accountId: account._id,
          date: new Date('2025-05-15'),
          type: 'expense'
        },
        {
          userId: 'user-id-1',
          amount: 200,
          description: 'More groceries',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-05-20'),
          type: 'expense'
        }
      ];
      
      await Transaction.create(testTransactions);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          startDate: '2025-05-01',
          endDate: '2025-05-31',
          type: 'expense'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getCategoryDistribution(req, res, next);
        // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            distribution: expect.arrayContaining([
              expect.objectContaining({
                name: 'Groceries',
                total: 700, // 500 + 200
                percentage: '70.00' // (700 / 1000) * 100
              }),
              expect.objectContaining({
                name: 'Utilities',
                total: 300,
                percentage: '30.00' // (300 / 1000) * 100
              })
            ]),
            grandTotal: 1000
          })
        })
      );
    });
    
    it('should call next with error if database query fails', async () => {
      // Mock Transaction.aggregate to throw an error
      jest.spyOn(Transaction, 'aggregate').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          type: 'expense'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getCategoryDistribution(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should handle invalid transaction type parameter', async () => {
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          type: 'invalid-type'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await reportController.getCategoryDistribution(req, res, next);
        // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: expect.stringContaining('Invalid type')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
