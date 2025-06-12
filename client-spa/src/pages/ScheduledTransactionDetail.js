import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, ListGroup, Modal } from 'react-bootstrap';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { getScheduledTransactionById, deleteScheduledTransaction } from '../services/scheduledTransactionService';
import { getAccountById } from '../services/accountService';
import { getCategoryById } from '../services/categoryService';
import { useUserPreferences } from '../context/UserPreferencesContext';
import Loading from '../components/Loading';

const ScheduledTransactionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatAmount } = useUserPreferences();
  
  const [scheduledTransaction, setScheduledTransaction] = useState(null);
  const [account, setAccount] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [messageType, setMessageType] = useState(location.state?.type || 'info');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Clear location state after reading it
  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const transactionResponse = await getScheduledTransactionById(id);
        const transactionData = transactionResponse.data.scheduledTransaction;
        setScheduledTransaction(transactionData);
        
        // Fetch related account
        if (transactionData && transactionData.accountId) {
          const accountResponse = await getAccountById(transactionData.accountId);
          setAccount(accountResponse.data.account);
        }
        
        // Fetch related category if exists
        if (transactionData && transactionData.categoryId) {
          const categoryResponse = await getCategoryById(transactionData.categoryId);
          setCategory(categoryResponse.data.category);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Nie udało się pobrać danych transakcji cyklicznej.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle delete transaction
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteScheduledTransaction(id);
      navigate('/scheduled-transactions', { 
        state: { 
          message: 'Cykliczna transakcja została usunięta.',
          type: 'success' 
        } 
      });
    } catch (err) {
      console.error('Error deleting scheduled transaction:', err);
      setError('Nie udało się usunąć transakcji cyklicznej.');
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      'active': { label: 'Aktywna', variant: 'success' },
      'paused': { label: 'Wstrzymana', variant: 'warning' },
      'completed': { label: 'Zakończona', variant: 'secondary' },
      'cancelled': { label: 'Anulowana', variant: 'danger' }
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    
    return (
      <Badge bg={statusInfo.variant}>{statusInfo.label}</Badge>
    );
  };

  // Get transaction type badge
  const getTypeBadge = (type) => {
    const typeMap = {
      'income': { label: 'Przychód', variant: 'success' },
      'expense': { label: 'Wydatek', variant: 'danger' },
      'transfer': { label: 'Przelew', variant: 'info' }
    };
    
    const typeInfo = typeMap[type] || { label: type, variant: 'secondary' };
    
    return (
      <Badge bg={typeInfo.variant}>{typeInfo.label}</Badge>
    );
  };

  // Get frequency label
  const getFrequencyLabel = (frequency) => {
    const frequencies = {
      'daily': 'Codziennie',
      'weekly': 'Co tydzień',
      'monthly': 'Co miesiąc',
      'quarterly': 'Co kwartał',
      'yearly': 'Co rok'
    };
    return frequencies[frequency] || frequency;
  };

  // Get day of week label
  const getDayOfWeekLabel = (dayOfWeek) => {
    if (dayOfWeek === undefined || dayOfWeek === null) return '-';
    
    const days = [
      'Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 
      'Czwartek', 'Piątek', 'Sobota'
    ];
    
    return days[dayOfWeek] || `Dzień ${dayOfWeek}`;
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
        <div className="mt-3">
          <Button variant="primary" as={Link} to="/scheduled-transactions">
            Powrót do listy transakcji cyklicznych
          </Button>
        </div>
      </Container>
    );
  }

  if (!scheduledTransaction) {
    return (
      <Container>
        <Alert variant="warning" className="mt-4">
          Nie znaleziono transakcji cyklicznej.
        </Alert>
        <div className="mt-3">
          <Button variant="primary" as={Link} to="/scheduled-transactions">
            Powrót do listy transakcji cyklicznych
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {message && (
        <Alert variant={messageType} className="mt-4" 
          onClose={() => setMessage('')} dismissible>
          {message}
        </Alert>
      )}
      
      <Row className="mb-4 align-items-center">
        <Col>
          <h1>Szczegóły transakcji cyklicznej</h1>
        </Col>
        <Col xs="auto">
          <div className="d-flex gap-2">
            <Button 
              variant="outline-primary" 
              as={Link} 
              to={`/scheduled-transactions/${id}/edit`}
            >
              Edytuj
            </Button>
            <Button 
              variant="outline-danger" 
              onClick={() => setShowConfirmDelete(true)}
              disabled={deleting}
            >
              {deleting ? 'Usuwanie...' : 'Usuń'}
            </Button>
          </div>
        </Col>
      </Row>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="mb-4">
            <Col md={6}>
              <Card.Title>Podstawowe informacje</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Status:</span>
                  <span>{getStatusBadge(scheduledTransaction.status)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Typ transakcji:</span>
                  <span>{getTypeBadge(scheduledTransaction.type)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Kwota:</span>
                  <span className={scheduledTransaction.type === 'income' ? 'text-success' : scheduledTransaction.type === 'expense' ? 'text-danger' : ''}>
                    <strong>{formatAmount(scheduledTransaction.amount)}</strong>
                  </span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Konto:</span>
                  <span>{account ? account.name : '-'}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Kategoria:</span>
                  <span>{category ? category.name : '-'}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Odbiorca:</span>
                  <span>{scheduledTransaction.payee || '-'}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Opis:</span>
                  <span>{scheduledTransaction.description || '-'}</span>
                </ListGroup.Item>
              </ListGroup>
            </Col>
            
            <Col md={6}>
              <Card.Title>Szczegóły cyklicznej płatności</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Częstotliwość:</span>
                  <span>{getFrequencyLabel(scheduledTransaction.frequency)}</span>
                </ListGroup.Item>
                {scheduledTransaction.frequency === 'weekly' && (
                  <ListGroup.Item className="d-flex justify-content-between">
                    <span>Dzień tygodnia:</span>
                    <span>{getDayOfWeekLabel(scheduledTransaction.dayOfWeek)}</span>
                  </ListGroup.Item>
                )}
                {(scheduledTransaction.frequency === 'monthly' || scheduledTransaction.frequency === 'quarterly' || scheduledTransaction.frequency === 'yearly') && (
                  <ListGroup.Item className="d-flex justify-content-between">
                    <span>Dzień miesiąca:</span>
                    <span>{scheduledTransaction.dayOfMonth || '-'}</span>
                  </ListGroup.Item>
                )}
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Data rozpoczęcia:</span>
                  <span>{formatDate(scheduledTransaction.startDate)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Data zakończenia:</span>
                  <span>{formatDate(scheduledTransaction.endDate)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Następna data wykonania:</span>
                  <span>{formatDate(scheduledTransaction.nextExecutionDate)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Ostatnia data wykonania:</span>
                  <span>{formatDate(scheduledTransaction.lastExecutionDate)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between">
                  <span>Automatyczne wykonanie:</span>
                  <span>{scheduledTransaction.autoExecute ? 'Tak' : 'Nie'}</span>
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>

          {scheduledTransaction.tags && scheduledTransaction.tags.length > 0 && (
            <div>
              <h5>Etykiety</h5>
              <div>
                {scheduledTransaction.tags.map((tag, index) => (
                  <Badge key={index} bg="secondary" className="me-1 mb-1 p-2">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
      
      <div className="d-flex justify-content-between mb-4">
        <Button variant="secondary" as={Link} to="/scheduled-transactions">
          Powrót do listy
        </Button>
      </div>

      {/* Confirm Delete Modal */}
      <Modal show={showConfirmDelete} onHide={() => setShowConfirmDelete(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Potwierdź usunięcie</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Czy na pewno chcesz usunąć tę cykliczną transakcję? Ta operacja jest nieodwracalna.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmDelete(false)}>
            Anuluj
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Usuwanie...' : 'Usuń'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ScheduledTransactionDetail;
