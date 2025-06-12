import React, { useState } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { createTransaction } from '../services/transactionService';
import TransactionForm from '../components/TransactionForm';

const NewTransaction = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateTransaction = async (transactionData) => {
    try {
      setLoading(true);
      setError('');
      const response = await createTransaction(transactionData);
      
      // Navigate to the transaction details page or back to the transactions list
      navigate(`/transactions/${response.data.transaction._id}`, { 
        replace: true,
        state: { 
          message: 'Transakcja została pomyślnie utworzona.', 
          type: 'success' 
        }
      });
    } catch (err) {
      console.error('Error creating transaction:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Wystąpił błąd podczas tworzenia transakcji. Spróbuj ponownie później.');
      }
      
      setLoading(false);
    }
  };

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>Dodaj transakcję</h1>
          <p className="lead">
            Wprowadź dane nowej transakcji
          </p>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <Row>
        <Col md={8}>
          <TransactionForm 
            onSubmit={handleCreateTransaction} 
            isLoading={loading}
          />
        </Col>
        <Col md={4}>
          <div className="bg-light p-4 rounded">
            <h5>Wskazówki</h5>
            <ul>
              <li>Wybierz typ transakcji (przychód lub wydatek)</li>
              <li>Upewnij się, że wybrałeś właściwe konto</li>
              <li>Dodawaj kategorie, aby łatwiej analizować wydatki</li>
              <li>Użyj etykiet dla łatwiejszego wyszukiwania transakcji</li>
              <li>Dla transakcji cyklicznych zaznacz opcję "Transakcja cykliczna"</li>
            </ul>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default NewTransaction;
