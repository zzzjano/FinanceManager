const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const budgetController = require('../../../src/controllers/budgetController');
const Budget = require('../../../src/models/Budget');
const Category = require('../../../src/models/Category');
const Transaction = require('../../../src/models/Transaction');
const { logger } = require('../../../src/utils/logger');

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

// Mock the notification controller
jest.mock('../../../src/controllers/notificationController', () => ({
  createBudgetNotifications: jest.fn().mockResolvedValue(true)
}));

describe('Budget Controller - Unit Tests', () => {
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
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getAllBudgets', () => {
    it('should return all budgets for a user', async () => {
      // Create test budgets
      const budgets = [
        {
          userId: 'user-id-1',
          name: 'Monthly Budget',
          type: 'monthly',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          totalLimit: 1000,
          categories: []
        },
        {
          userId: 'user-id-1',
          name: 'Weekly Budget',
          type: 'weekly',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-07'),
          totalLimit: 300,
          categories: []
        },
        {
          userId: 'user-id-2',
          name: 'Other User Budget',
          type: 'monthly',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          totalLimit: 1500,
          categories: []
        },
      ];
      
      await Budget.insertMany(budgets);
      
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
      
      await budgetController.getAllBudgets(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      expect(responseData.results).toBe(2);
      expect(responseData.data.budgets).toHaveLength(2);
      expect(responseData.data.budgets[0].userId).toBe('user-id-1');
      expect(responseData.data.budgets[1].userId).toBe('user-id-1');
    });
    
    it('should apply filters when provided', async () => {
      // Create test budgets
      const budgets = [
        {
          userId: 'user-id-1',
          name: 'Monthly Budget',
          type: 'monthly',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          totalLimit: 1000,
          isActive: true,
          categories: []
        },
        {
          userId: 'user-id-1',
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
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          isActive: 'true',
          type: 'monthly'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.getAllBudgets(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      expect(responseData.results).toBe(1);
      expect(responseData.data.budgets).toHaveLength(1);
      expect(responseData.data.budgets[0].name).toBe('Monthly Budget');
      expect(responseData.data.budgets[0].type).toBe('monthly');
      expect(responseData.data.budgets[0].isActive).toBe(true);
    });
    
    it('should allow admin to get budgets for other users', async () => {
      // Create test budgets
      const budgets = [
        {
          userId: 'user-id-3',
          name: 'User 3 Budget',
          type: 'monthly',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          totalLimit: 1000,
          categories: []
        }
      ];
      
      await Budget.insertMany(budgets);
      
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        query: {
          userId: 'user-id-3'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.getAllBudgets(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      expect(responseData.results).toBe(1);
      expect(responseData.data.budgets).toHaveLength(1);
      expect(responseData.data.budgets[0].userId).toBe('user-id-3');
    });
  });
  
  describe('getBudgetById', () => {
    it('should return a budget by ID', async () => {
      const budget = new Budget({
        userId: 'user-id-1',
        name: 'Test Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      await budget.save();
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: budget._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.getBudgetById(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      expect(responseData.data.budget._id.toString()).toBe(budget._id.toString());
      expect(responseData.data.budget.name).toBe('Test Budget');
    });
    
    it('should return 404 if budget not found', async () => {
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
      
      await budgetController.getBudgetById(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: expect.any(String)
      });
    });
    
    it('should not allow users to access other users\' budgets', async () => {
      const budget = new Budget({
        userId: 'user-id-2',
        name: 'Other User Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      await budget.save();
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: budget._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.getBudgetById(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: expect.any(String)
      });
    });
  });
  
  describe('createBudget', () => {
    it('should create a new budget without categories', async () => {
      const budgetData = {
        name: 'Simple Budget',
        description: 'A simple budget without categories',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000
      };
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: budgetData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.createBudget(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      expect(responseData.data.budget.userId).toBe('user-id-1');
      expect(responseData.data.budget.name).toBe('Simple Budget');
      expect(responseData.data.budget.totalLimit).toBe(1000);
      expect(responseData.data.budget.categories).toHaveLength(0);
    });
    
    it('should create a new budget with single category', async () => {
      // Create a test category first
      const category = new Category({
        userId: 'user-id-1',
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
        icon: 'food'
      });
      
      await category.save();
      
      const budgetData = {
        name: 'Food Budget',
        description: 'Budget for food expenses',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        categoryId: category._id.toString(),
        amount: 500
      };
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: budgetData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.createBudget(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      expect(responseData.data.budget.userId).toBe('user-id-1');
      expect(responseData.data.budget.name).toBe('Food Budget');
      expect(responseData.data.budget.totalLimit).toBe(500);
      expect(responseData.data.budget.categories).toHaveLength(1);
      expect(responseData.data.budget.categories[0].categoryId.toString()).toBe(category._id.toString());
      expect(responseData.data.budget.categories[0].categoryName).toBe('Food');
      expect(responseData.data.budget.categories[0].limit).toBe(500);
    });
    
    it('should create a new budget with multiple categories', async () => {
      // Create test categories first
      const food = new Category({
        userId: 'user-id-1',
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
        icon: 'food'
      });
      
      const entertainment = new Category({
        userId: 'user-id-1',
        name: 'Entertainment',
        type: 'expense',
        color: '#00FF00',
        icon: 'movie'
      });
      
      await food.save();
      await entertainment.save();
      
      const budgetData = {
        name: 'Monthly Expenses',
        description: 'Budget for monthly expenses',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
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
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: budgetData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.createBudget(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      expect(responseData.data.budget.userId).toBe('user-id-1');
      expect(responseData.data.budget.name).toBe('Monthly Expenses');
      expect(responseData.data.budget.totalLimit).toBe(800); // Sum of category limits
      expect(responseData.data.budget.categories).toHaveLength(2);
      expect(responseData.data.budget.categories[0].categoryName).toBe('Food');
      expect(responseData.data.budget.categories[1].categoryName).toBe('Entertainment');
    });
  });
  
  describe('updateBudget', () => {
    it('should update a budget', async () => {
      const budget = new Budget({
        userId: 'user-id-1',
        name: 'Original Budget',
        description: 'Original description',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      await budget.save();
      
      const updateData = {
        name: 'Updated Budget',
        description: 'Updated description',
        totalLimit: 1500
      };
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: budget._id.toString()
        },
        body: updateData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.updateBudget(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      expect(responseData.data.budget.name).toBe('Updated Budget');
      expect(responseData.data.budget.description).toBe('Updated description');
      expect(responseData.data.budget.totalLimit).toBe(1500);
      
      // Verify database was updated
      const updatedBudget = await Budget.findById(budget._id);
      expect(updatedBudget.name).toBe('Updated Budget');
      expect(updatedBudget.totalLimit).toBe(1500);
    });
    
    it('should update budget categories', async () => {
      // Create test categories first
      const food = new Category({
        userId: 'user-id-1',
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
        icon: 'food'
      });
      
      const entertainment = new Category({
        userId: 'user-id-1',
        name: 'Entertainment',
        type: 'expense',
        color: '#00FF00',
        icon: 'movie'
      });
      
      await food.save();
      await entertainment.save();
      
      // Create a budget with one category
      const budget = new Budget({
        userId: 'user-id-1',
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
      
      await budget.save();
      
      // Update to add a new category
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
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: budget._id.toString()
        },
        body: updateData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.updateBudget(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      expect(responseData.data.budget.categories).toHaveLength(2);
      expect(responseData.data.budget.totalLimit).toBe(800); // Sum of updated category limits
      
      // Check the updated categories
      const updatedBudget = await Budget.findById(budget._id);
      expect(updatedBudget.categories[0].limit).toBe(500);
      expect(updatedBudget.categories[1].categoryName).toBe('Entertainment');
      expect(updatedBudget.categories[1].limit).toBe(300);
    });
    
    it('should not allow users to update other users\' budgets', async () => {
      const budget = new Budget({
        userId: 'user-id-2',
        name: 'Other User Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      await budget.save();
      
      const updateData = {
        name: 'Updated Budget',
        totalLimit: 1500
      };
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: budget._id.toString()
        },
        body: updateData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.updateBudget(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: expect.any(String)
      });
      
      // Verify database was not updated
      const unchangedBudget = await Budget.findById(budget._id);
      expect(unchangedBudget.name).toBe('Other User Budget');
    });
  });
  
  describe('deleteBudget', () => {
    it('should delete a budget', async () => {
      const budget = new Budget({
        userId: 'user-id-1',
        name: 'Budget to Delete',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      await budget.save();
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: budget._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.deleteBudget(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(204);
      
      // Verify budget was deleted
      const deletedBudget = await Budget.findById(budget._id);
      expect(deletedBudget).toBeNull();
    });
    
    it('should not allow users to delete other users\' budgets', async () => {
      const budget = new Budget({
        userId: 'user-id-2',
        name: 'Other User Budget',
        type: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        totalLimit: 1000,
        categories: []
      });
      
      await budget.save();
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: budget._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.deleteBudget(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: expect.any(String)
      });
      
      // Verify budget was not deleted
      const unchangedBudget = await Budget.findById(budget._id);
      expect(unchangedBudget).not.toBeNull();
    });
  });
  
  describe('getBudgetProgress', () => {
    it('should calculate budget progress correctly', async () => {
      // Create test category
      const food = new Category({
        userId: 'user-id-1',
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
        icon: 'food'
      });
      
      await food.save();
      
      // Create a budget
      const budget = new Budget({
        userId: 'user-id-1',
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
      
      await budget.save();
        // Create some transactions
      const transaction1 = new Transaction({
        userId: 'user-id-1',
        description: 'Grocery shopping',
        amount: 150,
        type: 'expense',
        date: new Date('2025-01-10'),
        categoryId: food._id,
        accountId: new mongoose.Types.ObjectId() // Add required accountId
      });
      
      const transaction2 = new Transaction({
        userId: 'user-id-1',
        description: 'Restaurant',
        amount: 100,
        type: 'expense',
        date: new Date('2025-01-15'),
        categoryId: food._id,
        accountId: new mongoose.Types.ObjectId() // Add required accountId
      });
      
      await transaction1.save();
      await transaction2.save();
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: budget._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await budgetController.getBudgetProgress(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      
      // Check calculated progress
      expect(responseData.data.totalProgress.spent).toBe(250); // Sum of transactions
      expect(responseData.data.totalProgress.limit).toBe(500);
      expect(responseData.data.totalProgress.remaining).toBe(250);
      expect(responseData.data.totalProgress.percentage).toBe(50); // 250/500 * 100
      
      // Check category progress
      expect(responseData.data.categoryProgress[0].spent).toBe(250);
      expect(responseData.data.categoryProgress[0].percentage).toBe(50);
      
      // No alerts should be generated at 50%
      expect(responseData.data.alerts).toHaveLength(0);
    });
    
    it('should generate alerts when budget threshold is reached', async () => {
      // Create test category
      const food = new Category({
        userId: 'user-id-1',
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
        icon: 'food'
      });
      
      await food.save();
      
      // Create a budget
      const budget = new Budget({
        userId: 'user-id-1',
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
      
      await budget.save();
        // Create transactions that exceed threshold
      const transaction = new Transaction({
        userId: 'user-id-1',
        description: 'Expensive meal',
        amount: 450, // 90% of budget
        type: 'expense',
        accountId: new mongoose.Types.ObjectId(), // Add required accountId
        date: new Date('2025-01-10'),
        categoryId: food._id
      });
      
      await transaction.save();
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: budget._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      // Mock notificationController
      const notificationController = require('../../../src/controllers/notificationController');
      
      await budgetController.getBudgetProgress(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.totalProgress.percentage).toBe(90);
      expect(responseData.data.alerts.length).toBeGreaterThan(0);
      
      // Notification should have been created
      expect(notificationController.createBudgetNotifications).toHaveBeenCalled();
    });
  });
});
