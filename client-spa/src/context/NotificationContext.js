import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead } from '../services/notificationService';
import { useKeycloak } from './KeycloakContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { authenticated } = useKeycloak();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (filters = {}) => {
    if (!authenticated) return;
    
    setLoading(true);
    try {
      const data = await getNotifications(filters);
      setNotifications(data.data.notifications);
      setError(null);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  // Get unread notification count
  const fetchUnreadCount = useCallback(async () => {
    if (!authenticated) return;

    try {
      const data = await getUnreadNotificationCount();
      console.log(data);
      setUnreadCount(data.data.count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [authenticated]);

  // Mark notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      await markNotificationAsRead(id);
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notif => 
          notif._id === id ? { ...notif, isRead: true } : notif
        )
      );
      
      // Reduce unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      
      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, []);

  // Initial load and setup polling
  useEffect(() => {
    if (authenticated) {
      // Initial fetch
      fetchNotifications();
      fetchUnreadCount();
      
      // Set up polling for new notifications (every 30 seconds)
      const intervalId = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
      
      // Cleanup on unmount
      return () => clearInterval(intervalId);
    }
  }, [authenticated, fetchNotifications, fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
