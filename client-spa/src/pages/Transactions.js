import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Alert, Form, Badge, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getTransactions } from '../services/transactionService'; 
import { getAccounts } from '../services/accountService';
import { getCategories } from '../services/categoryService';
import { useUserPreferences } from '../context/UserPreferencesContext';
import Loading from '../components/Loading';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Transactions = () => {
  const { formatAmount } = useUserPreferences();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)), // First day of current month
    endDate: new Date(),
    type: '',
    accountId: '',
    categoryId: '',
    minAmount: '',
    maxAmount: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load transactions and supporting data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [transactionsResponse, accountsResponse, categoriesResponse] = await Promise.all([
          getTransactions({
            startDate: filters.startDate?.toISOString(),
            endDate: filters.endDate?.toISOString(),
            type: filters.type || undefined,
            accountId: filters.accountId || undefined,
            categoryId: filters.categoryId || undefined,
            minAmount: filters.minAmount || undefined,
            maxAmount: filters.maxAmount || undefined
          }),
          getAccounts(),
          getCategories()
        ]);

        setTransactions(transactionsResponse.data.transactions || []);
        setAccounts(accountsResponse.data.accounts || []);
        setCategories(categoriesResponse.data.categories || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Nie udało się pobrać danych. Spróbuj ponownie później.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  // Handle date filter changes
  const handleDateChange = (date, field) => {
    setFilters({
      ...filters,
      [field]: date
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      startDate: new Date(new Date().setDate(1)),
      endDate: new Date(),
      type: '',
      accountId: '',
      categoryId: '',
      minAmount: '',
      maxAmount: '',
    });
  };

  // Format transaction date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  // Get account name by ID
  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc._id === accountId);
    return account ? account.name : 'Nieznane konto';
  };

  // Get category name by ID
  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'Bez kategorii';
    const category = categories.find(cat => cat._id === categoryId);
    return category ? category.name : 'Nieznana kategoria';
  };

  // Get transaction type label
  const getTransactionTypeLabel = (type) => {
    const types = {
      income: 'Przychód',
      expense: 'Wydatek',
      transfer: 'Przelew'
    };
    return types[type] || type;
  };

  // Get badge variant based on transaction type
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

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>Transakcje</h1>
          <p className="lead">
            Zarządzaj swoimi transakcjami finansowymi
          </p>
        </Col>
        <Col xs="auto" className="d-flex align-items-center">
          <Link to="/transactions/new">
            <Button variant="primary">Dodaj nową transakcję</Button>
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
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Typ transakcji</Form.Label>
                    <Form.Select
                      name="type"
                      value={filters.type}
                      onChange={handleFilterChange}
                    >
                      <option value="">Wszystkie typy</option>
                      <option value="income">Przychody</option>
                      <option value="expense">Wydatki</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Konto</Form.Label>
                    <Form.Select
                      name="accountId"
                      value={filters.accountId}
                      onChange={handleFilterChange}
                    >
                      <option value="">Wszystkie konta</option>
                      {accounts.map(account => (
                        <option key={account._id} value={account._id}>
                          {account.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Kategoria</Form.Label>
                    <Form.Select
                      name="categoryId"
                      value={filters.categoryId}
                      onChange={handleFilterChange}
                    >
                      <option value="">Wszystkie kategorie</option>
                      {categories.map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Row>
                    <Col>
                      <Form.Group>
                        <Form.Label>Kwota od</Form.Label>
                        <Form.Control
                          type="number"
                          name="minAmount"
                          value={filters.minAmount}
                          onChange={handleFilterChange}
                          placeholder="Min"
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group>
                        <Form.Label>Kwota do</Form.Label>
                        <Form.Control
                          type="number"
                          name="maxAmount"
                          value={filters.maxAmount}
                          onChange={handleFilterChange}
                          placeholder="Max"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Data od</Form.Label>
                    <DatePicker
                      selected={filters.startDate}
                      onChange={(date) => handleDateChange(date, 'startDate')}
                      className="form-control"
                      dateFormat="dd/MM/yyyy"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Data do</Form.Label>
                    <DatePicker
                      selected={filters.endDate}
                      onChange={(date) => handleDateChange(date, 'endDate')}
                      className="form-control"
                      dateFormat="dd/MM/yyyy"
                      minDate={filters.startDate}
                    />
                  </Form.Group>
                </Col>
                <Col md={12} className="d-flex justify-content-end">
                  <Button variant="outline-secondary" onClick={handleResetFilters}>
                    Resetuj filtry
                  </Button>
                </Col>
              </Row>
            </Form>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          {transactions.length === 0 ? (
            <div className="text-center p-5">
              <h4>Brak transakcji</h4>
              <p>Nie znaleziono żadnych transakcji dla wybranych filtrów.</p>
              <Button as={Link} to="/transactions/new" variant="primary">
                Dodaj pierwszą transakcję
              </Button>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Typ</th>
                  <th>Kategoria</th>
                  <th>Opis</th>
                  <th>Konto</th>
                  <th>Kwota</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(transaction => (
                  <tr key={transaction._id}>
                    <td>{formatDate(transaction.date)}</td>
                    <td>
                      <Badge bg={getTransactionBadgeVariant(transaction.type)}>
                        {getTransactionTypeLabel(transaction.type)}
                      </Badge>
                    </td>
                    <td>{getCategoryName(transaction.categoryId)}</td>
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
                        <Link to={`/transactions/${transaction._id}`} className="btn btn-sm btn-outline-primary">
                          Szczegóły
                        </Link>
                        <Link to={`/transactions/${transaction._id}/edit`} className="btn btn-sm btn-outline-secondary">
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

export default Transactions;
