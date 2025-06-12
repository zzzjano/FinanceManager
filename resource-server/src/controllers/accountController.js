// filepath: c:\Users\milew\Documents\FinanceManager\resource-server\src\controllers\accountController.js
const financeService = require('../services/financeService');
const { logger } = require('../utils/logger');

// Get all accounts for the authenticated user
const getAllAccounts = async (req, res, next) => {
  try {
    const response = await financeService.getAccounts(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Create a new account
const createAccount = async (req, res, next) => {
  try {
    const response = await financeService.createAccount(req, req.body);
    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating account:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Get an account by ID
const getAccountById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.getAccountById(req, id);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error fetching account with ID " + req.params.id + ": ", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Update an account
const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.updateAccount(req, id, req.body);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error updating account with ID " + req.params.id + ": ", error);
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Delete an account
const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.deleteAccount(req, id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error("Error deleting account with ID " + req.params.id + ": ", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
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
