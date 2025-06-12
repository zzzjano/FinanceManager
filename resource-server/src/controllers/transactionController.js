// filepath: c:\Users\milew\Documents\FinanceManager\resource-server\src\controllers\transactionController.js
const financeService = require('../services/financeService');
const { logger } = require('../utils/logger');

// Get all transactions for the authenticated user
const getAllTransactions = async (req, res, next) => {
  try {
    const response = await financeService.getTransactions(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    next(error);
  }
};

// Create a new transaction
const createTransaction = async (req, res, next) => {
  try {
    const response = await financeService.createTransaction(req, req.body);
    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating transaction:', error);
    next(error);
  }
};

// Get a transaction by ID
const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.getTransactionById(req, id);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error fetching transaction with ID: ", error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Update a transaction
const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.updateTransaction(req, id, req.body);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error updating transaction with ID: ", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Delete a transaction
const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.deleteTransaction(req, id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error("Error deleting transaction with ID: ", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

module.exports = {
  getAllTransactions,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction
};
