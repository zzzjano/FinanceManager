import React from 'react';
import { Container, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import BudgetForm from '../components/BudgetForm';
import * as budgetService from '../services/budgetService';

const NewBudget = () => {
  const navigate = useNavigate();

  const handleSubmit = async (budgetData) => {
    try {
      await budgetService.createBudget(budgetData);
      navigate('/budgets');
    } catch (error) {
      console.error('Error creating budget:', error);
      // Handle error (show notification, etc.)
    }
  };

  return (
    <Container>
      <h2>Dodaj nowy budżet</h2>
      <Card>
        <Card.Body>
          <BudgetForm onSubmit={handleSubmit} buttonText="Dodaj budżet" />
        </Card.Body>
      </Card>
    </Container>
  );
};

export default NewBudget;
