import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getTransactionById, updateTransaction } from '../services/transactionService';
import TransactionForm from '../components/TransactionForm';
import Loading from '../components/Loading';

const EditTransaction = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setLoading(true);
        const response = await getTransactionById(id);
        setTransaction(response.data.transaction);
      } catch (err) {
        console.error(`Error fetching transaction with ID ${id}:`, err);
        
        if (err.response?.status === 404) {
          setError('Transakcja nie została znaleziona.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Wystąpił błąd podczas pobierania danych transakcji.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [id]);

  const handleUpdateTransaction = async (transactionData) => {
    try {
      setSaving(true);
      setError('');
      
      await updateTransaction(id, transactionData);
      
      navigate(`/transactions/${id}`, { 
        replace: true,
        state: { 
          message: 'Transakcja została pomyślnie zaktualizowana.', 
          type: 'success' 
        }
      });
    } catch (err) {
      console.error(`Error updating transaction with ID ${id}:`, err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Wystąpił błąd podczas aktualizacji transakcji. Spróbuj ponownie później.');
      }
      
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error && !transaction) {
    return (
      <Container>
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>Edycja transakcji</h1>
          <p className="lead">
            Edytuj dane transakcji
          </p>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <Row>
        <Col md={8}>
          {transaction && (
            <TransactionForm 
              transaction={transaction} 
              onSubmit={handleUpdateTransaction} 
              isLoading={saving}
            />
          )}
        </Col>
        <Col md={4}>
          <div className="bg-light p-4 rounded">
            <h5>Informacja</h5>
            <p>Podczas edycji transakcji:</p>
            <ul>
              <li>Jeśli zmienisz kwotę lub typ, saldo konta zostanie odpowiednio zaktualizowane</li>
              <li>Jeśli zmienisz konto, poprzednie konto zostanie skorygowane, a nowe obciążone</li>
              <li>Historia zmian transakcji jest przechowywana w systemie</li>
            </ul>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default EditTransaction;
