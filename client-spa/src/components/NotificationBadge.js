import React from 'react';
import { Badge } from 'react-bootstrap';
import { useNotifications } from '../context/NotificationContext';

const NotificationBadge = () => {
  const { unreadCount } = useNotifications();
  
  if (unreadCount <= 0) return null;
  
  return (
    <Badge 
      bg="danger" 
      pill 
      className="position-absolute top-0 start-100 translate-middle"
      style={{ fontSize: '0.6rem' }}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
};

export default NotificationBadge;
