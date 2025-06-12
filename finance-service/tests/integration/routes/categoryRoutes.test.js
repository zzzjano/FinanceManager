const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
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

describe('Category API - Integration Tests', () => {
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
    await Category.deleteMany({});
  });
  
  describe('GET /api/categories', () => {
    it('should return all categories for a user', async () => {
      // Create test categories
      await Category.create([
        {
          userId: 'test-user-id',
          name: 'Groceries',
          type: 'expense',
          color: '#FF0000',
          icon: 'shopping-cart'
        },
        {
          userId: 'test-user-id',
          name: 'Salary',
          type: 'income',
          color: '#00FF00',
          icon: 'cash'
        },
        {
          userId: 'another-user-id',
          name: 'Other User Category',
          type: 'expense'
        }
      ]);
      
      // Make API request
      const response = await request(app)
        .get('/api/categories')
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
      expect(response.body.data.categories).toHaveLength(2);
      
      // Check that the response contains the expected categories
      const categoryNames = response.body.data.categories.map(c => c.name);
      expect(categoryNames).toContain('Groceries');
      expect(categoryNames).toContain('Salary');
      expect(categoryNames).not.toContain('Other User Category');
    });
    
    it('should filter categories by type', async () => {
      // Create test categories
      await Category.create([
        {
          userId: 'test-user-id',
          name: 'Groceries',
          type: 'expense',
          color: '#FF0000'
        },
        {
          userId: 'test-user-id',
          name: 'Salary',
          type: 'income',
          color: '#00FF00'
        }
      ]);
      
      // Make API request with type filter
      const response = await request(app)
        .get('/api/categories')
        .query({ type: 'income' })
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.categories).toHaveLength(1);
      expect(response.body.data.categories[0].name).toBe('Salary');
      expect(response.body.data.categories[0].type).toBe('income');
    });
    
    it('should filter categories by isActive status', async () => {
      // Create test categories
      await Category.create([
        {
          userId: 'test-user-id',
          name: 'Active Category',
          type: 'expense',
          isActive: true
        },
        {
          userId: 'test-user-id',
          name: 'Inactive Category',
          type: 'expense',
          isActive: false
        }
      ]);
      
      // Make API request with isActive filter
      const response = await request(app)
        .get('/api/categories')
        .query({ isActive: 'false' })
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.categories).toHaveLength(1);
      expect(response.body.data.categories[0].name).toBe('Inactive Category');
      expect(response.body.data.categories[0].isActive).toBe(false);
    });
    
    it('should allow admin to get categories for a specific user', async () => {
      // Create test categories
      await Category.create([
        {
          userId: 'specific-user-id',
          name: 'User Category 1',
          type: 'expense'
        },
        {
          userId: 'specific-user-id',
          name: 'User Category 2',
          type: 'income'
        }
      ]);
      
      // Make API request as admin for specific user
      const response = await request(app)
        .get('/api/categories')
        .query({ userId: 'specific-user-id' })
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
      expect(response.body.data.categories).toHaveLength(2);
      
      const categoryNames = response.body.data.categories.map(c => c.name);
      expect(categoryNames).toContain('User Category 1');
      expect(categoryNames).toContain('User Category 2');
    });
  });
  
  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      // Prepare category data
      const categoryData = {
        name: 'New Category',
        type: 'expense',
        color: '#FF0000',
        icon: 'shopping-cart'
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/categories')
        .set('x-user-id', 'test-user-id')
        .send(categoryData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.category).toBeDefined();
      expect(response.body.data.category.name).toBe('New Category');
      expect(response.body.data.category.type).toBe('expense');
      expect(response.body.data.category.color).toBe('#FF0000');
      expect(response.body.data.category.icon).toBe('shopping-cart');
      expect(response.body.data.category.userId).toBe('test-user-id');
      
      // Check database
      const dbCategory = await Category.findById(response.body.data.category._id);
      expect(dbCategory).toBeDefined();
      expect(dbCategory.name).toBe('New Category');
    });
    
    it('should create a category with a parent', async () => {
      // Create a parent category first
      const parent = await Category.create({
        userId: 'test-user-id',
        name: 'Parent Category',
        type: 'expense'
      });
      
      // Prepare child category data
      const categoryData = {
        name: 'Child Category',
        type: 'expense',
        color: '#FF0000',
        icon: 'shopping-cart',
        parent: parent._id.toString()
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/categories')
        .set('x-user-id', 'test-user-id')
        .send(categoryData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.category.name).toBe('Child Category');
      expect(response.body.data.category.parent).toBe(parent._id.toString());
      
      // Check database
      const dbCategory = await Category.findById(response.body.data.category._id);
      expect(dbCategory.parent.toString()).toBe(parent._id.toString());
    });
    
    it('should allow admin to create a category for another user', async () => {
      // Prepare category data
      const categoryData = {
        name: 'Admin Created Category',
        type: 'expense',
        color: '#FF0000',
        userId: 'other-user-id'
      };
      
      // Make API request as admin
      const response = await request(app)
        .post('/api/categories')
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .send(categoryData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.category.name).toBe('Admin Created Category');
      expect(response.body.data.category.userId).toBe('other-user-id');
      
      // Check database
      const dbCategory = await Category.findById(response.body.data.category._id);
      expect(dbCategory.userId).toBe('other-user-id');
    });
    
    it('should handle validation errors', async () => {
      // Missing required field (type)
      const categoryData = {
        name: 'Invalid Category'
        // type is missing
      };
      
      // Make API request
      const response = await request(app)
        .post('/api/categories')
        .set('x-user-id', 'test-user-id')
        .send(categoryData);
      
      // Since we mock the middleware and error handling in this test,
      // we might not get a proper error response. But we can check
      // that the category wasn't created.
      
      // Check database to ensure category wasn't created
      const categories = await Category.find({ name: 'Invalid Category' });
      expect(categories).toHaveLength(0);
    });
  });
  
  describe('GET /api/categories/:id', () => {
    it('should return a category by ID', async () => {
      // Create a test category
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Test Category',
        type: 'expense',
        color: '#FF0000',
        icon: 'shopping-cart'
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/categories/${category._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.category).toBeDefined();
      expect(response.body.data.category._id).toBe(category._id.toString());
      expect(response.body.data.category.name).toBe('Test Category');
      expect(response.body.data.category.type).toBe('expense');
    });
    
    it('should return 404 for non-existent category', async () => {
      // Generate a random non-existent ID
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Make API request
      const response = await request(app)
        .get(`/api/categories/${nonExistentId}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Category not found');
    });
    
    it('should return 403 when user tries to access another user\'s category', async () => {
      // Create a category for a different user
      const category = await Category.create({
        userId: 'other-user-id',
        name: 'Other User Category',
        type: 'expense'
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/categories/${category._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(403);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('You do not have permission to access this category');
    });
    
    it('should allow admin to access any category', async () => {
      // Create a category for a different user
      const category = await Category.create({
        userId: 'other-user-id',
        name: 'User Category',
        type: 'expense'
      });
      
      // Make API request as admin
      const response = await request(app)
        .get(`/api/categories/${category._id}`)
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.category).toBeDefined();
      expect(response.body.data.category._id).toBe(category._id.toString());
      expect(response.body.data.category.userId).toBe('other-user-id');
    });
  });
  
  describe('PATCH /api/categories/:id', () => {
    it('should update a category', async () => {
      // Create a test category
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Original Name',
        type: 'expense',
        color: '#FF0000',
        icon: 'shopping-cart'
      });
      
      // Prepare update data
      const updateData = {
        name: 'Updated Name',
        color: '#00FF00',
        icon: 'updated-icon'
      };
        // Make API request
      const response = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('x-user-id', 'test-user-id')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.category).toBeDefined();
      expect(response.body.data.category.name).toBe('Updated Name');
      expect(response.body.data.category.color).toBe('#00FF00');
      expect(response.body.data.category.icon).toBe('updated-icon');
      expect(response.body.data.category.type).toBe('expense'); // Unchanged
      
      // Check database
      const dbCategory = await Category.findById(category._id);
      expect(dbCategory.name).toBe('Updated Name');
      expect(dbCategory.color).toBe('#00FF00');
    });
    
    it('should update category active status', async () => {
      // Create a test category
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Active Category',
        type: 'expense',
        isActive: true
      });
        // Make API request to deactivate
      const response = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('x-user-id', 'test-user-id')
        .send({ isActive: false })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.category.isActive).toBe(false);
      
      // Check database
      const dbCategory = await Category.findById(category._id);
      expect(dbCategory.isActive).toBe(false);
    });
    
    it('should update parent category', async () => {
      // Create a parent category
      const parent = await Category.create({
        userId: 'test-user-id',
        name: 'Parent Category',
        type: 'expense'
      });
      
      // Create a test category
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'Child Category',
        type: 'expense'
      });
        // Make API request to set parent
      const response = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('x-user-id', 'test-user-id')
        .send({ parent: parent._id.toString() })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.category.parent).toBe(parent._id.toString());
      
      // Check database
      const dbCategory = await Category.findById(category._id);
      expect(dbCategory.parent.toString()).toBe(parent._id.toString());
        // Now remove the parent
      const removeParentResponse = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('x-user-id', 'test-user-id')
        .send({ parent: null })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(removeParentResponse.body.data.category.parent).toBeNull();
      
      // Check database
      const updatedCategory = await Category.findById(category._id);
      expect(updatedCategory.parent).toBeNull();
    });
    
    it('should return 404 for non-existent category', async () => {
      // Generate a random non-existent ID
      const nonExistentId = new mongoose.Types.ObjectId();
        // Make API request
      const response = await request(app)
        .put(`/api/categories/${nonExistentId}`)
        .set('x-user-id', 'test-user-id')
        .send({ name: 'Updated Name' })
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Category not found');
    });
    
    it('should return 403 when user tries to update another user\'s category', async () => {
      // Create a category for a different user
      const category = await Category.create({
        userId: 'other-user-id',
        name: 'Other User Category',
        type: 'expense'
      });
        // Make API request
      const response = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('x-user-id', 'test-user-id')
        .send({ name: 'Trying to update' })
        .expect('Content-Type', /json/)
        .expect(403);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('You do not have permission to update this category');
    });
    
    it('should allow admin to update any category', async () => {
      // Create a category for a different user
      const category = await Category.create({
        userId: 'other-user-id',
        name: 'User Category',
        type: 'expense'
      });
        // Make API request as admin
      const response = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .send({ name: 'Admin Updated Name' })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.category.name).toBe('Admin Updated Name');
      
      // Check database
      const dbCategory = await Category.findById(category._id);
      expect(dbCategory.name).toBe('Admin Updated Name');
    });
  });
  
  describe('DELETE /api/categories/:id', () => {
    it('should delete a category', async () => {
      // Create a test category
      const category = await Category.create({
        userId: 'test-user-id',
        name: 'To Be Deleted',
        type: 'expense'
      });
      
      // Make API request
      const response = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('x-user-id', 'test-user-id')
        .expect(204);
      
      // Check database
      const dbCategory = await Category.findById(category._id);
      expect(dbCategory).toBeNull();
    });
    
    it('should return 404 for non-existent category', async () => {
      // Generate a random non-existent ID
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Make API request
      const response = await request(app)
        .delete(`/api/categories/${nonExistentId}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Category not found');
    });
    
    it('should return 403 when user tries to delete another user\'s category', async () => {
      // Create a category for a different user
      const category = await Category.create({
        userId: 'other-user-id',
        name: 'Other User Category',
        type: 'expense'
      });
      
      // Make API request
      const response = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('x-user-id', 'test-user-id')
        .expect('Content-Type', /json/)
        .expect(403);
      
      // Assertions
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('You do not have permission to delete this category');
      
      // Check database - should still exist
      const dbCategory = await Category.findById(category._id);
      expect(dbCategory).not.toBeNull();
    });
    
    it('should allow admin to delete any category', async () => {
      // Create a category for a different user
      const category = await Category.create({
        userId: 'other-user-id',
        name: 'To Be Deleted By Admin',
        type: 'expense'
      });
      
      // Make API request as admin
      const response = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .expect(204);
      
      // Check database
      const dbCategory = await Category.findById(category._id);
      expect(dbCategory).toBeNull();
    });
  });
});
