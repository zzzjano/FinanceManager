import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, ListGroup, Modal } from 'react-bootstrap';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { getTransactionById, deleteTransaction } from '../services/transactionService';
import { getAccountById } from '../services/accountService';
import { getCategoryById } from '../services/categoryService';
import { useUserPreferences } from '../context/UserPreferencesContext';
import Loading from '../components/Loading';

const TransactionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatAmount } = useUserPreferences();
  
  const [transaction, setTransaction] = useState(null);
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
        
        const transactionResponse = await getTransactionById(id);
        const transactionData = transactionResponse.data.transaction;
        setTransaction(transactionData);
        
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
        console.error(`Error fetching transaction with ID ${id}:`, err);
        
        if (err.response?.status === 404) {
          setError('Transakcja nie została znaleziona.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Wystąpił błąd podczas pobierania danych transakcji.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleDeleteClick = () => {
    setShowConfirmDelete(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      await deleteTransaction(id);
      navigate('/transactions', {
        state: {
          message: 'Transakcja została pomyślnie usunięta.',
          type: 'success'
        }
      });
    } catch (err) {
      console.error(`Error deleting transaction with ID ${id}:`, err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Nie udało się usunąć transakcji. Spróbuj ponownie później.');
      }
      
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTransactionTypeLabel = (type) => {
    const types = {
      income: 'Przychód',
      expense: 'Wydatek',
      transfer: 'Przelew'
    };
    return types[type] || type;
  };

  const getTransactionBadgeVariant = (type) => {
    const variants = {
      income: 'success',
      expense: 'danger',
      transfer: 'info'
    };
    return variants[type] || 'secondary';
  };

  if (loading) {
    return <Loading />;
  }

  if (error && !transaction) {
    return (
      <Container>
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      {message && (
        <Alert variant={messageType} onClose={() => setMessage('')} dismissible>
          {message}
        </Alert>
      )}

      <Row className="mb-4">
        <Col>
          <h1>Szczegóły transakcji</h1>
          <p className="lead">
            {transaction && transaction.description ? transaction.description : 'Transakcja z ' + formatDate(transaction?.date)}
          </p>
        </Col>
        <Col xs="auto" className="d-flex align-items-center">
          <div className="d-flex gap-2">
            <Button
              as={Link}
              to={`/transactions/${id}/edit`}
              variant="outline-secondary"
            >
              Edytuj
            </Button>
            <Button
              variant="outline-danger"
              onClick={handleDeleteClick}
              disabled={deleting}
            >
              {deleting ? 'Usuwanie...' : 'Usuń'}
            </Button>
          </div>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <Row>
        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Podstawowe informacje</Card.Title>
              <Row className="mb-4">
                <Col md={4} className="mb-3 mb-md-0">
                  <div className="text-muted mb-1">Kwota</div>
                  <h4 className={transaction?.type === 'expense' ? 'text-danger' : 'text-success'}>
                    {transaction?.type === 'expense' ? '-' : ''}
                    {formatAmount(transaction?.amount)}
                  </h4>
                </Col>
                <Col md={4} className="mb-3 mb-md-0 hidden">
                  <div className="text-muted mb-1">Typ</div>
                  <h5>
                    <Badge bg={getTransactionBadgeVariant(transaction?.type)}>
                      {getTransactionTypeLabel(transaction?.type)}
                    </Badge>
                    {transaction?.isRecurring && (
                      <Badge bg="info" className="ms-2">Cykliczna</Badge>
                    )}
                  </h5>
                </Col>
                <Col md={4}>
                  <div className="text-muted mb-1">Data</div>
                  <h5>{formatDate(transaction?.date)}</h5>
                </Col>
              </Row>

              <Row>
                <Col md={6} className="mb-3">
                  <div className="text-muted mb-1">Konto</div>
                  <div>
                    {account ? (
                      <Link to={`/accounts/${account._id}`}>
                        {account.name} ({account.currency})
                      </Link>
                    ) : 'Nieznane konto'}
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="text-muted mb-1">Kategoria</div>
                  <div>
                    {category ? (
                      <Link to={`/categories/${category._id}`}>
                        {category.name}
                      </Link>
                    ) : 'Bez kategorii'}
                  </div>
                </Col>
                {transaction?.payee && (
                  <Col md={6} className="mb-3">
                    <div className="text-muted mb-1">Odbiorca/Nadawca</div>
                    <div>{transaction.payee}</div>
                  </Col>
                )}
                {transaction?.description && (
                  <Col md={12} className="mb-3">
                    <div className="text-muted mb-1">Opis</div>
                    <div>{transaction.description}</div>
                  </Col>
                )}
                {transaction?.tags && transaction.tags.length > 0 && (
                  <Col md={12}>
                    <div className="text-muted mb-1">Etykiety</div>
                    <div>
                      {transaction.tags.map((tag, index) => (
                        <Badge key={index} bg="secondary" className="me-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Akcje</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item action as={Link} to="/transactions/new">
                  Dodaj nową transakcję
                </ListGroup.Item>
                <ListGroup.Item action as={Link} to={`/transactions/${id}/edit`}>
                  Edytuj tę transakcję
                </ListGroup.Item>
                <ListGroup.Item action as={Link} to="/transactions">
                  Zobacz wszystkie transakcje
                </ListGroup.Item>
                {account && (
                  <ListGroup.Item action as={Link} to={`/accounts/${account._id}`}>
                    Przejdź do konta
                  </ListGroup.Item>
                )}
                {category && (
                  <ListGroup.Item action as={Link} to={`/categories/${category._id}`}>
                    Przejdź do kategorii
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>

          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Informacje systemowe</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <small className="text-muted">ID transakcji</small>
                  <div className="text-truncate">
                    <code>{transaction?._id}</code>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item>
                  <small className="text-muted">Data utworzenia</small>
                  <div>{formatDate(transaction?.createdAt)}</div>
                </ListGroup.Item>
                {transaction?.updatedAt && transaction?.updatedAt !== transaction?.createdAt && (
                  <ListGroup.Item>
                    <small className="text-muted">Ostatnia aktualizacja</small>
                    <div>{formatDate(transaction?.updatedAt)}</div>
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Delete confirmation modal */}
      <Modal show={showConfirmDelete} onHide={() => setShowConfirmDelete(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Potwierdź usunięcie</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Czy na pewno chcesz usunąć tę transakcję? Ta operacja jest nieodwracalna.</p>
          <p className="mb-0">
            <strong>Typ:</strong> {getTransactionTypeLabel(transaction?.type)}
          </p>
          <p className="mb-0">
            <strong>Kwota:</strong> {formatAmount(transaction?.amount)}
          </p>
          <p className="mb-0">
            <strong>Data:</strong> {formatDate(transaction?.date)}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmDelete(false)}>
            Anuluj
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
            {deleting ? 'Usuwanie...' : 'Usuń transakcję'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TransactionDetail;
