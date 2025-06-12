const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const Budget = require('../../../src/models/Budget');
const Category = require('../../../src/models/Category');
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

// Mock notification controller
jest.mock('../../../src/controllers/notificationController', () => {
  const originalModule = jest.requireActual('../../../src/controllers/notificationController');
  return {
    ...originalModule,
    createBudgetNotifications: jest.fn().mockResolvedValue(true),
    getUserNotifications: jest.fn().mockResolvedValue({
      status: 'success',
      data: { notifications: [] }
    })
  };
});

// Import routes after mocking dependencies
const routes = require('../../../src/routes');
app.use('/api', routes);

describe('Budget API - Integration Tests', () => {
  let mongoServer;
  
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
    await Budget.deleteMany({});
    await Category.deleteMany({});
    await Transaction.deleteMany({});
  });
  
  describe('GET /api/budgets', () => {
    it('should return all budgets for the authenticated user', async () => {
      // Create test budgets
      const userBudgets = [
        {
          userId: 'test-user-id',
          name: 'Budget 1',
          type: 'monthly',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          totalLimit: 1000,
          categories: []
        },
        {
          userId: 'test-user-id',
          name: 'Budget 2',
          type: 'weekly',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-07'),
          totalLimit: 300,
          categories: []
        }
      ];
      
      const otherUserBudget = {
        userId: 'other-user-id',
        name: 'Other User Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1500,
        categories: []
      };
      
      await Budget.insertMany([...userBudgets, otherUserBudget]);
      
      // Make API request
      const response = await request(app)
        .get('/api/budgets')
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
      expect(response.body.data.budgets).toHaveLength(2);
      
      // Verify only the user's budgets are returned
      const budgetNames = response.body.data.budgets.map(b => b.name);
      expect(budgetNames).toContain('Budget 1');
      expect(budgetNames).toContain('Budget 2');
      expect(budgetNames).not.toContain('Other User Budget');
    });
    
    it('should filter budgets based on query parameters', async () => {
      // Create test budgets
      const budgets = [
        {
          userId: 'test-user-id',
          name: 'Monthly Budget',
          type: 'monthly',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          totalLimit: 1000,
          isActive: true,
          categories: []
        },
        {
          userId: 'test-user-id',
          name: 'Weekly Budget',
          type: 'weekly',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-07'),
          totalLimit: 300,
          isActive: false,
          categories: []
        }
      ];
      
      await Budget.insertMany(budgets);
      
      // Make API request with filters
      const response = await request(app)
        .get('/api/budgets?isActive=true&type=monthly')
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.budgets).toHaveLength(1);
      expect(response.body.data.budgets[0].name).toBe('Monthly Budget');
      expect(response.body.data.budgets[0].type).toBe('monthly');
      expect(response.body.data.budgets[0].isActive).toBe(true);
    });
    
    it('should allow admin to get budgets for other users', async () => {
      // Create test budget for another user
      const userBudget = {
        userId: 'target-user-id',
        name: 'Target User Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      };
      
      await Budget.create(userBudget);
      
      // Make API request as admin
      const response = await request(app)
        .get('/api/budgets?userId=target-user-id')
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.budgets).toHaveLength(1);
      expect(response.body.data.budgets[0].userId).toBe('target-user-id');
      expect(response.body.data.budgets[0].name).toBe('Target User Budget');
    });
  });
  
  describe('GET /api/budgets/:id', () => {
    it('should get a budget by ID', async () => {
      // Create test budget
      const budget = await Budget.create({
        userId: 'test-user-id',
        name: 'Test Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/budgets/${budget._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.budget._id).toBe(budget._id.toString());
      expect(response.body.data.budget.name).toBe('Test Budget');
      expect(response.body.data.budget.type).toBe('monthly');
    });
    
    it('should return 404 if budget not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Make API request
      const response = await request(app)
        .get(`/api/budgets/${nonExistentId}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBeDefined();
    });
    
    it('should not allow users to access other users\' budgets', async () => {
      // Create test budget for another user
      const budget = await Budget.create({
        userId: 'other-user-id',
        name: 'Other User Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/budgets/${budget._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBeDefined();
    });
  });
  
  describe('POST /api/budgets', () => {
    it('should create a new budget without categories', async () => {
      const budgetData = {
        name: 'Simple Budget',
        description: 'A simple budget without categories',
        type: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        totalLimit: 1000
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/budgets')
        .set('x-user-id', 'test-user-id')
        .send(budgetData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.budget.userId).toBe('test-user-id');
      expect(response.body.data.budget.name).toBe('Simple Budget');
      expect(response.body.data.budget.description).toBe('A simple budget without categories');
      expect(response.body.data.budget.totalLimit).toBe(1000);
      expect(response.body.data.budget.categories).toHaveLength(0);
      
      // Check database
      const dbBudget = await Budget.findById(response.body.data.budget._id);
      expect(dbBudget).toBeDefined();
      expect(dbBudget.name).toBe('Simple Budget');
    });
    
    it('should create a new budget with a single category', async () => {
      // Create test category
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
        icon: 'food'
      });
      
      const budgetData = {
        name: 'Food Budget',
        description: 'Budget for food expenses',
        type: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        categoryId: category._id.toString(),
        amount: 500
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/budgets')
        .set('x-user-id', 'test-user-id')
        .send(budgetData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.budget.name).toBe('Food Budget');
      expect(response.body.data.budget.categories).toHaveLength(1);
      expect(response.body.data.budget.categories[0].categoryId).toBe(category._id.toString());
      expect(response.body.data.budget.categories[0].categoryName).toBe('Food');
      expect(response.body.data.budget.categories[0].limit).toBe(500);
      expect(response.body.data.budget.totalLimit).toBe(500);
      
      // Check database
      const dbBudget = await Budget.findById(response.body.data.budget._id);
      expect(dbBudget).toBeDefined();
      expect(dbBudget.categories[0].categoryName).toBe('Food');
    });
    
    it('should create a new budget with multiple categories', async () => {
      // Create test categories
      const food = await Category.create({
        userId: 'test-user-id',
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
        icon: 'food'
      });
      
      const entertainment = await Category.create({
        userId: 'test-user-id',
        name: 'Entertainment',
        type: 'expense',
        color: '#00FF00',
        icon: 'movie'
      });
      
      const budgetData = {
        name: 'Monthly Expenses',
        description: 'Budget for monthly expenses',
        type: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        categories: [
          {
            categoryId: food._id.toString(),
            limit: 500
          },
          {
            categoryId: entertainment._id.toString(),
            limit: 300
          }
        ]
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/budgets')
        .set('x-user-id', 'test-user-id')
        .send(budgetData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.budget.name).toBe('Monthly Expenses');
      expect(response.body.data.budget.categories).toHaveLength(2);
      expect(response.body.data.budget.totalLimit).toBe(800);
      
      // Check both categories were added
      const categoryNames = response.body.data.budget.categories.map(cat => cat.categoryName);
      expect(categoryNames).toContain('Food');
      expect(categoryNames).toContain('Entertainment');
      
      // Check database
      const dbBudget = await Budget.findById(response.body.data.budget._id);
      expect(dbBudget).toBeDefined();
      expect(dbBudget.categories).toHaveLength(2);
    });
  });
  
  describe('PUT /api/budgets/:id', () => {
    it('should update a budget', async () => {
      // Create test budget
      const budget = await Budget.create({
        userId: 'test-user-id',
        name: 'Original Budget',
        description: 'Original description',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      const updateData = {
        name: 'Updated Budget',
        description: 'Updated description',
        totalLimit: 1500
      };
      
      // Make API request
      const response = await request(app)
        .put(`/api/budgets/${budget._id}`)
        .set('x-user-id', 'test-user-id')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.budget.name).toBe('Updated Budget');
      expect(response.body.data.budget.description).toBe('Updated description');
      expect(response.body.data.budget.totalLimit).toBe(1500);
      
      // Check database
      const dbBudget = await Budget.findById(budget._id);
      expect(dbBudget.name).toBe('Updated Budget');
      expect(dbBudget.description).toBe('Updated description');
      expect(dbBudget.totalLimit).toBe(1500);
    });
    
    it('should update budget categories', async () => {
      // Create test categories
      const food = await Category.create({
        userId: 'test-user-id',
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
        icon: 'food'
      });
      
      const entertainment = await Category.create({
        userId: 'test-user-id',
        name: 'Entertainment',
        type: 'expense',
        color: '#00FF00',
        icon: 'movie'
      });
      
      // Create a budget with one category
      const budget = await Budget.create({
        userId: 'test-user-id',
        name: 'Original Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        categories: [{
          categoryId: food._id,
          categoryName: 'Food',
          limit: 400,
          spent: 0
        }],
        totalLimit: 400,
        totalSpent: 0
      });
      
      const updateData = {
        categories: [
          {
            categoryId: food._id.toString(),
            limit: 500 // Increase limit
          },
          {
            categoryId: entertainment._id.toString(),
            limit: 300 // Add new category
          }
        ]
      };
      
      // Make API request
      const response = await request(app)
        .put(`/api/budgets/${budget._id}`)
        .set('x-user-id', 'test-user-id')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.budget.categories).toHaveLength(2);
      expect(response.body.data.budget.totalLimit).toBe(800);
      
      // Check database
      const dbBudget = await Budget.findById(budget._id);
      expect(dbBudget.categories).toHaveLength(2);
      expect(dbBudget.categories[0].limit).toBe(500);
      expect(dbBudget.categories[1].categoryName).toBe('Entertainment');
    });
    
    it('should not allow users to update other users\' budgets', async () => {
      // Create test budget for another user
      const budget = await Budget.create({
        userId: 'other-user-id',
        name: 'Other User Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      const updateData = {
        name: 'Updated Budget',
        totalLimit: 1500
      };
      
      // Make API request
      const response = await request(app)
        .put(`/api/budgets/${budget._id}`)
        .set('x-user-id', 'test-user-id')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBeDefined();
      
      // Check database - should be unchanged
      const dbBudget = await Budget.findById(budget._id);
      expect(dbBudget.name).toBe('Other User Budget');
    });
  });
  
  describe('DELETE /api/budgets/:id', () => {
    it('should delete a budget', async () => {
      // Create test budget
      const budget = await Budget.create({
        userId: 'test-user-id',
        name: 'Budget to Delete',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      // Make API request
      await request(app)
        .delete(`/api/budgets/${budget._id}`)
        .set('x-user-id', 'test-user-id')
        .expect(204);
      
      // Check database
      const dbBudget = await Budget.findById(budget._id);
      expect(dbBudget).toBeNull();
    });
    
    it('should not allow users to delete other users\' budgets', async () => {
      // Create test budget for another user
      const budget = await Budget.create({
        userId: 'other-user-id',
        name: 'Other User Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      // Make API request
      const response = await request(app)
        .delete(`/api/budgets/${budget._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBeDefined();
      
      // Check database - should be unchanged
      const dbBudget = await Budget.findById(budget._id);
      expect(dbBudget).not.toBeNull();
    });
  });
  
  describe('GET /api/budgets/:id/progress', () => {
    it('should calculate budget progress correctly', async () => {
      // Create test category
      const food = await Category.create({
        userId: 'test-user-id',
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
        icon: 'food'
      });
      
      // Create a budget
      const budget = await Budget.create({
        userId: 'test-user-id',
        name: 'Test Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        categories: [{
          categoryId: food._id,
          categoryName: 'Food',
          limit: 500,
          spent: 0
        }],
        totalLimit: 500,
        totalSpent: 0,
        notificationThreshold: 80
      });
        // Create some transactions
      await Transaction.create({
        userId: 'test-user-id',
        description: 'Grocery shopping',
        amount: 150,
        type: 'expense',
        date: new Date('2025-01-10'),
        categoryId: food._id,
        accountId: new mongoose.Types.ObjectId() // Add required accountId
      });
      
      await Transaction.create({
        userId: 'test-user-id',
        description: 'Restaurant',
        amount: 100,
        type: 'expense',
        date: new Date('2025-01-15'),
        categoryId: food._id,
        accountId: new mongoose.Types.ObjectId() // Add required accountId
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/budgets/${budget._id}/progress`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.totalProgress.spent).toBe(250);
      expect(response.body.data.totalProgress.limit).toBe(500);
      expect(response.body.data.totalProgress.percentage).toBe(50);
      expect(response.body.data.categoryProgress[0].spent).toBe(250);
      expect(response.body.data.categoryProgress[0].percentage).toBe(50);
      expect(response.body.data.alerts).toHaveLength(0);
    });
    
    it('should generate alerts when budget threshold is reached', async () => {
      // Create test category
      const food = await Category.create({
        userId: 'test-user-id',
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
        icon: 'food'
      });
      
      // Create a budget
      const budget = await Budget.create({
        userId: 'test-user-id',
        name: 'Test Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        categories: [{
          categoryId: food._id,
          categoryName: 'Food',
          limit: 500,
          spent: 0
        }],
        totalLimit: 500,
        totalSpent: 0,
        notificationThreshold: 80
      });
        // Create a transaction that exceeds the threshold
      await Transaction.create({
        userId: 'test-user-id',
        description: 'Expensive meal',
        amount: 450, // 90% of budget
        type: 'expense',
        date: new Date('2025-01-10'),
        categoryId: food._id,
        accountId: new mongoose.Types.ObjectId() // Add required accountId
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/budgets/${budget._id}/progress`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.totalProgress.percentage).toBe(90);
      expect(response.body.data.categoryProgress[0].percentage).toBe(90);
      expect(response.body.data.alerts.length).toBeGreaterThan(0);
    });
  });
});
