const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const axios = require('axios');
const app = require('../src/app'); // Assuming your Express app is exported from app.js
const User = require('../src/models/User');

// Mock axios and other external dependencies
jest.mock('axios');
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

describe('User API - Integration Tests', () => {
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
  });
  
  describe('GET /api/users', () => {
    it('should return all users for admin', async () => {
      // Create test users in the database
      await User.create([
        {
          keycloakId: 'user1',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          role: 'user'
        },
        {
          keycloakId: 'user2',
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          role: 'admin'
        }
      ]);
      
      // Make API request with admin role
      const response = await request(app)
        .get('/api/users')
        .set('x-user-role', 'admin')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.users[0].email).toBeDefined();
      expect(response.body.data.users[1].email).toBeDefined();
    });
  });
  
  describe('GET /api/users/:id', () => {
    it('should return a user by ID when requested by themselves', async () => {
      // Create a test user
      const user = await User.create({
        keycloakId: 'self-user',
        email: 'self@example.com',
        firstName: 'Self',
        lastName: 'User',
        role: 'user'
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/users/self-user`)
        .set('x-user-id', 'self-user')
        .set('x-user-role', 'user')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('self@example.com');
      expect(response.body.data.user.firstName).toBe('Self');
    });
    
    it('should return a user by ID when requested by an admin', async () => {
      // Create a test user
      const user = await User.create({
        keycloakId: 'regular-user',
        email: 'regular@example.com',
        firstName: 'Regular',
        lastName: 'User',
        role: 'user'
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/users/regular-user`)
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('regular@example.com');
    });
    
    it('should return 403 if a regular user tries to access another user\'s data', async () => {
      // Create a test user
      const user = await User.create({
        keycloakId: 'other-user',
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        role: 'user'
      });
      
      // Make API request
      const response = await request(app)
        .get(`/api/users/other-user`)
        .set('x-user-id', 'different-user-id')
        .set('x-user-role', 'user')
        .expect('Content-Type', /json/)
        .expect(403);
      
      // Assertions
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Forbidden');
    });
    
    it('should return 404 if user is not found', async () => {
      // Make API request
      const response = await request(app)
        .get(`/api/users/nonexistent`)
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });
  });
  
  describe('POST /api/users/register', () => {
    beforeEach(() => {
      // Mock axios responses for the Keycloak API calls
      
      // Admin token
      axios.post.mockImplementationOnce(() => Promise.resolve({
        data: { access_token: 'fake-admin-token' }
      }));
      
      // Create user
      axios.post.mockImplementationOnce(() => Promise.resolve({
        status: 201
      }));
      
      // Get user ID
      axios.get.mockImplementationOnce(() => Promise.resolve({
        data: [{ id: 'new-keycloak-id' }]
      }));
      
      // Get user role
      axios.get.mockImplementationOnce(() => Promise.resolve({
        data: { id: 'user-role-id', name: 'user' }
      }));
      
      // Assign role
      axios.post.mockImplementationOnce(() => Promise.resolve({
        status: 204
      }));
    });
    
    it('should register a new user successfully', async () => {
      // Make API request
      const response = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          email: 'new@example.com',
          username: 'newuser',
          password: 'Password123!'
        })
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('new@example.com');
      expect(response.body.data.user.firstName).toBe('New');
      expect(response.body.data.user.lastName).toBe('User');
      
      // Verify the user was created in the database
      const createdUser = await User.findOne({ email: 'new@example.com' });
      expect(createdUser).toBeDefined();
      expect(createdUser.keycloakId).toBe('new-keycloak-id');
    });
    
    it('should return 400 if required fields are missing', async () => {
      // Make API request with missing fields
      const response = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Incomplete',
          email: 'incomplete@example.com'
          // Missing lastName, password, and username
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      // Assertions
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Please provide all required fields');
    });
  });
  
  describe('PUT /api/users/:id/preferences', () => {
    it('should update user preferences when requested by the user', async () => {
      // Create a test user with preferences
      const user = await User.create({
        keycloakId: 'pref-user',
        email: 'pref@example.com',
        firstName: 'Preference',
        lastName: 'User',
        role: 'user',
        preferences: {
          theme: 'light',
          language: 'en',
          currency: 'USD'
        }
      });
      
      // Make API request to update preferences
      const response = await request(app)
        .put('/api/users/pref-user/preferences')
        .set('x-user-id', 'pref-user')
        .set('x-user-role', 'user')
        .send({
          theme: 'dark',
          language: 'fr'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.data.preferences.theme).toBe('dark');
      expect(response.body.data.preferences.language).toBe('fr');
      expect(response.body.data.preferences.currency).toBe('USD'); // Unchanged
      
      // Verify the preferences were updated in the database
      const updatedUser = await User.findOne({ keycloakId: 'pref-user' });
      expect(updatedUser.preferences.theme).toBe('dark');
      expect(updatedUser.preferences.language).toBe('fr');
    });
  });
  
  describe('POST /api/users/forgot-password', () => {
    it('should create a password reset token for a valid email', async () => {
      // Create a test user
      await User.create({
        keycloakId: 'reset-user',
        email: 'reset@example.com',
        firstName: 'Reset',
        lastName: 'Test',
        role: 'user'
      });
      
      // Make API request
      const response = await request(app)
        .post('/api/users/forgot-password')
        .send({
          email: 'reset@example.com'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body.status).toBe('success');
      expect(response.body.resetToken).toBeDefined();
      expect(response.body.resetUrl).toBeDefined();
      
      // Verify the reset token was saved in the database
      const updatedUser = await User.findOne({ email: 'reset@example.com' });
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetExpires).toBeDefined();
    });
    
    it('should return the same success response for non-existent emails', async () => {
      // Make API request with non-existent email
      const response = await request(app)
        .post('/api/users/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions - should not reveal that the email doesn't exist
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('If your email exists');
      expect(response.body.resetToken).toBeUndefined();
      expect(response.body.resetUrl).toBeUndefined();
    });
  });
});
