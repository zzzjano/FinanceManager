import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useKeycloak } from '../context/KeycloakContext';
import { getAccounts } from '../services/accountService';
import { getTransactions } from '../services/transactionService';
import { getUpcomingTransactions } from '../services/scheduledTransactionService';
import { getBudgets } from '../services/budgetService';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useNotifications } from '../context/NotificationContext';
import BudgetProgressBar from '../components/BudgetProgressBar';

const Dashboard = () => {  
  const { userProfile } = useKeycloak();
  const { formatAmount, formatCurrency } = useUserPreferences();
  const { unreadCount } = useNotifications();
  
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState('');
  
  const [upcomingTransactions, setUpcomingTransactions] = useState({
    upcomingTransactions: [],
    insufficientFundsTransactions: []
  });
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState('');
  
  const [budgets, setBudgets] = useState([]);
  const [budgetsLoading, setBudgetsLoading] = useState(true);
  const [budgetsError, setBudgetsError] = useState('');
  
  // Fetch accounts when component mounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await getAccounts();
        setAccounts(response.data.accounts || []);
      } catch (err) {
        console.error("Error fetching accounts:", err);
        setError("Nie można załadować danych kont.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccounts();
  }, []);

  // Fetch recent transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTransactionsLoading(true);
        const response = await getTransactions({ limit: 5, sort: '-date' });
        setTransactions(response.data.transactions || []);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setTransactionsError("Nie można załadować ostatnich transakcji.");
      } finally {
        setTransactionsLoading(false);
      }
    };
    
    fetchTransactions();
  }, []);

  // Fetch upcoming scheduled transactions
  useEffect(() => {
    const fetchUpcomingTransactions = async () => {
      try {
        setUpcomingLoading(true);
        const response = await getUpcomingTransactions();
        setUpcomingTransactions(response.data);
      } catch (err) {
        console.error("Error fetching upcoming transactions:", err);
        setUpcomingError("Nie można załadować nadchodzących płatności cyklicznych.");
      } finally {
        setUpcomingLoading(false);
      }
    };
    
    fetchUpcomingTransactions();
  }, []);

  // Fetch budgets
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setBudgetsLoading(true);
        const data = await getBudgets({ isActive: true, limit: 5 });
        setBudgets(data.data.budgets);
        setBudgetsError(null);
      } catch (err) {
        console.error('Error fetching budgets:', err);
        setBudgetsError('Nie można załadować danych budżetów.');
      } finally {
        setBudgetsLoading(false);
      }
    };
    
    fetchBudgets();
  }, []);
    // Calculate total balance across all accounts
  const totalBalance = accounts.reduce((total, account) => {
    // In a real app, you would handle currency conversion here
    return total + account.balance;
  }, 0);

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>Dashboard</h1>
          <p className="lead">
            Witaj, {userProfile?.firstName || userProfile?.username || 'Użytkowniku'}! 
            Oto twój dashboard finansowy.
          </p>
        </Col>
      </Row>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {transactionsError && <Alert variant="danger">{transactionsError}</Alert>}

      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Podsumowanie finansowe</Card.Title>
              <Card.Text>
                <p><strong>Saldo wszystkich kont: </strong> {formatCurrency(totalBalance)}</p>
                <p><strong>Przychody (ten miesiąc): </strong> {formatCurrency(0)}</p>
                <p><strong>Wydatki (ten miesiąc): </strong> {formatCurrency(0)}</p>
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Twoje konta</Card.Title>
              {loading ? (
                <p>Ładowanie kont...</p>
              ) : accounts.length === 0 ? (
                <>
                  <p>Nie masz jeszcze żadnych kont.</p>
                  <p>Dodaj swoje pierwsze konto, aby rozpocząć śledzenie finansów.</p>
                </>
              ) : (
                <div className="account-list">
                  {accounts.slice(0, 3).map(account => (
                    <div key={account._id} className="d-flex justify-content-between align-items-center mb-2">
                      <span>{account.name}</span>
                      <span className={account.balance < 0 ? "text-danger" : "text-success"}>
                        {formatCurrency(account.balance, account.currency)}
                      </span>
                    </div>
                  ))}
                  {accounts.length > 3 && <p className="text-muted">i {accounts.length - 3} więcej...</p>}
                </div>
              )}
            </Card.Body>
            <Card.Footer>
              <Link to="/accounts" className="btn btn-sm btn-primary">Zarządzaj kontami</Link>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={4} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Ostatnie transakcje</Card.Title>
              {transactionsLoading ? (
                <p>Ładowanie transakcji...</p>
              ) : transactions.length === 0 ? (
                <Card.Text>
                  <p>Nie masz jeszcze żadnych transakcji.</p>
                  <p>Dodaj swoją pierwszą transakcję, aby rozpocząć śledzenie wydatków.</p>
                </Card.Text>
              ) : (
                <ul className="list-unstyled">
                  {transactions.map(transaction => (
                    <li key={transaction._id} className="d-flex justify-content-between align-items-center mb-2">
                      <span>{transaction.description}</span>
                      <span className={transaction.amount < 0 ? "text-danger" : "text-success"}>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
            <Card.Footer>
              <Link to="/transactions" className="btn btn-sm btn-primary">Zarządzaj transakcjami</Link>
            </Card.Footer>
          </Card>
        </Col>
      </Row>      
      <Row>
        <Col md={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Nadchodzące płatności cykliczne</Card.Title>
              {upcomingError && <Alert variant="danger">{upcomingError}</Alert>}
              {upcomingLoading ? (
                <p>Ładowanie nadchodzących płatności...</p>
              ) : (
                <>
                  {upcomingTransactions.upcomingTransactions?.length === 0 && 
                   upcomingTransactions.insufficientFundsTransactions?.length === 0 ? (
                    <Card.Text>Brak nadchodzących płatności cyklicznych w najbliższych dniach.</Card.Text>
                  ) : (
                    <>
                      {upcomingTransactions.insufficientFundsTransactions?.length > 0 && (
                        <>
                          <h6 className="mt-3 text-danger">
                            <strong>Płatności wstrzymane (brak środków)</strong>
                          </h6>
                          <ul className="list-unstyled">
                            {upcomingTransactions.insufficientFundsTransactions.map(transaction => (
                              <li key={transaction._id} className="mb-2 border-bottom pb-2">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <Badge bg="warning" className="me-2">Wstrzymana</Badge>
                                    <strong>{transaction.description || 'Płatność cykliczna'}</strong>
                                  </div>
                                  <span className="text-danger">
                                    {formatAmount(transaction.amount)}
                                  </span>
                                </div>
                                <small className="text-muted d-block">
                                  Konto: {accounts.find(acc => acc._id === transaction.accountId)?.name || 'Nieznane konto'}
                                </small>
                                <div className="mt-1">
                                  <Link to={`/scheduled-transactions/${transaction._id}`} className="btn btn-sm btn-outline-primary">
                                    Szczegóły
                                  </Link>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {upcomingTransactions.upcomingTransactions?.length > 0 && (
                        <>
                          <h6 className="mt-3">
                            <strong>Nadchodzące w ciągu 3 dni</strong>
                          </h6>
                          <ul className="list-unstyled">
                            {upcomingTransactions.upcomingTransactions.map(transaction => (
                              <li key={transaction._id} className="mb-2 border-bottom pb-2">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <strong>{transaction.description || 'Płatność cykliczna'}</strong>
                                  </div>
                                  <span className={transaction.type === 'expense' ? 'text-danger' : 'text-success'}>
                                    {transaction.type === 'expense' ? '-' : ''}{formatAmount(transaction.amount)}
                                  </span>
                                </div>
                                <small className="text-muted d-block">
                                  {new Date(transaction.nextExecutionDate).toLocaleDateString()} - 
                                  {transaction.autoExecute ? ' Automatyczna' : ' Manualna'}
                                </small>
                                <div className="mt-1">
                                  <Link to={`/scheduled-transactions/${transaction._id}`} className="btn btn-sm btn-outline-primary">
                                    Szczegóły
                                  </Link>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </Card.Body>
            <Card.Footer>
              <Link to="/scheduled-transactions" className="btn btn-sm btn-primary">Zarządzaj cyklicznymi transakcjami</Link>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Aktywne budżety</Card.Title>
              {budgetsError && <Alert variant="danger">{budgetsError}</Alert>}
              {budgetsLoading ? (
                <p>Ładowanie budżetów...</p>
              ) : budgets.length === 0 ? (
                <Card.Text>
                  <p>Nie masz jeszcze żadnych aktywnych budżetów.</p>
                  <p>Dodaj swój pierwszy budżet, aby rozpocząć śledzenie wydatków.</p>
                </Card.Text>
              ) : (
                <div>
                  {budgets.map(budget => (
                    <div key={budget._id} className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <Link to={`/budgets/${budget._id}`}>
                          <strong>{budget.name}</strong>
                        </Link>
                        <span>
                          {budget.progress ? 
                            `${formatCurrency(budget.totalSpent)} / ${formatCurrency(budget.totalLimit)}` : 
                            formatCurrency(budget.totalLimit)
                          }
                        </span>
                      </div>
                      {budget.progress && (
                        <BudgetProgressBar
                          spent={budget.totalSpent}
                          amount={budget.totalLimit}
                          warningThreshold={budget.notificationThreshold}
                        />
                      )}
                      <small className="text-muted">{budget.categories[0]?.categoryName || 'Nieznana kategoria'}</small>
                    </div>
                  ))}
                  
                  {unreadCount > 0 && (
                    <Alert variant="warning" className="mt-3 mb-0">
                      <i className="bi bi-bell-fill me-2"></i>
                      Masz {unreadCount} nieprzeczytanych powiadomień
                      <div className="mt-2">
                        <Link to="/notifications" className="btn btn-sm btn-outline-primary">
                          Zobacz powiadomienia
                        </Link>
                      </div>
                    </Alert>
                  )}
                </div>
              )}
            </Card.Body>
            <Card.Footer>
              <Link to="/budgets" className="btn btn-sm btn-primary">Zarządzaj budżetami</Link>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
