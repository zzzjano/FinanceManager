import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/userService';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    // Validate that token is present
    if (!token) {
      setError('Link resetowania hasła jest nieprawidłowy.');
    }
  }, [token]);

  const validatePassword = () => {
    // Clear previous errors
    setPasswordError(null);

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError('Hasła nie są identyczne.');
      return false;
    }

    // Check password strength (at least 8 characters with numbers and letters)
    if (newPassword.length < 8) {
      setPasswordError('Hasło musi mieć co najmniej 8 znaków.');
      return false;
    }

    if (!/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      setPasswordError('Hasło musi zawierać co najmniej jedną literę i jedną cyfrę.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await resetPassword(token, newPassword);
      setMessage(response.message);
      
      // Clear form fields
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Wystąpił błąd podczas resetowania hasła.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="mt-5">
      <Card className="mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Body>
          <h2 className="text-center mb-4">Ustaw nowe hasło</h2>
          
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          
          {!error && (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Nowe hasło</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Wpisz nowe hasło"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Potwierdź nowe hasło</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Potwierdź nowe hasło"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Form.Group>
              
              {passwordError && (
                <Alert variant="danger">{passwordError}</Alert>
              )}
              
              <Button
                variant="primary"
                type="submit"
                className="w-100 mt-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Przetwarzanie...' : 'Ustaw nowe hasło'}
              </Button>
            </Form>
          )}
          
          <div className="text-center mt-3">
            <Link to="/login">Wróć do strony logowania</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ResetPassword;
