const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const userController = require('../../../src/controllers/userController');
const User = require('../../../src/models/User');
const axios = require('axios');

// Mock dependencies
jest.mock('axios');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  }
}));

describe('User Controller - Unit Tests', () => {
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
    await User.deleteMany({});
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('getAllUsers', () => {
    it('should return all users', async () => {
      // Create test users in the database
      const testUsers = [
        {
          keycloakId: 'kc-id-1',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          role: 'user'
        },
        {
          keycloakId: 'kc-id-2',
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          role: 'admin'
        }
      ];
      
      await User.create(testUsers);
      
      // Create mock request and response objects
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.getAllUsers(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          results: 2,
          data: expect.objectContaining({
            users: expect.arrayContaining([
              expect.objectContaining({
                email: 'user1@example.com'
              }),
              expect.objectContaining({
                email: 'user2@example.com'
              })
            ])
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should call next with error if database query fails', async () => {
      // Mock User.find to throw an error
      jest.spyOn(User, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      // Create mock request and response objects
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.getAllUsers(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
  
  describe('getUserById', () => {
    it('should return a user if the user is found and requester is admin', async () => {
      // Create a test user
      const testUser = await User.create({
        keycloakId: 'test-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user'
      });
      
      // Create mock request, response, and next function
      const req = {
        params: { id: 'test-id' },
        auth: { role: 'admin', sub: 'admin-id' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.getUserById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user: expect.objectContaining({ email: 'test@example.com' }) }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return a user if the user is requesting their own data', async () => {
      // Create a test user
      const testUser = await User.create({
        keycloakId: 'own-id',
        email: 'own@example.com',
        firstName: 'Own',
        lastName: 'User',
        role: 'user'
      });
      
      // Create mock request, response, and next function
      const req = {
        params: { id: 'own-id' },
        auth: { role: 'user', sub: 'own-id' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.getUserById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user: expect.objectContaining({ email: 'own@example.com' }) }
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 403 if a user tries to access another user\'s data', async () => {
      // Create a test user
      const testUser = await User.create({
        keycloakId: 'other-user-id',
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        role: 'user'
      });
      
      // Create mock request, response, and next function
      const req = {
        params: { id: 'other-user-id' },
        auth: { role: 'user', sub: 'not-the-same-id' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.getUserById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Forbidden - You can only access your own user data'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 404 if user is not found', async () => {
      // Create mock request, response, and next function
      const req = {
        params: { id: 'nonexistent-id' },
        auth: { role: 'admin', sub: 'admin-id' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.getUserById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User not found'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('forgotPassword', () => {
    it('should create a reset token for a valid email', async () => {
      // Create a test user
      await User.create({
        keycloakId: 'kc-id',
        email: 'reset@example.com',
        firstName: 'Reset',
        lastName: 'User',
        role: 'user'
      });
      
      // Create mock request, response, and next function
      const req = {
        body: { email: 'reset@example.com' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.forgotPassword(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: 'If your email exists in our system, you will receive a password reset link shortly.',
          resetToken: expect.any(String),
          resetUrl: expect.any(String)
        })
      );
      
      // Verify the user in the database has been updated with a reset token
      const updatedUser = await User.findOne({ email: 'reset@example.com' });
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetExpires).toBeDefined();
      expect(updatedUser.passwordResetExpires).toBeInstanceOf(Date);
    });
    
    it('should return the same success response for non-existent emails', async () => {
      // Create mock request, response, and next function
      const req = {
        body: { email: 'nonexistent@example.com' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.forgotPassword(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'If your email exists in our system, you will receive a password reset link shortly.'
      });
    });
    
    it('should return 400 if email is not provided', async () => {
      // Create mock request, response, and next function
      const req = {
        body: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.forgotPassword(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide an email address'
      });
    });
  });
});
