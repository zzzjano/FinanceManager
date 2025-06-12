/**
 * User Service - Client for the User Service microservice
 * This service handles communication with the user-service microservice
 */

const axios = require('axios');
const { logger } = require('../utils/logger');

// Base URL from environment variable
const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_URL;

/**
 * Forward the authentication token to the user service
 * @param {string} token - JWT auth token
 * @returns {Object} headers object with authorization
 */
const getAuthHeaders = (token) => {
  return {
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  };
};

/**
 * Get all users (admin only)
 * @param {string} authToken - JWT auth token
 * @returns {Promise} response from user service
 */
const getAllUsers = async (authToken) => {
  try {
    const response = await axios.get(
      `${USER_SERVICE_BASE_URL}/users`,
      getAuthHeaders(authToken)
    );
    return response.data;
  } catch (error) {
    logger.error('Error getting all users from user-service:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get user by ID
 * @param {string} id - Keycloak user ID
 * @param {string} authToken - JWT auth token
 * @returns {Promise} response from user service
 */
const getUserById = async (id, authToken) => {
  try {
    const response = await axios.get(
      `${USER_SERVICE_BASE_URL}/users/${id}`,
      getAuthHeaders(authToken)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error getting user with ID ${id} from user-service:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Update user
 * @param {string} id - Keycloak user ID
 * @param {Object} userData - User data to update
 * @param {string} authToken - JWT auth token
 * @returns {Promise} response from user service
 */
const updateUser = async (id, userData, authToken) => {
  try {
    const response = await axios.put(
      `${USER_SERVICE_BASE_URL}/users/${id}`,
      userData,
      getAuthHeaders(authToken)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error updating user with ID ${id} in user-service:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Delete user
 * @param {string} id - Keycloak user ID
 * @param {string} authToken - JWT auth token
 * @returns {Promise} response from user service
 */
const deleteUser = async (id, authToken) => {
  try {
    const response = await axios.delete(
      `${USER_SERVICE_BASE_URL}/users/${id}`,
      getAuthHeaders(authToken)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error deleting user with ID ${id} from user-service:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Register new user
 * @param {Object} userData - User data for registration
 * @returns {Promise} response from user service
 */
const registerUser = async (userData) => {
  try {
    const response = await axios.post(
      `${USER_SERVICE_BASE_URL}/users/register`,
      userData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    logger.error('Error registering user with user-service:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get user preferences
 * @param {string} id - Keycloak user ID
 * @param {string} authToken - JWT auth token
 * @returns {Promise} response from user service
 */
const getUserPreferences = async (id, authToken) => {
  try {
    const response = await axios.get(
      `${USER_SERVICE_BASE_URL}/users/${id}/preferences`,
      getAuthHeaders(authToken)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error getting preferences for user with ID ${id} from user-service:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Update user preferences
 * @param {string} id - Keycloak user ID
 * @param {Object} preferencesData - Preferences to update
 * @param {string} authToken - JWT auth token
 * @returns {Promise} response from user service
 */
const updateUserPreferences = async (id, preferencesData, authToken) => {
  try {
    const response = await axios.put(
      `${USER_SERVICE_BASE_URL}/users/${id}/preferences`,
      preferencesData,
      getAuthHeaders(authToken)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error updating preferences for user with ID ${id} in user-service:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Request a password reset
 * @param {string} email - User email
 * @returns {Promise} response from user service
 */
const forgotPassword = async (email) => {
  try {
    const response = await axios.post(
      `${USER_SERVICE_BASE_URL}/users/forgot-password`,
      { email },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    logger.error('Error initiating password reset in user-service:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Reset password using token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise} response from user service
 */
const resetPassword = async (token, newPassword) => {
  try {
    const response = await axios.post(
      `${USER_SERVICE_BASE_URL}/users/reset-password`,
      { token, newPassword },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    logger.error('Error resetting password in user-service:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  registerUser,
  getUserPreferences,
  updateUserPreferences,
  forgotPassword,
  resetPassword
};
