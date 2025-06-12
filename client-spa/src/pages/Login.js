import React, { useEffect } from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useKeycloak } from '../context/KeycloakContext';

const Login = () => {
  const { login, authenticated } = useKeycloak();
  const navigate = useNavigate();

  useEffect(() => {
    if (authenticated) {
      navigate('/dashboard');
    }
  }, [authenticated, navigate]);

  return (
    <Container className="login-container">
      <Card className="login-card">
        <Card.Body className="text-center">
          <h2 className="mb-4">Zaloguj się do Finance Manager</h2>
          <p className="mb-4">
            Aby korzystać z aplikacji Finance Manager, zaloguj się przy pomocy swojego konta.
          </p>          
          <Button variant="primary" size="lg" onClick={login} className="w-100 mb-3">
            Zaloguj się
          </Button>
          <div className="mt-3 d-flex justify-content-between">
            <Link to="/forgot-password">Zapomniałeś hasła?</Link>
            <Link to="/register">Zarejestruj się</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
