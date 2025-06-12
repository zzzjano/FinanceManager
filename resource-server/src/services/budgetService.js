const axios = require('axios');
const { logger } = require('../utils/logger');

const FINANCE_SERVICE_URL = process.env.FINANCE_SERVICE_URL || 'http://finance-service:3003/api';

const createConfigWithAuth = (req) => {
  return {
    headers: {
      Authorization: req.headers.authorization
    }
  };
};

const getBudgets = async (req) => {
  try {
    // Forward query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${FINANCE_SERVICE_URL}/budgets${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url, createConfigWithAuth(req));
    return response.data;
  } catch (error) {
    logger.error('Error fetching budgets from finance service:', error.response?.data || error.message);
    throw error;
  }
};

const getBudgetById = async (req, id) => {
  try {
    const response = await axios.get(
      `${FINANCE_SERVICE_URL}/budgets/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error fetching budget with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const getBudgetProgress = async (req, id) => {
  try {
    const response = await axios.get(
      `${FINANCE_SERVICE_URL}/budgets/${id}/progress`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error fetching budget progress with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const createBudget = async (req, budgetData) => {
  try {
    const response = await axios.post(
      `${FINANCE_SERVICE_URL}/budgets`, 
      budgetData, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error('Error creating budget in finance service:', error.response?.data || error.message);
    throw error;
  }
};

const updateBudget = async (req, id, budgetData) => {
  try {
    const response = await axios.put(
      `${FINANCE_SERVICE_URL}/budgets/${id}`, 
      budgetData, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error updating budget with ID ${id} in finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const deleteBudget = async (req, id) => {
  try {
    const response = await axios.delete(
      `${FINANCE_SERVICE_URL}/budgets/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error deleting budget with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  getBudgets,
  getBudgetById,
  getBudgetProgress,
  createBudget,
  updateBudget,
  deleteBudget
};
