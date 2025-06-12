const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');

// Get all notifications for the authenticated user
const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Query parameters
    const filter = { userId };
    
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // Get notifications sorted by date desc
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalCount = await Notification.countDocuments(filter);
    
    res.status(200).json({
      status: 'success',
      results: notifications.length,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      },
      data: { notifications }
    });
  } catch (error) {
    logger.error('Error fetching user notifications:', error);
    next(error);
  }
};

// Get unread notification count for the authenticated user
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    const count = await Notification.countDocuments({ 
      userId, 
      isRead: false 
    });
    
    res.status(200).json({
      status: 'success',
      data: { count }
    });
  } catch (error) {
    logger.error('Error getting unread notification count:', error);
    next(error);
  }
};

// Mark notification as read
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.auth.sub;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { 
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        status: 'fail',
        message: 'Notification not found or does not belong to the user'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { notification }
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    next(error);
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    
    // Apply filters if provided
    const filter = { userId, isRead: false };
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    const result = await Notification.updateMany(
      filter,
      { 
        isRead: true,
        readAt: new Date()
      }
    );
    
    res.status(200).json({
      status: 'success',
      data: { 
        modifiedCount: result.nModified || result.modifiedCount || 0
      }
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    next(error);
  }
};

// Delete notification
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.auth.sub;
    
    const result = await Notification.findOneAndDelete({ 
      _id: id, 
      userId 
    });
    
    if (!result) {
      return res.status(404).json({
        status: 'fail',
        message: 'Notification not found or does not belong to the user'
      });
    }
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting notification:', error);
    next(error);
  }
};

// Delete all user's notifications
const deleteAllNotifications = async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    
    // Apply filters if provided
    const filter = { userId };
    
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    const result = await Notification.deleteMany(filter);
    
    res.status(200).json({
      status: 'success',
      data: { 
        deletedCount: result.deletedCount || 0 
      }
    });
  } catch (error) {
    logger.error('Error deleting all notifications:', error);
    next(error);
  }
};

// Create a notification from budget alerts
const createBudgetNotifications = async (budgetAlerts, userId) => {
  try {
    if (!budgetAlerts || !budgetAlerts.length) return null;
    
    const notifications = [];
    
    for (const alert of budgetAlerts) {
      let type, title, severity;
      
      // Determine notification type and severity based on alert type
      if (alert.type === 'category') {
        if (alert.spent >= alert.limit) {
          type = 'categoryExceeded';
          title = 'Category Budget Exceeded';
          severity = 'danger';
        } else {
          type = 'categoryWarning';
          title = 'Category Budget Warning';
          severity = 'warning';
        }
      } else {
        if (alert.spent >= alert.limit) {
          type = 'budgetExceeded';
          title = 'Total Budget Exceeded';
          severity = 'danger';
        } else {
          type = 'budgetWarning';
          title = 'Total Budget Warning';
          severity = 'warning';
        }
      }
      
      // Check if a similar notification already exists for this budget/category
      const existingNotification = await Notification.findOne({
        userId,
        type,
        relatedId: alert.budgetId,
        relatedModel: 'Budget',
        ...(alert.type === 'category' ? { 'data.categoryName': alert.categoryName } : {}),
        isRead: false
      });
      
      // Skip creating a new notification if one already exists
      if (existingNotification) {
        logger.info(`Skipping duplicate budget notification for ${alert.type === 'category' ? 'category ' + alert.categoryName : 'budget ' + alert.budgetName}`);
        continue;
      }
      
      // Create the notification
      const notification = await Notification.create({
        userId,
        type,
        title,
        message: alert.message,
        relatedId: alert.budgetId,
        relatedModel: 'Budget',
        data: {
          budgetName: alert.budgetName,
          limit: alert.limit,
          spent: alert.spent,
          percentage: Math.round((alert.spent / alert.limit) * 100),
          categoryName: alert.type === 'category' ? alert.categoryName : null
        },
        severity
      });
      
      notifications.push(notification);
    }
    
    return notifications;
  } catch (error) {
    logger.error('Error creating budget notifications:', error);
    return null;
  }
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  createBudgetNotifications
};