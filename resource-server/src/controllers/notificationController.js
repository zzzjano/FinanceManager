const notificationService = require('../services/notificationService');
const { logger } = require('../utils/logger');

// Get all notifications for the authenticated user
const getAllNotifications = async (req, res, next) => {
  try {
    const response = await notificationService.getNotifications(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Get unread notification count for the authenticated user
const getUnreadCount = async (req, res, next) => {
  try {
    const response = await notificationService.getUnreadCount(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting unread notification count:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Mark notification as read
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await notificationService.markAsRead(req, id);
    res.status(200).json(response);
  } catch (error) {
    logger.error(`Error marking notification ${req.params.id} as read:`, error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res, next) => {
  try {
    const response = await notificationService.markAllAsRead(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Delete notification
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await notificationService.deleteNotification(req, id);
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting notification ${req.params.id}:`, error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Delete all notifications
const deleteAllNotifications = async (req, res, next) => {
  try {
    const response = await notificationService.deleteAllNotifications(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error deleting all notifications:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

module.exports = {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
};
