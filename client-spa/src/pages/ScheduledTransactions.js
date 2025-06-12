import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Alert, Form, Badge, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getScheduledTransactions } from '../services/scheduledTransactionService'; 
import { getAccounts } from '../services/accountService';
import { getCategories } from '../services/categoryService';
import { useUserPreferences } from '../context/UserPreferencesContext';
import Loading from '../components/Loading';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const ScheduledTransactions = () => {
  const { formatAmount } = useUserPreferences();
  const [scheduledTransactions, setScheduledTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    frequency: '',
    accountId: '',
    categoryId: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load scheduled transactions and supporting data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [scheduledTransactionsResponse, accountsResponse, categoriesResponse] = await Promise.all([
          getScheduledTransactions({
            status: filters.status || undefined,
            frequency: filters.frequency || undefined,
            accountId: filters.accountId || undefined,
            categoryId: filters.categoryId || undefined
          }),
          getAccounts(),
          getCategories()
        ]);

        setScheduledTransactions(scheduledTransactionsResponse.data.scheduledTransactions || []);
        setAccounts(accountsResponse.data.accounts || []);
        setCategories(categoriesResponse.data.categories || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Wystąpił błąd podczas pobierania danych. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  // Function to get account name by ID
  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc._id === accountId);
    return account ? account.name : 'Nieznane konto';
  };

  // Function to get category name by ID
  const getCategoryName = (categoryId) => {
    if (!categoryId) return '-';
    const category = categories.find(cat => cat._id === categoryId);
    return category ? category.name : 'Nieznana kategoria';
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get transaction type label
  const getTransactionTypeLabel = (type) => {
    const types = {
      'income': 'Przychód',
      'expense': 'Wydatek',
      'transfer': 'Przelew'
    };
    return types[type] || type;
  };
  
  // Get badge variant based on transaction type
  const getTransactionBadgeVariant = (type) => {
    const variants = {
      'income': 'success',
      'expense': 'danger',
      'transfer': 'info'
    };
    return variants[type] || 'secondary';
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

  // Get status label and badge variant
  const getStatusInfo = (status) => {
    const statuses = {
      'active': { label: 'Aktywna', variant: 'success' },
      'paused': { label: 'Wstrzymana', variant: 'warning' },
      'completed': { label: 'Zakończona', variant: 'secondary' },
      'cancelled': { label: 'Anulowana', variant: 'danger' }
    };
    return statuses[status] || { label: status, variant: 'secondary' };
  };
  
  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: '',
      frequency: '',
      accountId: '',
      categoryId: '',
    });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>Cykliczne transakcje</h1>
          <p className="lead">
            Zarządzaj swoimi cyklicznymi płatnościami
          </p>
        </Col>
        <Col xs="auto" className="d-flex align-items-center">
          <Link to="/scheduled-transactions/new">
            <Button variant="primary">Dodaj nową cykliczną transakcję</Button>
          </Link>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Filtry</h5>
            <Button 
              variant="link" 
              onClick={() => setShowFilters(!showFilters)} 
              className="p-0 text-decoration-none"
            >
              {showFilters ? 'Ukryj filtry' : 'Pokaż filtry'}
            </Button>
          </div>
          
          {showFilters && (
            <Form className="mb-3">
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="">Wszystkie</option>
                      <option value="active">Aktywne</option>
                      <option value="paused">Wstrzymane</option>
                      <option value="completed">Zakończone</option>
                      <option value="cancelled">Anulowane</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Częstotliwość</Form.Label>
                    <Form.Select
                      name="frequency"
                      value={filters.frequency}
                      onChange={handleFilterChange}
                    >
                      <option value="">Wszystkie</option>
                      <option value="daily">Codziennie</option>
                      <option value="weekly">Co tydzień</option>
                      <option value="monthly">Co miesiąc</option>
                      <option value="quarterly">Co kwartał</option>
                      <option value="yearly">Co rok</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Konto</Form.Label>
                    <Form.Select
                      name="accountId"
                      value={filters.accountId}
                      onChange={handleFilterChange}
                    >
                      <option value="">Wszystkie</option>
                      {accounts.map(account => (
                        <option key={account._id} value={account._id}>
                          {account.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Kategoria</Form.Label>
                    <Form.Select
                      name="categoryId"
                      value={filters.categoryId}
                      onChange={handleFilterChange}
                    >
                      <option value="">Wszystkie</option>
                      {categories.map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex justify-content-end">
                <Button 
                  variant="secondary" 
                  onClick={clearFilters} 
                  className="me-2"
                >
                  Wyczyść filtry
                </Button>
              </div>
            </Form>
          )}
          
          {scheduledTransactions.length === 0 ? (
            <Alert variant="info">
              Nie znaleziono żadnych cyklicznych transakcji. Dodaj swoją pierwszą cykliczną transakcję, aby rozpocząć.
            </Alert>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Następna data</th>
                  <th>Typ</th>
                  <th>Kategoria</th>
                  <th>Częstotliwość</th>
                  <th>Opis</th>
                  <th>Konto</th>
                  <th>Kwota</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {scheduledTransactions.map(transaction => (
                  <tr key={transaction._id}>
                    <td>
                      <Badge bg={getStatusInfo(transaction.status).variant}>
                        {getStatusInfo(transaction.status).label}
                      </Badge>
                    </td>
                    <td>{formatDate(transaction.nextExecutionDate)}</td>
                    <td>
                      <Badge bg={getTransactionBadgeVariant(transaction.type)}>
                        {getTransactionTypeLabel(transaction.type)}
                      </Badge>
                    </td>
                    <td>{getCategoryName(transaction.categoryId)}</td>
                    <td>{getFrequencyLabel(transaction.frequency)}</td>
                    <td>
                      {transaction.description ? 
                        transaction.description.length > 30 
                          ? `${transaction.description.substring(0, 30)}...` 
                          : transaction.description 
                        : '-'}
                    </td>
                    <td>{getAccountName(transaction.accountId)}</td>
                    <td className={transaction.type === 'income' ? 'text-success' : transaction.type === 'expense' ? 'text-danger' : ''}>
                      {transaction.type === 'expense' ? '-' : ''}{formatAmount(transaction.amount)}
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link to={`/scheduled-transactions/${transaction._id}`} className="btn btn-sm btn-outline-primary">
                          Szczegóły
                        </Link>
                        <Link to={`/scheduled-transactions/${transaction._id}/edit`} className="btn btn-sm btn-outline-secondary">
                          Edytuj
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ScheduledTransactions;
