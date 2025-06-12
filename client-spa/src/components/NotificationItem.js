import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const NotificationItem = ({ notification }) => {
  const navigate = useNavigate();
  const { markAsRead } = useNotifications();
  
  // Format the date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Handle navigation to the related entity
  const handleNavigate = () => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    
    if (notification.entityType && notification.entityId) {
      switch (notification.entityType) {
        case 'budget':
          navigate(`/budgets/${notification.entityId}`);
          break;
        case 'transaction':
          navigate(`/transactions/${notification.entityId}`);
          break;
        case 'category':
          navigate(`/categories/${notification.entityId}`);
          break;
        case 'account':
          navigate(`/accounts/${notification.entityId}`);
          break;
        default:
          break;
      }
    }
  };
  
  // Map notification type to badge color
  const getBadgeColor = (type) => {
    switch (type) {
      case 'alert':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'secondary';
    }
  };
  
  return (
    <Card 
      className={`mb-2 ${!notification.isRead ? 'border-primary bg-light' : ''}`} 
      style={{ cursor: 'pointer' }}
      onClick={handleNavigate}
    >
      <Card.Body className="d-flex justify-content-between align-items-start py-2 px-3">
        <div>
          <div className="d-flex align-items-center mb-1">
            <Badge bg={getBadgeColor(notification.type)} className="me-2">
              {notification.type}
            </Badge>
            <small className="text-muted">
              {formatDate(notification.createdAt)}
            </small>
          </div>
          <div>
            {notification.message}
          </div>
        </div>
        
        {!notification.isRead && (
          <Button 
            size="sm" 
            variant="outline-primary" 
            className="ms-2"
            onClick={(e) => {
              e.stopPropagation();
              markAsRead(notification._id);
            }}
          >
            Oznacz jako przeczytane
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

export default NotificationItem;
