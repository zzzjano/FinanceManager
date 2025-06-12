import api from './api';

/**
 * Get all notifications for current user with optional filters
 * @param {Object} filters - Optional query parameters (isRead, type, etc.)
 * @returns {Promise} API response with notifications
 */
export const getNotifications = async (filters = {}) => {
  try {
    const validFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        validFilters[key] = value;
      }
    });
    
    const queryParams = new URLSearchParams(validFilters).toString();
    const url = `/notifications${queryParams ? `?${queryParams}` : ''}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get notification by ID
 * @param {string} id - Notification ID
 * @returns {Promise} API response with notification data
 */
export const getNotificationById = async (id) => {
  try {
    const response = await api.get(`/notifications/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching notification with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} id - Notification ID
 * @returns {Promise} API response with updated notification
 */
export const markNotificationAsRead = async (id) => {
  try {
    const response = await api.put(`/notifications/${id}/read`, {});
    return response.data;
  } catch (error) {
    console.error(`Error marking notification as read with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @returns {Promise} API response
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.put('/notifications/read-all', {});
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete notification
 * @param {string} id - Notification ID
 * @returns {Promise} API response
 */
export const deleteNotification = async (id) => {
  try {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting notification with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Get unread notification count
 * @returns {Promise} API response with count of unread notifications
 */
export const getUnreadNotificationCount = async () => {
  try {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    throw error;
  }
};
