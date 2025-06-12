import React, { useState, useEffect } from 'react';
import { Container, Card, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import BudgetForm from '../components/BudgetForm';
import * as budgetService from '../services/budgetService';
import Loading from '../components/Loading';

const EditBudget = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        setLoading(true);
        const data = await budgetService.getBudgetById(id);
        setBudget(data);
        setError(null);
      } catch (err) {
        setError('Nie udało się pobrać budżetu. Spróbuj ponownie.');
        console.error('Error fetching budget:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, [id]);

  const handleSubmit = async (budgetData) => {
    try {
      await budgetService.updateBudget(id, budgetData);
      navigate(`/budgets/${id}`);
    } catch (error) {
      console.error('Error updating budget:', error);
      // Handle error (show notification, etc.)
    }
  };

  return (
    <Container>
      <h2>Edytuj budżet</h2>
      
      {loading && <Loading />}
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {!loading && budget && (
        <Card>
          <Card.Body>
            <BudgetForm 
              budget={budget} 
              onSubmit={handleSubmit} 
              buttonText="Aktualizuj budżet" 
            />
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default EditBudget;
