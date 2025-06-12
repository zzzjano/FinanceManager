import api from './api';

/**
 * Get user profile by ID
 * @param {string} userId - User ID 
 * @returns {Promise} API response
 */
export const getUserProfile = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user preferences
 * @param {string} userId - User ID 
 * @returns {Promise} API response
 */
export const getUserPreferences = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}/preferences`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - User preferences object
 * @returns {Promise} API response
 */
export const updateUserPreferences = async (userId, preferences) => {
  try {
    const response = await api.put(`/users/${userId}/preferences`, preferences);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} profileData - User profile data
 * @returns {Promise} API response
 */
export const updateUserProfile = async (userId, profileData) => {
  try {
    const response = await api.put(`/users/${userId}`, profileData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Send a password reset request
 * @param {string} email - User email address
 * @returns {Promise} API response
 */
export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/users/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Reset password using a token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise} API response
 */
export const resetPassword = async (token, newPassword) => {
  try {
    const response = await api.post('/users/reset-password', { token, newPassword });
    return response.data;
  } catch (error) {
    throw error;
  }
};
