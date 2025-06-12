const financeService = require('../services/financeService');
const { logger } = require('../utils/logger');

// Get all scheduled transactions for the authenticated user
const getAllScheduledTransactions = async (req, res, next) => {
  try {
    const response = await financeService.getScheduledTransactions(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching scheduled transactions:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Create a new scheduled transaction
const createScheduledTransaction = async (req, res, next) => {
  try {
    const response = await financeService.createScheduledTransaction(req, req.body);
    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating scheduled transaction:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Get a scheduled transaction by ID
const getScheduledTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.getScheduledTransactionById(req, id);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error fetching scheduled transaction with ID " + req.params.id + ": ", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Update a scheduled transaction
const updateScheduledTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.updateScheduledTransaction(req, id, req.body);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error updating scheduled transaction with ID " + req.params.id + ": ", error);
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Delete a scheduled transaction
const deleteScheduledTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.deleteScheduledTransaction(req, id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error("Error deleting scheduled transaction with ID " + req.params.id + ": ", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Get upcoming scheduled transactions
const getUpcomingTransactions = async (req, res, next) => {
  try {
    const response = await financeService.getUpcomingTransactions(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching upcoming scheduled transactions:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

module.exports = {
  getAllScheduledTransactions,
  createScheduledTransaction,
  getScheduledTransactionById,
  updateScheduledTransaction,
  deleteScheduledTransaction,
  getUpcomingTransactions
};