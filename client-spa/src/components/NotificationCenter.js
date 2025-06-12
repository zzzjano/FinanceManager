import React, { useState } from 'react';
import { Offcanvas, Button, Spinner, Alert } from 'react-bootstrap';
import { useNotifications } from '../context/NotificationContext';
import NotificationItem from './NotificationItem';

const NotificationCenter = ({ show, handleClose }) => {
  const { notifications, loading, error, fetchNotifications, markAsRead } = useNotifications();
  const [filter, setFilter] = useState('all'); // all, unread
  
  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const promises = notifications
        .filter(n => !n.isRead)
        .map(n => markAsRead(n._id));
      
      await Promise.all(promises);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };
  
  // Get filtered notifications
  const getFilteredNotifications = () => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.isRead);
    }
    return notifications;
  };
  
  const filteredNotifications = getFilteredNotifications();
  
  return (
    <Offcanvas show={show} onHide={handleClose} placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Powiadomienia</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <div className="d-flex justify-content-between mb-3">
          <div>
            <Button
              variant={filter === 'all' ? 'primary' : 'outline-primary'}
              size="sm"
              className="me-2"
              onClick={() => setFilter('all')}
            >
              Wszystkie
            </Button>
            <Button
              variant={filter === 'unread' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Nieprzeczytane
            </Button>
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={!notifications.some(n => !n.isRead)}
          >
            Oznacz wszystkie jako przeczytane
          </Button>
        </div>
        
        {loading && (
          <div className="text-center my-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Ładowanie powiadomień...</p>
          </div>
        )}
        
        {error && (
          <Alert variant="danger">
            {error}
          </Alert>
        )}
        
        {!loading && filteredNotifications.length === 0 && (
          <div className="text-center my-4 text-muted">
            <p>Brak powiadomień</p>
          </div>
        )}
        
        {filteredNotifications.map(notification => (
          <NotificationItem 
            key={notification._id} 
            notification={notification} 
          />
        ))}
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default NotificationCenter;
