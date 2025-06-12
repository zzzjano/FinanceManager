import api from './api';

/**
 * Filter out undefined, null, and empty string values from query parameters
 * @param {Object} params - Object with query parameters
 * @returns {Object} - Filtered object with only valid values
 */
const filterValidParams = (params = {}) => {
  const filteredParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      filteredParams[key] = value;
    }
  });
  return filteredParams;
};

/**
 * Fetch all transactions with optional filters
 * @param {Object} filters - Optional query parameters for filtering transactions
 * @returns {Promise} API response with transactions
 */
export const getTransactions = async (filters = {}) => {
  try {
    const validFilters = filterValidParams(filters);
    const queryParams = new URLSearchParams(validFilters).toString();
    const url = `/transactions${queryParams ? `?${queryParams}` : ''}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

/**
 * Get transaction by ID
 * @param {string} id - Transaction ID
 * @returns {Promise} API response with transaction details
 */
export const getTransactionById = async (id) => {
  try {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching transaction with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Create new transaction
 * @param {Object} transactionData - Transaction data
 * @returns {Promise} API response with created transaction
 */
export const createTransaction = async (transactionData) => {
  try {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

/**
 * Update transaction
 * @param {string} id - Transaction ID
 * @param {Object} transactionData - Updated transaction data
 * @returns {Promise} API response with updated transaction
 */
export const updateTransaction = async (id, transactionData) => {
  try {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data;
  } catch (error) {
    console.error(`Error updating transaction with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete transaction
 * @param {string} id - Transaction ID
 * @returns {Promise} API response
 */
export const deleteTransaction = async (id) => {
  try {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting transaction with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Get monthly report of transactions
 * @param {Object} params - Optional query parameters (year, month)
 * @returns {Promise} API response with monthly report
 */
export const getMonthlyReport = async (params = {}) => {
  try {
    const validParams = filterValidParams(params);
    const queryParams = new URLSearchParams(validParams).toString();
    const response = await api.get(`/reports/monthly?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly report:', error);
    throw error;
  }
};

/**
 * Get category summary of transactions
 * @param {Object} params - Optional query parameters (startDate, endDate, type)
 * @returns {Promise} API response with category summary
 */
export const getCategorySummary = async (params = {}) => {
  try {
    const validParams = filterValidParams(params);
    const queryParams = new URLSearchParams(validParams).toString();
    const response = await api.get(`/reports/category-summary?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching category summary:', error);
    throw error;
  }
};