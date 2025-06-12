import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/userService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [resetUrl, setResetUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    setResetUrl(null);

    try {
      const response = await forgotPassword(email);
      setMessage(response.message);
      
      // In a real application, we wouldn't show the reset URL directly
      // This is just for demonstration purposes since we're not sending emails
      if (response.resetUrl) {
        setResetUrl(response.resetUrl);
      }
      
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Wystąpił błąd. Spróbuj ponownie później.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="mt-5">
      <Card className="mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Body>
          <h2 className="text-center mb-4">Zresetuj swoje hasło</h2>
          
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Adres email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Wpisz swój adres email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                Prześlemy Ci link do zresetowania hasła.
              </Form.Text>
            </Form.Group>
            
            <Button
              variant="primary"
              type="submit"
              className="w-100 mt-3"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Przetwarzanie...' : 'Zresetuj hasło'}
            </Button>
          </Form>
          
          {resetUrl && (
            <Alert variant="info" className="mt-3">
              <p>Link do resetowania hasła (na potrzeby demonstracji):</p>
              <Alert.Link href={resetUrl}>{resetUrl}</Alert.Link>
            </Alert>
          )}
          
          <div className="text-center mt-3">
            <Link to="/login">Wróć do strony logowania</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ForgotPassword;
