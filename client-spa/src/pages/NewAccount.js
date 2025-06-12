import React, { useState } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { createAccount } from '../services/accountService';
import AccountForm from '../components/AccountForm';

const NewAccount = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateAccount = async (accountData) => {
    try {
      setLoading(true);
      await createAccount(accountData);
      navigate('/accounts', { state: { success: 'Konto zostało utworzone pomyślnie!' } });
    } catch (err) {
      console.error('Error creating account:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Nie udało się utworzyć konta. Spróbuj ponownie później.');
      }
      
      setLoading(false);
    }
  };

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>Utwórz nowe konto</h1>
          <p className="lead">
            Wypełnij formularz, aby dodać nowe konto finansowe.
          </p>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <Row>
        <Col md={8}>
          <AccountForm 
            onSubmit={handleCreateAccount} 
            isLoading={loading}
          />
        </Col>
        <Col md={4}>
          <div className="bg-light p-4 rounded">
            <h5>Wskazówki</h5>
            <ul>
              <li>Dodaj wszystkie swoje konta, aby mieć pełen obraz swoich finansów</li>
              <li>Dla kart kredytowych, wprowadź limit jako ujemne saldo</li>
              <li>Możesz później dodawać transakcje do swoich kont</li>
              <li>Konta nieaktywne nie będą pokazywane w raportach</li>
            </ul>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default NewAccount;
