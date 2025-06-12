const axios = require('axios');
const { logger } = require('../utils/logger');

const FINANCE_SERVICE_URL = process.env.FINANCE_SERVICE_URL || 'http://finance-service:3003/api';

// Helper to forward the auth token to the finance service
const createConfigWithAuth = (req) => {
  return {
    headers: {
      Authorization: req.headers.authorization
    }
  };
};

// Transaction services
const getTransactions = async (req) => {
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${FINANCE_SERVICE_URL}/transactions${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url, createConfigWithAuth(req));
    return response.data;
  } catch (error) {
    logger.error('Error fetching transactions from finance service:', error.response?.data || error.message);
    throw error;
  }
};

const getTransactionById = async (req, id) => {
  try {
    const response = await axios.get(
      `${FINANCE_SERVICE_URL}/transactions/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error fetching transaction with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const createTransaction = async (req, transactionData) => {
  try {
    const response = await axios.post(
      `${FINANCE_SERVICE_URL}/transactions`, 
      transactionData, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error('Error creating transaction in finance service:', error.response?.data || error.message);
    throw error;
  }
};

const updateTransaction = async (req, id, transactionData) => {
  try {
    const response = await axios.put(
      `${FINANCE_SERVICE_URL}/transactions/${id}`, 
      transactionData, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error updating transaction with ID ${id} in finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const deleteTransaction = async (req, id) => {
  try {
    const response = await axios.delete(
      `${FINANCE_SERVICE_URL}/transactions/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error deleting transaction with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

// Category services
const getCategories = async (req) => {
  try {
    // Forward query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${FINANCE_SERVICE_URL}/categories${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url, createConfigWithAuth(req));
    return response.data;
  } catch (error) {
    logger.error('Error fetching categories from finance service:', error.response?.data || error.message);
    throw error;
  }
};

const getCategoryById = async (req, id) => {
  try {
    const response = await axios.get(
      `${FINANCE_SERVICE_URL}/categories/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error fetching category with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const createCategory = async (req, categoryData) => {
  try {
    const response = await axios.post(
      `${FINANCE_SERVICE_URL}/categories`, 
      categoryData, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error('Error creating category in finance service:', error.response?.data || error.message);
    throw error;
  }
};

const updateCategory = async (req, id, categoryData) => {
  try {
    const response = await axios.put(
      `${FINANCE_SERVICE_URL}/categories/${id}`, 
      categoryData, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error updating category with ID ${id} in finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const deleteCategory = async (req, id) => {
  try {
    const response = await axios.delete(
      `${FINANCE_SERVICE_URL}/categories/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error deleting category with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

// Account services
const getAccounts = async (req) => {
  try {
    // Forward query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${FINANCE_SERVICE_URL}/accounts${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url, createConfigWithAuth(req));
    return response.data;
  } catch (error) {
    logger.error('Error fetching accounts from finance service:', error.response?.data || error.message);
    throw error;
  }
};

const getAccountById = async (req, id) => {
  try {
    const response = await axios.get(
      `${FINANCE_SERVICE_URL}/accounts/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error fetching account with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const createAccount = async (req, accountData) => {
  try {
    const response = await axios.post(
      `${FINANCE_SERVICE_URL}/accounts`, 
      accountData, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error('Error creating account in finance service:', error.response?.data || error.message);
    throw error;
  }
};

const updateAccount = async (req, id, accountData) => {
  try {
    const response = await axios.put(
      `${FINANCE_SERVICE_URL}/accounts/${id}`, 
      accountData, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error updating account with ID ${id} in finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const deleteAccount = async (req, id) => {
  try {
    const response = await axios.delete(
      `${FINANCE_SERVICE_URL}/accounts/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error deleting account with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

// Scheduled Transaction services
const getScheduledTransactions = async (req) => {
  try {
    // Forward query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${FINANCE_SERVICE_URL}/scheduled-transactions${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url, createConfigWithAuth(req));
    return response.data;
  } catch (error) {
    logger.error('Error fetching scheduled transactions from finance service:', error.response?.data || error.message);
    throw error;
  }
};

const getScheduledTransactionById = async (req, id) => {
  try {
    const response = await axios.get(
      `${FINANCE_SERVICE_URL}/scheduled-transactions/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error fetching scheduled transaction with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const createScheduledTransaction = async (req, scheduledTransactionData) => {
  try {
    const response = await axios.post(
      `${FINANCE_SERVICE_URL}/scheduled-transactions`, 
      scheduledTransactionData, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error('Error creating scheduled transaction in finance service:', error.response?.data || error.message);
    throw error;
  }
};

const updateScheduledTransaction = async (req, id, scheduledTransactionData) => {
  try {
    const response = await axios.put(
      `${FINANCE_SERVICE_URL}/scheduled-transactions/${id}`, 
      scheduledTransactionData, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error updating scheduled transaction with ID ${id} in finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const deleteScheduledTransaction = async (req, id) => {
  try {
    const response = await axios.delete(
      `${FINANCE_SERVICE_URL}/scheduled-transactions/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error deleting scheduled transaction with ID ${id} from finance service:`, error.response?.data || error.message);
    throw error;
  }
};

const getUpcomingTransactions = async (req) => {
  try {
    // Forward query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${FINANCE_SERVICE_URL}/scheduled-transactions/upcoming${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url, createConfigWithAuth(req));
    return response.data;
  } catch (error) {
    logger.error('Error fetching upcoming scheduled transactions from finance service:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  // Transaction methods
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  
  // Category methods
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Account methods
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  
  // Scheduled Transaction methods
  getScheduledTransactions,
  getScheduledTransactionById,
  createScheduledTransaction,
  updateScheduledTransaction,
  deleteScheduledTransaction,
  getUpcomingTransactions
};
