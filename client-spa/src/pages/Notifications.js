import React, { useEffect } from 'react';
import { Container, Card, Button, Row, Col } from 'react-bootstrap';
import { useNotifications } from '../context/NotificationContext';
import NotificationItem from '../components/NotificationItem';
import Loading from '../components/Loading';

const Notifications = () => {
  const { notifications, loading, error, fetchNotifications, markAsRead } = useNotifications();
  
  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  
  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    const promises = notifications
      .filter(n => !n.isRead)
      .map(n => markAsRead(n._id));
    
    await Promise.all(promises);
  };
  
  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2>Powiadomienia</h2>
          <p className="text-muted">Sprawdź swoje powiadomienia</p>
        </Col>
        <Col xs="auto">
          <Button
            variant="outline-primary"
            onClick={handleMarkAllAsRead}
            disabled={!notifications.some(n => !n.isRead)}
          >
            Oznacz wszystkie jako przeczytane
          </Button>
        </Col>
      </Row>
      
      {loading && (
        <div className="text-center my-5">
          <Loading />
        </div>
      )}
      
      {error && (
        <Card>
          <Card.Body className="text-center text-danger">
            <p>Wystąpił błąd podczas ładowania powiadomień.</p>
            <Button 
              variant="primary" 
              onClick={() => fetchNotifications()}
            >
              Spróbuj ponownie
            </Button>
          </Card.Body>
        </Card>
      )}
      
      {!loading && notifications.length === 0 && (
        <Card>
          <Card.Body className="text-center">
            <h4 className="mb-3">Brak powiadomień</h4>
            <p>Nie masz żadnych nowych powiadomień.</p>
          </Card.Body>
        </Card>
      )}
      
      {!loading && notifications.length > 0 && (
        <div className="notification-list">
          {notifications.map(notification => (
            <NotificationItem key={notification._id} notification={notification} />
          ))}
        </div>
      )}
    </Container>
  );
};

export default Notifications;
