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
 * Get all budgets with optional filters
 * @param {Object} filters - Optional query parameters (isActive, type, date, etc.)
 * @returns {Promise} API response with budgets
 */
export const getBudgets = async (filters = {}) => {
  try {
    const validFilters = filterValidParams(filters);
    const queryParams = new URLSearchParams(validFilters).toString();
    const url = `/budgets${queryParams ? `?${queryParams}` : ''}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching budgets:', error);
    throw error;
  }
};

/**
 * Get budget by ID
 * @param {string} id - Budget ID
 * @returns {Promise} API response with budget data
 */
export const getBudgetById = async (id) => {
  try {
    const response = await api.get(`/budgets/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching budget with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Get budget progress by ID
 * @param {string} id - Budget ID
 * @returns {Promise} API response with budget progress data
 */
export const getBudgetProgress = async (id) => {
  try {
    const response = await api.get(`/budgets/${id}/progress`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching budget progress with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Create new budget
 * @param {Object} budgetData - Budget data
 * @returns {Promise} API response with created budget
 */
export const createBudget = async (budgetData) => {
  try {
    const response = await api.post('/budgets', budgetData);
    return response.data;
  } catch (error) {
    console.error('Error creating budget:', error);
    throw error;
  }
};

/**
 * Update budget
 * @param {string} id - Budget ID
 * @param {Object} budgetData - Updated budget data
 * @returns {Promise} API response with updated budget
 */
export const updateBudget = async (id, budgetData) => {
  try {
    const response = await api.put(`/budgets/${id}`, budgetData);
    return response.data;
  } catch (error) {
    console.error(`Error updating budget with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete budget
 * @param {string} id - Budget ID
 * @returns {Promise} API response
 */
export const deleteBudget = async (id) => {
  try {
    const response = await api.delete(`/budgets/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting budget with ID ${id}:`, error);
    throw error;
  }
};
