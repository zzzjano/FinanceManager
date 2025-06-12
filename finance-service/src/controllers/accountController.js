const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { logger } = require('../utils/logger');

// Get all accounts for the authenticated user
const getAllAccounts = async (req, res, next) => {
  try {
    const userRoles = req.auth.realm_access?.roles || [];
    let filter;

    if (userRoles.includes('admin')) {
      if (req.query.userId) {
        filter = { userId: req.query.userId };
      } else {
        filter = {}; // Admin gets all accounts if no specific userId is requested
      }
    } else {
      filter = { userId: req.auth.sub }; // Regular user gets only their accounts
    }
    
    const accounts = await Account.find(filter).select('-__v');
    
    res.status(200).json({
      status: 'success',
      results: accounts.length,
      data: { accounts }
    });
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    next(error);
  }
};

// Create a new account
const createAccount = async (req, res, next) => {
  try {
    const { name, type, balance, currency, description } = req.body;
    
    const userRoles = req.auth.realm_access?.roles || [];
    // Corrected: Admin can specify userId in req.body, not req.query
    const userIdToSet = (userRoles.includes('admin') && req.body.userId)
      ? req.body.userId
      : req.auth.sub;
    
    const newAccount = await Account.create({
      userId: userIdToSet,
      name,
      type,
      balance,
      currency,
      description
    });
    
    res.status(201).json({
      status: 'success',
      data: { account: newAccount }
    });
  } catch (error) {
    logger.error('Error creating account:', error);
    next(error);
  }
};

// Get an account by ID
const getAccountById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id).select('-__v');
    
    if (!account) {
      return res.status(404).json({
        status: 'fail',
        message: 'Account not found'
      });
    }

    const userRoles = req.auth.realm_access?.roles || [];
    
    // Check if user has access to this account
    if (!userRoles.includes('admin') && account.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this account'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { account }
    });
  } catch (error) {
    logger.error(`Error fetching account with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update an account
const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, balance, currency, isActive, description } = req.body;
    
    const account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({
        status: 'fail',
        message: 'Account not found'
      });
    }

    const userRoles = req.auth.realm_access?.roles || [];
    
    // Check if user has access to update this account
    if (!userRoles.includes('admin') && account.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update this account'
      });
    }
    
    const updatedAccount = await Account.findByIdAndUpdate(
      id,
      {
        name: name !== undefined ? name : account.name,
        type: type !== undefined ? type : account.type,
        balance: balance !== undefined ? balance : account.balance,
        currency: currency !== undefined ? currency : account.currency,
        isActive: isActive !== undefined ? isActive : account.isActive,
        description: description !== undefined ? description : account.description
      },
      { new: true, runValidators: true }
    ).select('-__v');
    
    res.status(200).json({
      status: 'success',
      data: { account: updatedAccount }
    });
  } catch (error) {
    logger.error(`Error updating account with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete an account
const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({
        status: 'fail',
        message: 'Account not found'
      });
    }
    
    const userRoles = req.auth.realm_access?.roles || [];

    // Check if user has access to delete this account
    if (!userRoles.includes('admin') && account.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to delete this account'
      });
    }
    
    await Account.findByIdAndDelete(id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error(`Error deleting account with ID ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  getAllAccounts,
  createAccount,
  getAccountById,
  updateAccount,
  deleteAccount
};
