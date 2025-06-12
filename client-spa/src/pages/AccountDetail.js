import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, ListGroup } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAccountById, deleteAccount } from '../services/accountService';
import Loading from '../components/Loading';

const AccountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true);
        const response = await getAccountById(id);
        setAccount(response.data.account);
      } catch (err) {
        console.error(`Error fetching account with ID ${id}:`, err);
        
        if (err.response?.status === 404) {
          setError('Konto o podanym identyfikatorze nie zostało znalezione.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Nie udało się pobrać danych konta. Spróbuj ponownie później.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [id]);

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await deleteAccount(id);
      navigate('/accounts', { state: { success: 'Konto zostało usunięte pomyślnie!' } });
    } catch (err) {
      console.error(`Error deleting account with ID ${id}:`, err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Nie udało się usunąć konta. Spróbuj ponownie później.');
      }
      
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency || 'PLN'
    }).format(amount);
  };

  const getAccountTypeName = (type) => {
    const types = {
      CHECKING: 'Konto osobiste',
      SAVINGS: 'Konto oszczędnościowe',
      CREDIT_CARD: 'Karta kredytowa',
      LOAN: 'Pożyczka/Kredyt',
      INVESTMENT: 'Inwestycje',
      CASH: 'Gotówka',
      OTHER: 'Inne'
    };
    
    return types[type] || type;
  };

  if (loading) {
    return <Loading />;
  }

  if (error && !account) {
    return (
      <Container>
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
        <Button 
          variant="outline-primary" 
          onClick={() => navigate('/accounts')}
          className="mt-3"
        >
          Powrót do listy kont
        </Button>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1>{account.name}</h1>
              <p className="lead d-flex align-items-center">
                {getAccountTypeName(account.type)}
                {' '}
                {account.isActive !== false ? 
                  <Badge bg="success" className="ms-2">Aktywne</Badge> :
                  <Badge bg="secondary" className="ms-2">Nieaktywne</Badge>
                }
              </p>
            </div>
            <div>
              <Link to={`/accounts/${id}/edit`} className="btn btn-outline-primary me-2">Edytuj</Link>
              {!showConfirmDelete && (
                <Button 
                  variant="outline-danger" 
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={deleting}
                >
                  Usuń konto
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {showConfirmDelete && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">
              <Alert.Heading>Potwierdzenie usunięcia</Alert.Heading>
              <p>
                Czy na pewno chcesz usunąć konto "{account.name}"? Ta operacja jest nieodwracalna.
                Wszystkie transakcje związane z tym kontem zostaną usunięte.
              </p>
              <div className="d-flex gap-2">
                <Button 
                  variant="danger" 
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? 'Usuwanie...' : 'Tak, usuń konto'}
                </Button>
                <Button 
                  variant="light" 
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={deleting}
                >
                  Anuluj
                </Button>
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      <Row>
        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Card.Title>Informacje o koncie</Card.Title>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Typ konta:</span>
                      <span>{getAccountTypeName(account.type)}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Waluta:</span>
                      <span>{account.currency}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Data utworzenia:</span>
                      <span>{new Date(account.createdAt).toLocaleDateString('pl-PL')}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                      <span>Status:</span>
                      <span>
                        {account.isActive !== false ? 'Aktywne' : 'Nieaktywne'}
                      </span>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                <Col md={6}>
                  <Card.Title>Saldo</Card.Title>
                  <div className="p-4 text-center">
                    <h2 className={account.balance < 0 ? 'text-danger' : 'text-success'}>
                      {formatCurrency(account.balance, account.currency)}
                    </h2>
                  </div>
                </Col>
              </Row>

              {account.description && (
                <div className="mt-3">
                  <Card.Title>Opis</Card.Title>
                  <Card.Text>{account.description}</Card.Text>
                </div>
              )}
            </Card.Body>
          </Card>

          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Ostatnie transakcje</Card.Title>
              <div className="text-center p-4">
                <p>Brak ostatnich transakcji dla tego konta.</p>
                <Button as={Link} to="/transactions/new" variant="primary">
                  Dodaj transakcję
                </Button>
              </div>
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
                <ListGroup.Item action as={Link} to={`/accounts/${id}/transactions`}>
                  Zobacz wszystkie transakcje
                </ListGroup.Item>
                <ListGroup.Item action as={Link} to={`/reports/account/${id}`}>
                  Generuj raport dla konta
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Historia salda</Card.Title>
              <div className="text-center p-4">
                <p>Tutaj pojawi się wykres historii salda konta.</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AccountDetail;
