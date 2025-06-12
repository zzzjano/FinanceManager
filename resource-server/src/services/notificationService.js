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

/**
 * Gets all notifications for the current user
 */
const getNotifications = async (req) => {
  try {
    // Forward query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${FINANCE_SERVICE_URL}/notifications${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url, createConfigWithAuth(req));
    return response.data;
  } catch (error) {
    logger.error('Error fetching notifications from finance service:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Gets unread notification count for the current user
 */
const getUnreadCount = async (req) => {
  try {
    const response = await axios.get(
      `${FINANCE_SERVICE_URL}/notifications/unread-count`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error('Error fetching unread notification count from finance service:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Marks a notification as read
 */
const markAsRead = async (req, id) => {
  try {
    const response = await axios.put(
      `${FINANCE_SERVICE_URL}/notifications/${id}/read`,
      {},
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error marking notification ${id} as read:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Marks all notifications as read
 */
const markAllAsRead = async (req) => {
  try {
    // Forward query parameters for type filtering if needed
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${FINANCE_SERVICE_URL}/notifications/mark-all-read${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.put(url, {}, createConfigWithAuth(req));
    return response.data;
  } catch (error) {
    logger.error('Error marking all notifications as read:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Deletes a notification
 */
const deleteNotification = async (req, id) => {
  try {
    const response = await axios.delete(
      `${FINANCE_SERVICE_URL}/notifications/${id}`, 
      createConfigWithAuth(req)
    );
    return response.data;
  } catch (error) {
    logger.error(`Error deleting notification ${id}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Deletes all notifications (with optional filtering)
 */
const deleteAllNotifications = async (req) => {
  try {
    // Forward query parameters for filtering (isRead, type, etc.)
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${FINANCE_SERVICE_URL}/notifications${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.delete(url, createConfigWithAuth(req));
    return response.data;
  } catch (error) {
    logger.error('Error deleting all notifications:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
};
