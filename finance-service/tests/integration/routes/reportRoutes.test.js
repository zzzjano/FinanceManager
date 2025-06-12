const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const Transaction = require('../../../src/models/Transaction');
const Category = require('../../../src/models/Category');
const Account = require('../../../src/models/Account');

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

describe('Report API - Integration Tests', () => {
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
  });
  
  describe('GET /api/reports/periodic', () => {
    it('should return periodic reports data', async () => {
      // Create test categories
      const category1 = await Category.create({
        userId: 'test-user-id',
        name: 'Groceries',
        type: 'expense'
      });
      
      const category2 = await Category.create({
        userId: 'test-user-id',
        name: 'Salary',
        type: 'income'
      });
      
      // Create test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions
      await Transaction.create([
        {
          userId: 'test-user-id',
          amount: 500,
          description: 'Grocery shopping',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        },
        {
          userId: 'test-user-id',
          amount: 3000,
          description: 'Monthly salary',
          categoryId: category2._id,
          accountId: account._id,
          date: new Date('2025-05-05'),
          type: 'income'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/reports/periodic')
        .set('x-user-id', 'test-user-id')
        .query({
          period: 'month',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.period).toBe('month');
      expect(response.body.data.report).toBeDefined();
        // There should be at least one report entry
      expect(response.body.data.report.length).toBeGreaterThan(0);
      
      // Calculate the total income, expense and balance across all entries
      let totalIncome = 0;
      let totalExpense = 0;
      let totalBalance = 0;
      
      response.body.data.report.forEach(entry => {
        totalIncome += entry.income.total;
        totalExpense += entry.expense.total;
        totalBalance += entry.balance;
      });
      
      // The total income should be 3000
      expect(totalIncome).toBe(3000);
      
      // The total expense should be 500
      expect(totalExpense).toBe(500);
      
      // Balance should be income - expense = 2500
      expect(totalBalance).toBe(2500);
    });
    
    it('should handle invalid period parameter', async () => {
      // Make API request with invalid period
      const response = await request(app)
        .get('/api/reports/periodic')
        .set('x-user-id', 'test-user-id')
        .query({
          period: 'invalid',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect('Content-Type', /json/);
      
      // Expect an error response
      expect(response.status).not.toBe(200);
      expect(response.body.status).toBe('error');
    });
    
    it('should only return data for the authenticated user', async () => {
      // Create accounts for both users
      const userAccount = await Account.create({
        userId: 'test-user-id',
        name: 'User Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      const otherUserAccount = await Account.create({
        userId: 'other-user-id',
        name: 'Other User Account',
        type: 'CHECKING',
        balance: 2000,
        currency: 'USD'
      });
      
      // Create transactions for multiple users
      await Transaction.create([
        {
          userId: 'test-user-id',
          amount: 500,
          description: 'User transaction',
          accountId: userAccount._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        },
        {
          userId: 'other-user-id',
          amount: 1000,
          description: 'Other user transaction',
          accountId: otherUserAccount._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/reports/periodic')
        .set('x-user-id', 'test-user-id')
        .query({
          period: 'month',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      
      // Only the test-user-id transaction should be included
      const reportItems = response.body.data.report;
      let totalExpense = 0;
      
      reportItems.forEach(item => {
        if (item.expense && item.expense.total) {
          totalExpense += item.expense.total;
        }
      });
      
      expect(totalExpense).toBe(500); // Only the user's expense
    });
    
    it('should allow admin to get reports for other users', async () => {
      // Create account for the other user
      const otherUserAccount = await Account.create({
        userId: 'other-user-id',
        name: 'Other User Account',
        type: 'CHECKING',
        balance: 2000,
        currency: 'USD'
      });
      
      // Create transactions for another user
      await Transaction.create([
        {
          userId: 'other-user-id',
          amount: 1000,
          description: 'Other user transaction',
          accountId: otherUserAccount._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ]);
      
      // Make API request as admin
      const response = await request(app)
        .get('/api/reports/periodic')
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .query({
          period: 'month',
          userId: 'other-user-id',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      
      // The other user's transactions should be included
      const reportItems = response.body.data.report;
      let totalExpense = 0;
      
      reportItems.forEach(item => {
        if (item.expense && item.expense.total) {
          totalExpense += item.expense.total;
        }
      });
      
      expect(totalExpense).toBe(1000); // The other user's expense
    });
  });
  
  describe('GET /api/reports/trends', () => {
    it('should return trends data', async () => {
      // Create test categories
      const category1 = await Category.create({
        userId: 'test-user-id',
        name: 'Groceries',
        type: 'expense'
      });
      
      const category2 = await Category.create({
        userId: 'test-user-id',
        name: 'Utilities',
        type: 'expense'
      });
      
      // Create test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions across multiple months
      await Transaction.create([
        {
          userId: 'test-user-id',
          amount: 500,
          description: 'April Grocery shopping',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-04-10'),
          type: 'expense'
        },
        {
          userId: 'test-user-id',
          amount: 300,
          description: 'April Utilities',
          categoryId: category2._id,
          accountId: account._id,
          date: new Date('2025-04-15'),
          type: 'expense'
        },
        {
          userId: 'test-user-id',
          amount: 600,
          description: 'May Grocery shopping',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/reports/trends')
        .set('x-user-id', 'test-user-id')
        .query({ months: 2 })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.months).toBe(2);
      expect(response.body.data.trends.length).toBe(2); // Should have data for 2 months
      
      // Check April data
      const aprilData = response.body.data.trends.find(t => t.date.month === 4);
      expect(aprilData).toBeDefined();
      const aprilExpense = aprilData.data.find(d => d.type === 'expense');
      expect(aprilExpense.total).toBe(800); // 500 + 300
      
      // Check May data
      const mayData = response.body.data.trends.find(t => t.date.month === 5);
      expect(mayData).toBeDefined();
      const mayExpense = mayData.data.find(d => d.type === 'expense');
      expect(mayExpense.total).toBe(600);
      
      // Check category breakdown
      expect(mayExpense.categories.length).toBe(1);
      expect(mayExpense.categories[0].categoryName).toBe('Groceries');
    });
    
    it('should only return trends data for the authenticated user', async () => {
      // Create accounts for both users
      const userAccount = await Account.create({
        userId: 'test-user-id',
        name: 'User Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      const otherUserAccount = await Account.create({
        userId: 'other-user-id',
        name: 'Other User Account',
        type: 'CHECKING',
        balance: 2000,
        currency: 'USD'
      });
      
      // Create transactions for multiple users
      await Transaction.create([
        {
          userId: 'test-user-id',
          amount: 500,
          description: 'User transaction',
          accountId: userAccount._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        },
        {
          userId: 'other-user-id',
          amount: 1000,
          description: 'Other user transaction',
          accountId: otherUserAccount._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/reports/trends')
        .set('x-user-id', 'test-user-id')
        .query({ months: 1 })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      
      // Should have data for May
      const mayData = response.body.data.trends.find(t => t.date.month === 5);
      expect(mayData).toBeDefined();
      
      // Only the test-user-id transaction should be included
      const mayExpense = mayData.data.find(d => d.type === 'expense');
      expect(mayExpense.total).toBe(500); // Only the user's expense
    });
  });
  
  describe('GET /api/reports/export', () => {
    it('should export data in JSON format', async () => {
      // Create test account and category
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 5000,
        currency: 'PLN'
      });
      
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Groceries',
        type: 'expense'
      });
      
      // Create test transactions
      await Transaction.create([
        {
          userId: 'test-user-id',
          amount: 500,
          description: 'Grocery shopping',
          categoryId: category._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/reports/export')
        .set('x-user-id', 'test-user-id')
        .query({
          format: 'json',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.transactions.length).toBe(1);      expect(response.body.data.transactions[0].amount).toBe(500);
      expect(response.body.data.transactions[0].description).toBe('Grocery shopping');
      expect(response.body.data.transactions[0].categoryName).toBe('Groceries');
      expect(response.body.data.transactions[0].accountName).toBe('Checking Account');
    });
    
    it('should export data in CSV format', async () => {
      // Create test account and category
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 5000,
        currency: 'PLN'
      });
      
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Groceries',
        type: 'expense'
      });
      
      // Create test transactions
      await Transaction.create([
        {
          userId: 'test-user-id',
          amount: 500,
          description: 'Grocery shopping',
          categoryId: category._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/reports/export')
        .set('x-user-id', 'test-user-id')
        .query({
          format: 'csv',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect(200);
      
      // Assertions
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment; filename=');
        // CSV content should include headers and data
      expect(response.text).toContain('date,description,amount,type,categoryName,accountName');
      expect(response.text).toContain('Grocery shopping');
    });
    
    it('should filter transactions by type', async () => {
      // Create test categories
      const expenseCategory = await Category.create({
        userId: 'test-user-id',
        name: 'Groceries',
        type: 'expense'
      });
      
      const incomeCategory = await Category.create({
        userId: 'test-user-id',
        name: 'Salary',
        type: 'income'
      });
      
      // Create test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 5000,
        currency: 'PLN'
      });
      
      // Create test transactions
      await Transaction.create([
        {
          userId: 'test-user-id',
          amount: 500,
          description: 'Grocery shopping',
          categoryId: expenseCategory._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        },
        {
          userId: 'test-user-id',
          amount: 3000,
          description: 'Monthly salary',
          categoryId: incomeCategory._id,
          accountId: account._id,
          date: new Date('2025-05-05'),
          type: 'income'
        }
      ]);
      
      // Make API request for expenses only
      const response = await request(app)
        .get('/api/reports/export')
        .set('x-user-id', 'test-user-id')
        .query({
          format: 'json',
          type: 'expense',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.transactions.length).toBe(1);
      expect(response.body.data.transactions[0].description).toBe('Grocery shopping');
      expect(response.body.data.transactions[0].type).toBe('expense');
    });
    
    it('should handle invalid format parameter', async () => {
      // Make API request with invalid format
      const response = await request(app)
        .get('/api/reports/export')
        .set('x-user-id', 'test-user-id')
        .query({
          format: 'invalid',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect('Content-Type', /json/);
      
      // Expect an error response
      expect(response.status).not.toBe(200);
      expect(response.body.status).toBe('error');
    });
  });
  
  describe('GET /api/reports/category-distribution', () => {
    it('should return category distribution data', async () => {
      // Create test categories
      const category1 = await Category.create({
        userId: 'test-user-id',
        name: 'Groceries',
        type: 'expense'
      });
      
      const category2 = await Category.create({
        userId: 'test-user-id',
        name: 'Utilities',
        type: 'expense'
      });
      
      // Create test account
      const account = await Account.create({
        userId: 'test-user-id',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'USD'
      });
      
      // Create test transactions
      await Transaction.create([
        {
          userId: 'test-user-id',
          amount: 500,
          description: 'Grocery shopping',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-05-10'),
          type: 'expense'
        },
        {
          userId: 'test-user-id',
          amount: 300,
          description: 'Utility bill',
          categoryId: category2._id,
          accountId: account._id,
          date: new Date('2025-05-15'),
          type: 'expense'
        },
        {
          userId: 'test-user-id',
          amount: 200,
          description: 'More groceries',
          categoryId: category1._id,
          accountId: account._id,
          date: new Date('2025-05-20'),
          type: 'expense'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/reports/category-distribution')
        .set('x-user-id', 'test-user-id')
        .query({
          startDate: '2025-05-01',
          endDate: '2025-05-31',
          type: 'expense'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions      expect(response.body.status).toBe('success');
      expect(response.body.data.distribution).toBeDefined();
      expect(response.body.data.distribution.length).toBe(2);
      expect(response.body.data.grandTotal).toBe(1000); // 500 + 300 + 200
      
      // Check categories
      const groceries = response.body.data.distribution.find(c => c.name === 'Groceries');
      const utilities = response.body.data.distribution.find(c => c.name === 'Utilities');
      
      expect(groceries).toBeDefined();
      expect(groceries.total).toBe(700); // 500 + 200
      expect(groceries.percentage).toBe('70.00'); // (700/1000) * 100, returned as formatted string
      
      expect(utilities).toBeDefined();
      expect(utilities.total).toBe(300);      expect(utilities.percentage).toBe('30.00'); // (300/1000) * 100, returned as formatted string
    });
    
    it('should handle invalid transaction type parameter', async () => {
      // Make API request with invalid type
      const response = await request(app)
        .get('/api/reports/category-distribution')
        .set('x-user-id', 'test-user-id')
        .query({
          type: 'invalid',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect('Content-Type', /json/);      // Expect an error response
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail'); // Controller returns 'fail' status on validation failures
    });
  });
});
