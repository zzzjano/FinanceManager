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
 * Fetch all scheduled transactions with optional filters
 * @param {Object} filters - Optional query parameters for filtering scheduled transactions
 * @returns {Promise} API response with scheduled transactions
 */
export const getScheduledTransactions = async (filters = {}) => {
  try {
    const validFilters = filterValidParams(filters);
    const queryParams = new URLSearchParams(validFilters).toString();
    const url = `/scheduled-transactions${queryParams ? `?${queryParams}` : ''}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching scheduled transactions:', error);
    throw error;
  }
};

/**
 * Get scheduled transaction by ID
 * @param {string} id - Scheduled transaction ID
 * @returns {Promise} API response with scheduled transaction details
 */
export const getScheduledTransactionById = async (id) => {
  try {
    const response = await api.get(`/scheduled-transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching scheduled transaction with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Create new scheduled transaction
 * @param {Object} scheduledTransactionData - Scheduled transaction data
 * @returns {Promise} API response with created scheduled transaction
 */
export const createScheduledTransaction = async (scheduledTransactionData) => {
  try {
    const response = await api.post('/scheduled-transactions', scheduledTransactionData);
    return response.data;
  } catch (error) {
    console.error('Error creating scheduled transaction:', error);
    throw error;
  }
};

/**
 * Update scheduled transaction
 * @param {string} id - Scheduled transaction ID
 * @param {Object} scheduledTransactionData - Updated scheduled transaction data
 * @returns {Promise} API response with updated scheduled transaction
 */
export const updateScheduledTransaction = async (id, scheduledTransactionData) => {
  try {
    const response = await api.put(`/scheduled-transactions/${id}`, scheduledTransactionData);
    return response.data;
  } catch (error) {
    console.error(`Error updating scheduled transaction with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete scheduled transaction
 * @param {string} id - Scheduled transaction ID
 * @returns {Promise} API response
 */
export const deleteScheduledTransaction = async (id) => {
  try {
    const response = await api.delete(`/scheduled-transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting scheduled transaction with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Get upcoming scheduled transactions for notifications and dashboard
 * @returns {Promise} API response with upcoming scheduled transactions
 */
export const getUpcomingTransactions = async () => {
  try {
    const response = await api.get('/scheduled-transactions/upcoming');
    return response.data;
  } catch (error) {
    console.error('Error fetching upcoming scheduled transactions:', error);
    throw error;
  }
};
