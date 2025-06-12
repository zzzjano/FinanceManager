import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, Button, Table, Alert } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as budgetService from '../services/budgetService';
import * as transactionService from '../services/transactionService';
import BudgetProgressBar from '../components/BudgetProgressBar';
import Loading from '../components/Loading';
import { useUserPreferences } from '../context/UserPreferencesContext';

const BudgetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [budgetProgress, setBudgetProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { formatCurrency } = useUserPreferences();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [budgetData, progressData] = await Promise.all([
          budgetService.getBudgetById(id),
          budgetService.getBudgetProgress(id)
        ]);
        
        setBudget(budgetData.data.budget);
        setBudgetProgress(progressData.data);
        
        setError(null);
      } catch (err) {
        setError('Nie udało się pobrać szczegółów budżetu. Spróbuj ponownie.');
        console.error('Error fetching budget details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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
    if (!dateString) return 'Nie określono';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pl-PL').format(date);
  };

  const handleDeleteBudget = async () => {
    if (window.confirm('Czy na pewno chcesz usunąć ten budżet?')) {
      try {
        await budgetService.deleteBudget(id);
        navigate('/budgets');
      } catch (error) {
        console.error('Error deleting budget:', error);
        // Handle error (show notification, etc.)
      }
    }
  };

  return (
    <Container>
      {loading && <Loading />}
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {!loading && budget && (
        <>
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <h2>{budget.name}</h2>
              <p className="text-muted mb-0">
                {getBudgetPeriodText(budget)} | {budget.categories[0].categoryName || 'Brak kategorii'}
              </p>
            </div>
            <div className="d-flex gap-2">
              <Link to={`/budgets/${id}/edit`}>
                <Button variant="outline-primary">Edytuj</Button>
              </Link>
              <Button variant="outline-danger" onClick={handleDeleteBudget}>
                Usuń
              </Button>
            </div>
          </div>
          
          <Row className="mb-4">
            <Col md={8}>
              <Card>
                <Card.Body>
                  <h4 className="mb-3">Postęp budżetu</h4>
                  {budgetProgress ? (
                    <div>
                      <Row className="mb-3">
                        <Col>
                          <div className="d-flex justify-content-between mb-1">
                            <span>Wydano: {formatCurrency(budgetProgress.totalProgress.spent)}</span>
                            <span>Limit: {formatCurrency(budgetProgress.totalProgress.limit)}</span>
                          </div>
                          <BudgetProgressBar
                            spent={budgetProgress.totalProgress.spent}
                            amount={budgetProgress.totalProgress.limit}
                            warningThreshold={budget.notificationThreshold}
                          />
                        </Col>
                      </Row>
                      <Row>
                        <Col>
                          <p>
                            <strong>Pozostało: </strong>
                            <span className={budgetProgress.remaining < 0 ? 'text-danger' : ''}>
                              {formatCurrency(budgetProgress.totalProgress.remaining)}
                            </span>
                          </p>
                        </Col>
                      </Row>
                    </div>
                  ) : (
                    <p>Brak danych o wykorzystaniu budżetu</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card>
                <Card.Body>
                  <h4 className="mb-3">Szczegóły</h4>
                  <p>
                    <strong>Status: </strong>
                    {budget.isActive ? (
                      <Badge bg="success">Aktywny</Badge>
                    ) : (
                      <Badge bg="secondary">Nieaktywny</Badge>
                    )}
                  </p>
                  <p>
                    <strong>Okres: </strong> {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
                  </p>
                  <p>
                    <strong>Próg ostrzeżeń: </strong> {budget.notificationThreshold}%
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default BudgetDetail;
