import React, { useState, useEffect } from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getScheduledTransactionById, updateScheduledTransaction } from '../services/scheduledTransactionService';
import ScheduledTransactionForm from '../components/ScheduledTransactionForm';
import Loading from '../components/Loading';

const EditScheduledTransaction = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [scheduledTransaction, setScheduledTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch transaction data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getScheduledTransactionById(id);
        setScheduledTransaction(response.data.scheduledTransaction);
      } catch (err) {
        console.error('Error fetching scheduled transaction:', err);
        setError('Nie udało się pobrać danych cyklicznej transakcji.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      setError('');
      
      await updateScheduledTransaction(id, formData);
      
      navigate(`/scheduled-transactions/${id}`, {
        state: {
          message: 'Cykliczna transakcja została zaktualizowana pomyślnie.',
          type: 'success'
        }
      });
    } catch (err) {
      console.error('Error updating scheduled transaction:', err);
      setError('Wystąpił błąd podczas aktualizacji cyklicznej transakcji. Sprawdź formularz i spróbuj ponownie.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error && !scheduledTransaction) {
    return (
      <Container>
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
        <div className="mt-3">
          <Button variant="primary" as={Link} to="/scheduled-transactions">
            Powrót do listy cyklicznych transakcji
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Edytuj cykliczną transakcję</h1>
        <div>
          <Button
            variant="outline-secondary"
            as={Link}
            to={`/scheduled-transactions/${id}`}
            className="me-2"
          >
            Anuluj
          </Button>
          <Button 
            variant="outline-secondary" 
            as={Link} 
            to="/scheduled-transactions"
          >
            Powrót do listy
          </Button>
        </div>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <ScheduledTransactionForm
        scheduledTransaction={scheduledTransaction}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </Container>
  );
};

export default EditScheduledTransaction;
