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

describe('User Controller - Password Reset Unit Tests', () => {
  let mongoServer;
  
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // Clear the database before each test
    await User.deleteMany({});
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('resetPassword', () => {
    it('should reset password when valid token is provided', async () => {
      // Mock the admin token response
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'mock-admin-token' }
      });
      
      // Mock the Keycloak password reset call
      axios.put.mockResolvedValueOnce({ status: 204 });
      
      // Create a user with a valid reset token
      const resetToken = 'valid-reset-token';
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1); // 1 hour in the future
      
      const user = await User.create({
        keycloakId: 'reset-pw-user',
        email: 'resetpw@example.com',
        firstName: 'Reset',
        lastName: 'Password',
        role: 'user',
        passwordResetToken: resetToken,
        passwordResetExpires: expiryDate
      });
      
      // Create mock request, response, and next function
      const req = {
        body: {
          token: resetToken,
          newPassword: 'NewPassword123!'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.resetPassword(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Your password has been reset successfully. You can now login with your new password.'
      });
      
      // Verify axios was called correctly
      expect(axios.post).toHaveBeenCalledWith(
        `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
      
      expect(axios.put).toHaveBeenCalledWith(
        `${process.env.KEYCLOAK_AUTH_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/reset-pw-user/reset-password`,
        expect.objectContaining({
          type: 'password',
          value: 'NewPassword123!',
          temporary: false
        }),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer mock-admin-token',
            'Content-Type': 'application/json'
          }
        })
      );
      
      // Verify the token was cleared in the database
      const updatedUser = await User.findOne({ keycloakId: 'reset-pw-user' });
      expect(updatedUser.passwordResetToken).toBeUndefined();
      expect(updatedUser.passwordResetExpires).toBeUndefined();
    });
    
    it('should return 400 if token is invalid', async () => {
      // Create mock request, response, and next function
      const req = {
        body: {
          token: 'invalid-token',
          newPassword: 'NewPassword123!'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.resetPassword(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
      
      // Verify axios was not called (Keycloak API should not be called)
      expect(axios.post).not.toHaveBeenCalled();
      expect(axios.put).not.toHaveBeenCalled();
    });
    
    it('should return 400 if token has expired', async () => {
      // Create a user with an expired reset token
      const resetToken = 'expired-token';
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() - 1); // 1 hour in the past
      
      const user = await User.create({
        keycloakId: 'expired-token-user',
        email: 'expired@example.com',
        firstName: 'Expired',
        lastName: 'Token',
        role: 'user',
        passwordResetToken: resetToken,
        passwordResetExpires: expiryDate
      });
      
      // Create mock request, response, and next function
      const req = {
        body: {
          token: resetToken,
          newPassword: 'NewPassword123!'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.resetPassword(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
      
      // Verify axios was not called (Keycloak API should not be called)
      expect(axios.post).not.toHaveBeenCalled();
      expect(axios.put).not.toHaveBeenCalled();
    });
    
    it('should return 400 if token or password is missing', async () => {
      // Create mock request, response, and next function with missing token
      const req = {
        body: {
          newPassword: 'NewPassword123!'
          // Missing token
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await userController.resetPassword(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide a token and new password'
      });
      
      // Reset mocks
      res.status.mockClear();
      res.json.mockClear();
      
      // Test with missing password
      const req2 = {
        body: {
          token: 'some-token'
          // Missing password
        }
      };
      
      // Call the controller function again
      await userController.resetPassword(req2, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide a token and new password'
      });
    });
  });
});
