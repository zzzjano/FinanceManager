const budgetService = require('../services/budgetService');
const { logger } = require('../utils/logger');

// Get all budgets for the authenticated user
const getAllBudgets = async (req, res, next) => {
  try {
    const response = await budgetService.getBudgets(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching budgets:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Create a new budget
const createBudget = async (req, res, next) => {
  try {
    const response = await budgetService.createBudget(req, req.body);
    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating budget:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Get a budget by ID
const getBudgetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await budgetService.getBudgetById(req, id);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error fetching budget with ID:", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Get budget progress
const getBudgetProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await budgetService.getBudgetProgress(req, id);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error fetching budget progress with ID:", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Update a budget
const updateBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await budgetService.updateBudget(req, id, req.body);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error updating budget with ID:", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Delete a budget
const deleteBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await budgetService.deleteBudget(req, id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error("Error deleting budget with ID:", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

module.exports = {
  getAllBudgets,
  createBudget,
  getBudgetById,
  getBudgetProgress,
  updateBudget,
  deleteBudget
};
