// filepath: c:\Users\milew\Documents\FinanceManager\resource-server\src\controllers\categoryController.js
const financeService = require('../services/financeService');
const { logger } = require('../utils/logger');

// Get all categories for the authenticated user
const getAllCategories = async (req, res, next) => {
  try {
    const response = await financeService.getCategories(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Create a new category
const createCategory = async (req, res, next) => {
  try {
    const response = await financeService.createCategory(req, req.body);
    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating category:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Get a category by ID
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.getCategoryById(req, id);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error fetching category with ID:", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Update a category
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.updateCategory(req, id, req.body);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error updating category with ID:", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Delete a category
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await financeService.deleteCategory(req, id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error("Error deleting category with ID:", error);

    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory
};
