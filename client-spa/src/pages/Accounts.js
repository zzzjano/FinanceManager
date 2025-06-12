import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getAccounts } from '../services/accountService';
import Loading from '../components/Loading';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await getAccounts();
        setAccounts(response.data.accounts || []);
        setError('');
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError('Nie udało się pobrać listy kont. Spróbuj ponownie później.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency || 'PLN'
    }).format(amount);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>Twoje konta</h1>
          <p className="lead">
            Zarządzaj swoimi kontami finansowymi.
          </p>
        </Col>
        <Col xs="auto" className="d-flex align-items-center">
          <Link to="/accounts/new">
            <Button variant="primary">Dodaj nowe konto</Button>
          </Link>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      {!error && accounts.length === 0 ? (
        <Card className="shadow-sm mb-4">
          <Card.Body className="text-center p-5">
            <h4>Nie masz jeszcze żadnych kont</h4>
            <p>Dodaj swoje pierwsze konto, aby rozpocząć śledzenie finansów.</p>
            <Link to="/accounts/new">
              <Button variant="primary">Dodaj konto</Button>
            </Link>
          </Card.Body>
        </Card>
      ) : (
        <Card className="shadow-sm mb-4">
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Nazwa konta</th>
                  <th>Typ</th>
                  <th>Saldo</th>
                  <th>Waluta</th>
                  <th>Status</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(account => (
                  <tr key={account._id}>
                    <td>{account.name}</td>
                    <td>{account.type}</td>
                    <td className={account.balance < 0 ? 'text-danger' : 'text-success'}>
                      {formatCurrency(account.balance, account.currency)}
                    </td>
                    <td>{account.currency}</td>
                    <td>
                      {account.isActive !== false ? (
                        <span className="badge bg-success">Aktywne</span>
                      ) : (
                        <span className="badge bg-secondary">Nieaktywne</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/accounts/${account._id}`} className="btn btn-sm btn-outline-primary me-2">
                        Szczegóły
                      </Link>
                      <Link to={`/accounts/${account._id}/edit`} className="btn btn-sm btn-outline-secondary me-2">
                        Edytuj
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default Accounts;
