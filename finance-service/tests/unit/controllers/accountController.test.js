const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const accountController = require('../../../src/controllers/accountController');
const Account = require('../../../src/models/Account');
const Transaction = require('../../../src/models/Transaction');

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  }
}));

describe('Account Controller - Unit Tests', () => {
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
    await Account.deleteMany({});
    await Transaction.deleteMany({});
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('getAllAccounts', () => {
    it('should return all accounts for a user', async () => {
      // Create test accounts
      const testAccounts = [
        {
          userId: 'user-id-1',
          name: 'Checking Account',
          type: 'CHECKING',
          balance: 1000,
          currency: 'PLN'
        },
        {
          userId: 'user-id-1',
          name: 'Savings Account',
          type: 'SAVINGS',
          balance: 5000,
          currency: 'PLN'
        }
      ];
      
      await Account.create(testAccounts);
      
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
      await accountController.getAllAccounts(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          results: 2,
          data: expect.objectContaining({
            accounts: expect.arrayContaining([
              expect.objectContaining({
                name: 'Checking Account',
                balance: 1000
              }),
              expect.objectContaining({
                name: 'Savings Account',
                balance: 5000
              })
            ])
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return only accounts for the authenticated user', async () => {
      // Create accounts for multiple users
      await Account.create([
        {
          userId: 'user-id-1',
          name: 'User 1 Account',
          type: 'CHECKING',
          balance: 1000,
          currency: 'PLN'
        },
        {
          userId: 'user-id-2',
          name: 'User 2 Account',
          type: 'CHECKING',
          balance: 2000,
          currency: 'PLN'
        }
      ]);
      
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
      await accountController.getAllAccounts(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          results: 1,
          data: expect.objectContaining({
            accounts: expect.arrayContaining([
              expect.objectContaining({
                name: 'User 1 Account',
                userId: 'user-id-1'
              })
            ])
          })
        })
      );
    });
    
    it('should allow admin to fetch accounts for a specific user', async () => {
      // Create accounts for multiple users
      await Account.create([
        {
          userId: 'user-id-1',
          name: 'User 1 Account',
          type: 'CHECKING',
          balance: 1000,
          currency: 'PLN'
        },
        {
          userId: 'user-id-2',
          name: 'User 2 Account',
          type: 'CHECKING',
          balance: 2000,
          currency: 'PLN'
        }
      ]);
      
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
      await accountController.getAllAccounts(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          results: 1,
          data: expect.objectContaining({
            accounts: expect.arrayContaining([
              expect.objectContaining({
                name: 'User 2 Account',
                userId: 'user-id-2'
              })
            ])
          })
        })
      );
    });
    
    it('should call next with error if database query fails', async () => {
      // Mock Account.find to throw an error
      jest.spyOn(Account, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
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
      await accountController.getAllAccounts(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
  
  describe('createAccount', () => {
    it('should create a new account', async () => {
      // Mock request and response
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: {
          name: 'New Test Account',
          type: 'CHECKING',
          balance: 1500,
          currency: 'PLN',
          description: 'Test account description'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.createAccount(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            account: expect.objectContaining({
              name: 'New Test Account',
              type: 'CHECKING',
              balance: 1500,
              userId: 'user-id-1'
            })
          })
        })
      );
      
      // Verify the account was created in the database
      const accounts = await Account.find({ userId: 'user-id-1' });
      expect(accounts.length).toBe(1);
      expect(accounts[0].name).toBe('New Test Account');
    });
    
    it('should allow admin to create account for another user', async () => {
      // Mock request and response with admin role
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        body: {
          userId: 'user-id-2',
          name: 'Admin Created Account',
          type: 'SAVINGS',
          balance: 2000,
          currency: 'USD'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.createAccount(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0].data.account.userId).toBe('user-id-2');
      
      // Verify the account was created with the correct userId
      const accounts = await Account.find({ userId: 'user-id-2' });
      expect(accounts.length).toBe(1);
    });
    
    it('should handle validation errors', async () => {
      // Mock Account.create to simulate validation error
      jest.spyOn(Account, 'create').mockImplementationOnce(() => {
        const error = new mongoose.Error.ValidationError();
        error.errors = { type: { message: 'Type is required' } };
        throw error;
      });
      
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        body: {
          name: 'Invalid Account'
          // Missing required fields
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.createAccount(req, res, next);
      
      // Assertions
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('getAccountById', () => {
    it('should return an account by ID', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'user-id-1',
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: account._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.getAccountById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            account: expect.objectContaining({
              name: 'Test Account',
              balance: 1000
            })
          })
        })
      );
    });
    
    it('should return 404 if account does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
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
      await accountController.getAccountById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'Account not found'
        })
      );
    });
    
    it('should return 403 if user tries to access another user\'s account', async () => {
      // Create a test account for a different user
      const account = await Account.create({
        userId: 'other-user-id',
        name: 'Other User Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'user-id-1', // Different from the account owner
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: account._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.getAccountById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'You do not have permission to access this account'
        })
      );
    });
    
    it('should allow admin to access any account', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'user-id-1',
        name: 'User Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      // Mock request and response with admin role
      const req = {
        auth: {
          sub: 'admin-id',
          realm_access: { // Changed
            roles: ['admin'] // Changed
          }
        },
        params: {
          id: account._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.getAccountById(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            account: expect.objectContaining({
              name: 'User Account',
              userId: 'user-id-1'
            })
          })
        })
      );
    });
  });
  
  describe('updateAccount', () => {
    it('should update an existing account', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'user-id-1',
        name: 'Original Name',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN',
        description: 'Original description'
      });
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: account._id
        },
        body: {
          name: 'Updated Name',
          balance: 1500,
          description: 'Updated description'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.updateAccount(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            account: expect.objectContaining({
              name: 'Updated Name',
              balance: 1500,
              description: 'Updated description',
              // Type should remain unchanged
              type: 'CHECKING'
            })
          })
        })
      );
      
      // Verify the changes in the database
      const updatedAccount = await Account.findById(account._id);
      expect(updatedAccount.name).toBe('Updated Name');
      expect(updatedAccount.balance).toBe(1500);
    });
    
    it('should return 404 if account does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: nonExistentId
        },
        body: {
          name: 'New Name'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.updateAccount(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'Account not found'
        })
      );
    });
    
    it('should return 403 if user tries to update another user\'s account', async () => {
      // Create a test account for a different user
      const account = await Account.create({
        userId: 'other-user-id',
        name: 'Other User Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'user-id-1', // Different from account owner
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: account._id
        },
        body: {
          name: 'Attempted Update'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.updateAccount(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'You do not have permission to update this account'
        })
      );
    });
  });
  
  describe('deleteAccount', () => {
    it('should delete an existing account', async () => {
      // Create a test account
      const account = await Account.create({
        userId: 'user-id-1',
        name: 'Account to Delete',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: account._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.deleteAccount(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: null
        })
      );
      
      // Verify the account was deleted
      const deletedAccount = await Account.findById(account._id);
      expect(deletedAccount).toBeNull();
    });
    
    it('should return 404 if account does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'user-id-1',
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
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
      await accountController.deleteAccount(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'Account not found'
        })
      );
    });
    
    it('should return 403 if user tries to delete another user\'s account', async () => {
      // Create a test account for a different user
      const account = await Account.create({
        userId: 'other-user-id',
        name: 'Other User Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'PLN'
      });
      
      // Mock request and response
      const req = {
        auth: {
          sub: 'user-id-1', // Different from account owner
          realm_access: { // Changed
            roles: ['user'] // Changed
          }
        },
        params: {
          id: account._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      // Call the controller function
      await accountController.deleteAccount(req, res, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'You do not have permission to delete this account'
        })
      );
    });
  });
});
