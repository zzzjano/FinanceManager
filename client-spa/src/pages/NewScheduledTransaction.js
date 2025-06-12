import React, { useState } from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { createScheduledTransaction } from '../services/scheduledTransactionService';
import ScheduledTransactionForm from '../components/ScheduledTransactionForm';

const NewScheduledTransaction = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      setError('');
      
      const response = await createScheduledTransaction(formData);
      
      navigate(`/scheduled-transactions/${response.data.scheduledTransaction._id}`, {
        state: {
          message: 'Cykliczna transakcja została utworzona pomyślnie.',
          type: 'success'
        }
      });
    } catch (err) {
      console.error('Error creating scheduled transaction:', err);
      setError('Wystąpił błąd podczas tworzenia cyklicznej transakcji. Sprawdź formularz i spróbuj ponownie.');
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Nowa cykliczna transakcja</h1>
        <Button 
          variant="outline-secondary" 
          as={Link} 
          to="/scheduled-transactions"
        >
          Powrót do listy
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <ScheduledTransactionForm 
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </Container>
  );
};

export default NewScheduledTransaction;
