import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { firstName, lastName, email, username, password, confirmPassword } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!firstName || !lastName || !email || !username || !password || !confirmPassword) {
      setError('Wszystkie pola są wymagane');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne');
      return false;
    }

    // Podstawowa walidacja email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Podaj prawidłowy adres email');
      return false;
    }

    // Walidacja hasła (min 8 znaków, litera, cyfra)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('Hasło musi zawierać minimum 8 znaków, w tym literę i cyfrę');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await axios.post('http://localhost:3001/api/users/register', {
        firstName,
        lastName,
        email,
        username,
        password
      });
      
      setSuccess(true);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
      });
      
      // Przekieruj na stronę logowania po 2 sekundach
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      console.error('Error during registration:', err);
      
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Wystąpił błąd podczas rejestracji. Spróbuj ponownie później.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="login-container">
      <Card className="login-card">
        <Card.Body>
          <h2 className="text-center mb-4">Rejestracja w Finance Manager</h2>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Rejestracja zakończona pomyślnie! Za chwilę zostaniesz przekierowany na stronę logowania.</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Imię</Form.Label>
              <Form.Control
                type="text"
                name="firstName"
                value={firstName}
                onChange={handleChange}
                placeholder="Podaj swoje imię"
                disabled={loading || success}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Nazwisko</Form.Label>
              <Form.Control
                type="text"
                name="lastName"
                value={lastName}
                onChange={handleChange}
                placeholder="Podaj swoje nazwisko"
                disabled={loading || success}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Adres email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={email}
                onChange={handleChange}
                placeholder="Podaj swój adres email"
                disabled={loading || success}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Nazwa użytkownika</Form.Label>
              <Form.Control
                type="text"
                name="username"
                value={username}
                onChange={handleChange}
                placeholder="Wybierz nazwę użytkownika"
                disabled={loading || success}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Hasło</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={password}
                onChange={handleChange}
                placeholder="Utwórz silne hasło"
                disabled={loading || success}
              />
              <Form.Text className="text-muted">
                Hasło musi zawierać minimum 8 znaków, w tym co najmniej jedną literę i jedną cyfrę.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label>Potwierdź hasło</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleChange}
                placeholder="Potwierdź swoje hasło"
                disabled={loading || success}
              />
            </Form.Group>
            
            <Button
              variant="primary"
              type="submit"
              className="w-100 mb-3"
              disabled={loading || success}
            >
              {loading ? 'Trwa rejestracja...' : 'Zarejestruj się'}
            </Button>
            
            <div className="text-center">
              Masz już konto? <Link to="/login">Zaloguj się</Link>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Register;
