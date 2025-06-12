import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import * as budgetService from '../services/budgetService';
import BudgetProgressBar from '../components/BudgetProgressBar';
import Loading from '../components/Loading';
import { useUserPreferences } from '../context/UserPreferencesContext';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ isActive: 'true', type: '' });
  const { formatCurrency } = useUserPreferences();

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const data = await budgetService.getBudgets(filters);
      setBudgets(data.data.budgets);
      setError(null);
    } catch (err) {
      setError('Nie udało się pobrać budżetów. Spróbuj ponownie.');
      console.error('Error fetching budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [filters]);

  const getBudgetPeriodText = (budget) => {
    switch (budget.type) {
      case 'monthly':
        return 'Miesięczny';
      case 'weekly':
        return 'Tygodniowy';
      case 'annual':
        return 'Roczny';
      case 'custom':
        return 'Niestandardowy';
      default:
        return 'Inny';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pl-PL').format(date);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2>Zarządzanie budżetami</h2>
          <p className="text-muted">Zarządzaj budżetami i limitami wydatków</p>
        </Col>
        <Col xs="auto">
          <Link to="/budgets/new">
            <Button variant="primary">Dodaj nowy budżet</Button>
          </Link>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="isActive"
                  value={filters.isActive}
                  onChange={handleFilterChange}
                >
                  <option value="">Wszystkie</option>
                  <option value="true">Aktywne</option>
                  <option value="false">Nieaktywne</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Typ budżetu</Form.Label>
                <Form.Select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                >
                  <option value="">Wszystkie</option>
                  <option value="monthly">Miesięczny</option>
                  <option value="weekly">Tygodniowy</option>
                  <option value="annual">Roczny</option>
                  <option value="custom">Niestandardowy</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading && <Loading />}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {!loading && budgets.length === 0 && (
        <Card className="text-center p-4">
          <Card.Body>
            <h4>Brak budżetów</h4>
            <p>Dodaj swój pierwszy budżet, aby zacząć śledzić swoje wydatki.</p>
            <Link to="/budgets/new">
              <Button variant="primary">Dodaj nowy budżet</Button>
            </Link>
          </Card.Body>
        </Card>
      )}

      {!loading && budgets.length > 0 && (
        <Table responsive striped hover>
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Kategoria</th>
              <th>Typ</th>
              <th>Kwota</th>
              <th>Wydano</th>
              <th>Postęp</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((budget) => (
              <tr key={budget._id}>
                <td>
                  <Link to={`/budgets/${budget._id}`}>{budget.name}</Link>
                </td>
                <td>{budget.categories[0]?.categoryName || 'Nieznana'}</td>
                <td>{getBudgetPeriodText(budget)}</td>
                <td>{formatCurrency(budget.totalLimit)}</td>
                <td>
                  {budget ? formatCurrency(budget.totalSpent) : formatCurrency(0)}
                </td>
                <td style={{ width: '20%' }}>
                  {budget && (
                    <BudgetProgressBar
                      spent={budget.totalSpent}
                      amount={budget.totalLimit}
                      warningThreshold={budget.notificationThreshold}
                    />
                  )}
                </td>
                <td>
                  {budget.isActive ? (
                    <Badge bg="success">Aktywny</Badge>
                  ) : (
                    <Badge bg="secondary">Nieaktywny</Badge>
                  )}
                </td>
                <td>
                  <Link to={`/budgets/${budget._id}/edit`}>
                    <Button variant="outline-primary" size="sm" className="me-1">
                      Edytuj
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default Budgets;
