import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getAccountById, updateAccount } from '../services/accountService';
import AccountForm from '../components/AccountForm';
import Loading from '../components/Loading';

const EditAccount = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true);
        const response = await getAccountById(id);
        setAccount(response.data.account);
      } catch (err) {
        console.error(`Error fetching account with ID ${id}:`, err);
        
        if (err.response?.status === 404) {
          setError('Konto o podanym identyfikatorze nie zostało znalezione.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Nie udało się pobrać danych konta. Spróbuj ponownie później.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [id]);

  const handleUpdateAccount = async (accountData) => {
    try {
      setSaving(true);
      await updateAccount(id, accountData);
      navigate('/accounts', { state: { success: 'Dane konta zostały zaktualizowane pomyślnie!' } });
    } catch (err) {
      console.error(`Error updating account with ID ${id}:`, err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Nie udało się zaktualizować konta. Spróbuj ponownie później.');
      }
      
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error && !account) {
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
          <h1>Edycja konta</h1>
          <p className="lead">
            Zaktualizuj informacje o koncie {account?.name}.
          </p>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <Row>
        <Col md={8}>
          {account && (
            <AccountForm 
              account={account} 
              onSubmit={handleUpdateAccount} 
              isLoading={saving}
            />
          )}
        </Col>
        <Col md={4}>
          <div className="bg-light p-4 rounded">
            <h5>Informacja</h5>
            <p>Przy zmianie salda konta pamiętaj, że:</p>
            <ul>
              <li>Powinno ono odzwierciedlać rzeczywisty stan konta</li>
              <li>Każda transakcja będzie wpływać na saldo bieżące</li>
              <li>Zmiana salda nie jest transakcją i nie pojawi się w historii</li>
            </ul>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default EditAccount;
