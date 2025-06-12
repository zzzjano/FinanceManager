const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const categoryController = require('../../../src/controllers/categoryController');
const Category = require('../../../src/models/Category');
const { logger } = require('../../../src/utils/logger');

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

describe('Category Controller - Unit Tests', () => {
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
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('getAllCategories', () => {
    it('should return all categories for a user', async () => {
      // Create test categories
      const categories = [
        {
          userId: 'user-id-1',
          name: 'Groceries',
          type: 'expense',
          color: '#FF0000',
          icon: 'shopping-cart'
        },
        {
          userId: 'user-id-1',
          name: 'Salary',
          type: 'income',
          color: '#00FF00',
          icon: 'cash'
        }
      ];
      
      await Category.create(categories);
      
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
      await categoryController.getAllCategories(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 2,
        data: {
          categories: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-id-1',
              name: 'Groceries',
              type: 'expense'
            }),
            expect.objectContaining({
              userId: 'user-id-1',
              name: 'Salary',
              type: 'income'
            })
          ])
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should filter categories by type', async () => {
      // Create test categories
      const categories = [
        {
          userId: 'user-id-1',
          name: 'Groceries',
          type: 'expense',
          color: '#FF0000',
          icon: 'shopping-cart'
        },
        {
          userId: 'user-id-1',
          name: 'Salary',
          type: 'income',
          color: '#00FF00',
          icon: 'cash'
        }
      ];
      
      await Category.create(categories);
      
      // Create mock request and response objects
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
      await categoryController.getAllCategories(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        data: {
          categories: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-id-1',
              name: 'Groceries',
              type: 'expense'
            })
          ])
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should filter categories by isActive status', async () => {
      // Create test categories
      const categories = [
        {
          userId: 'user-id-1',
          name: 'Groceries',
          type: 'expense',
          color: '#FF0000',
          icon: 'shopping-cart',
          isActive: true
        },
        {
          userId: 'user-id-1',
          name: 'Old Category',
          type: 'expense',
          color: '#0000FF',
          icon: 'archive',
          isActive: false
        }
      ];
      
      await Category.create(categories);
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        query: {
          isActive: 'false'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.getAllCategories(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        data: {
          categories: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-id-1',
              name: 'Old Category',
              isActive: false
            })
          ])
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return only the user\'s own categories', async () => {
      // Create categories for different users
      const categories = [
        {
          userId: 'user-id-1',
          name: 'Groceries',
          type: 'expense'
        },
        {
          userId: 'user-id-2',
          name: 'Other User Category',
          type: 'expense'
        }
      ];
      
      await Category.create(categories);
      
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
      await categoryController.getAllCategories(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          results: 1,
          data: {
            categories: expect.arrayContaining([
              expect.objectContaining({
                userId: 'user-id-1',
                name: 'Groceries'
              })
            ])
          }
        })
      );
      
      // Make sure other user's categories are not included
      const responseData = res.json.mock.calls[0][0].data.categories;
      const otherUserCategory = responseData.find(c => c.name === 'Other User Category');
      expect(otherUserCategory).toBeUndefined();
    });
    
    it('should allow admin to get all categories for a specific user', async () => {
      // Create categories for different users
      const categories = [
        {
          userId: 'user-id-2',
          name: 'Groceries',
          type: 'expense'
        },
        {
          userId: 'user-id-2',
          name: 'Salary',
          type: 'income'
        }
      ];
      
      await Category.create(categories);
      
      // Create mock request and response objects with admin role
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
      await categoryController.getAllCategories(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          results: 2,
          data: {
            categories: expect.arrayContaining([
              expect.objectContaining({
                userId: 'user-id-2',
                name: 'Groceries'
              }),
              expect.objectContaining({
                userId: 'user-id-2',
                name: 'Salary'
              })
            ])
          }
        })
      );
    });
    
    it('should handle database errors', async () => {
      // Mock Category.find to throw an error
      jest.spyOn(Category, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
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
      await categoryController.getAllCategories(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('createCategory', () => {
    it('should create a new category', async () => {
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: {
          name: 'New Category',
          type: 'expense',
          color: '#FF0000',
          icon: 'shopping-cart'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.createCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: {
            category: expect.objectContaining({
              userId: 'user-id-1',
              name: 'New Category',
              type: 'expense',
              color: '#FF0000',
              icon: 'shopping-cart'
            })
          }
        })
      );
      
      // Verify category was created in database
      const categories = await Category.find({});
      expect(categories.length).toBe(1);
      expect(categories[0].name).toBe('New Category');
    });
    
    it('should create a category with a parent', async () => {
      // Create a parent category first
      const parentCategory = await Category.create({
        userId: 'user-id-1',
        name: 'Parent Category',
        type: 'expense'
      });
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: {
          name: 'Child Category',
          type: 'expense',
          color: '#FF0000',
          icon: 'shopping-cart',
          parent: parentCategory._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
        // Call the controller function
      await categoryController.createCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(201);
      
      // Get the actual response data
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.status).toBe('success');
      expect(responseData.data.category.name).toBe('Child Category');
      expect(responseData.data.category.parent.toString()).toBe(parentCategory._id.toString());
    });
    
    it('should allow admin to create a category for another user', async () => {
      // Create mock request and response objects with admin role
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        body: {
          name: 'Admin Created Category',
          type: 'expense',
          color: '#FF0000',
          icon: 'shopping-cart',
          userId: 'user-id-2'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.createCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            category: expect.objectContaining({
              userId: 'user-id-2',
              name: 'Admin Created Category'
            })
          }
        })
      );
    });
    
    it('should handle errors when creating a category', async () => {
      // Mock Category.create to throw an error
      jest.spyOn(Category, 'create').mockImplementationOnce(() => {
        throw new Error('Validation error');
      });
      
      // Create mock request and response objects
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: {
          name: 'New Category',
          type: 'expense'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.createCategory(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('getCategoryById', () => {
    it('should return the category with the given ID', async () => {
      // Create a test category
      const category = await Category.create({
        userId: 'user-id-1',
        name: 'Test Category',
        type: 'expense',
        color: '#FF0000',
        icon: 'shopping-cart'
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
          id: category._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.getCategoryById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          category: expect.objectContaining({
            userId: 'user-id-1',
            name: 'Test Category',
            type: 'expense'
          })
        }
      });
    });
    
    it('should return 404 if category not found', async () => {
      // Create mock request and response objects with non-existent ID
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
      await categoryController.getCategoryById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Category not found'
      });
    });
    
    it('should return 403 if user tries to access another user\'s category', async () => {
      // Create a test category for a different user
      const category = await Category.create({
        userId: 'user-id-2',
        name: 'Other User Category',
        type: 'expense'
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
          id: category._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.getCategoryById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'You do not have permission to access this category'
      });
    });
    
    it('should allow admin to access any category', async () => {
      // Create a test category for a different user
      const category = await Category.create({
        userId: 'user-id-2',
        name: 'User Category',
        type: 'expense'
      });
      
      // Create mock request and response objects with admin role
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        params: {
          id: category._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.getCategoryById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          category: expect.objectContaining({
            userId: 'user-id-2',
            name: 'User Category'
          })
        }
      });
    });
    
    it('should handle errors', async () => {
      // Mock Category.findById to throw an error
      jest.spyOn(Category, 'findById').mockImplementationOnce(() => {
        throw new Error('Database error');
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
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.getCategoryById(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('updateCategory', () => {
    it('should update a category', async () => {
      // Create a test category
      const category = await Category.create({
        userId: 'user-id-1',
        name: 'Original Name',
        type: 'expense',
        color: '#FF0000',
        icon: 'shopping-cart',
        isActive: true
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
          id: category._id.toString()
        },
        body: {
          name: 'Updated Name',
          color: '#00FF00',
          icon: 'updated-icon'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.updateCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          category: expect.objectContaining({
            userId: 'user-id-1',
            name: 'Updated Name',
            type: 'expense', // Remains unchanged
            color: '#00FF00',
            icon: 'updated-icon',
            isActive: true // Remains unchanged
          })
        }
      });
      
      // Check database was updated
      const updatedCategory = await Category.findById(category._id);
      expect(updatedCategory.name).toBe('Updated Name');
      expect(updatedCategory.color).toBe('#00FF00');
    });
    
    it('should update isActive status', async () => {
      // Create a test category
      const category = await Category.create({
        userId: 'user-id-1',
        name: 'Test Category',
        type: 'expense',
        isActive: true
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
          id: category._id.toString()
        },
        body: {
          isActive: false
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.updateCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            category: expect.objectContaining({
              name: 'Test Category',
              isActive: false
            })
          }
        })
      );
      
      // Check database was updated
      const updatedCategory = await Category.findById(category._id);
      expect(updatedCategory.isActive).toBe(false);
    });
    
    it('should handle adding, updating and removing parent', async () => {
      // Create a parent category
      const parentCategory = await Category.create({
        userId: 'user-id-1',
        name: 'Parent Category',
        type: 'expense'
      });
      
      // Create a test category
      const category = await Category.create({
        userId: 'user-id-1',
        name: 'Test Category',
        type: 'expense'
      });
      
      // Test adding a parent
      const req1 = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: category._id.toString()
        },
        body: {
          parent: parentCategory._id.toString()
        }
      };
      const res1 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await categoryController.updateCategory(req1, res1, jest.fn());
      
      // Check parent was added
      let updatedCategory = await Category.findById(category._id);
      expect(updatedCategory.parent.toString()).toBe(parentCategory._id.toString());
      
      // Test removing the parent
      const req2 = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: category._id.toString()
        },
        body: {
          parent: null
        }
      };
      const res2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await categoryController.updateCategory(req2, res2, jest.fn());
        // Check parent was removed
      updatedCategory = await Category.findById(category._id);
      expect(updatedCategory.parent).toBeNull();
    });
    
    it('should return 404 if category not found', async () => {
      // Create mock request and response objects with non-existent ID
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
          name: 'Updated Name'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.updateCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Category not found'
      });
    });
    
    it('should return 403 if user tries to update another user\'s category', async () => {
      // Create a test category for a different user
      const category = await Category.create({
        userId: 'user-id-2',
        name: 'Other User Category',
        type: 'expense'
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
          id: category._id.toString()
        },
        body: {
          name: 'Trying to update'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.updateCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'You do not have permission to update this category'
      });
    });
    
    it('should handle errors', async () => {
      // Create a test category
      const category = await Category.create({
        userId: 'user-id-1',
        name: 'Test Category',
        type: 'expense'
      });
      
      // Mock Category.findByIdAndUpdate to throw an error
      jest.spyOn(Category, 'findByIdAndUpdate').mockImplementationOnce(() => {
        throw new Error('Database error');
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
          id: category._id.toString()
        },
        body: {
          name: 'Updated Name'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.updateCategory(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      // Create a test category
      const category = await Category.create({
        userId: 'user-id-1',
        name: 'Test Category',
        type: 'expense'
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
          id: category._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.deleteCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: null
      });
      
      // Check database
      const deletedCategory = await Category.findById(category._id);
      expect(deletedCategory).toBeNull();
    });
    
    it('should return 404 if category not found', async () => {
      // Create mock request and response objects with non-existent ID
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
      await categoryController.deleteCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Category not found'
      });
    });
    
    it('should return 403 if user tries to delete another user\'s category', async () => {
      // Create a test category for a different user
      const category = await Category.create({
        userId: 'user-id-2',
        name: 'Other User Category',
        type: 'expense'
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
          id: category._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.deleteCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'You do not have permission to delete this category'
      });
    });
    
    it('should allow admin to delete any category', async () => {
      // Create a test category for a different user
      const category = await Category.create({
        userId: 'user-id-2',
        name: 'User Category',
        type: 'expense'
      });
      
      // Create mock request and response objects with admin role
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        params: {
          id: category._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.deleteCategory(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(204);
      
      // Check database
      const deletedCategory = await Category.findById(category._id);
      expect(deletedCategory).toBeNull();
    });
    
    it('should handle errors', async () => {
      // Create a test category
      const category = await Category.create({
        userId: 'user-id-1',
        name: 'Test Category',
        type: 'expense'
      });
      
      // Mock Category.findByIdAndDelete to throw an error
      jest.spyOn(Category, 'findByIdAndDelete').mockImplementationOnce(() => {
        throw new Error('Database error');
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
          id: category._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await categoryController.deleteCategory(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
