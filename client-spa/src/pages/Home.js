import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useKeycloak } from '../context/KeycloakContext';

const Home = () => {
  const { authenticated, login } = useKeycloak();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (authenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <Container>
      <Row className="justify-content-center my-5">
        <Col md={8} className="text-center">
          <h1 className="display-4 mb-4">Finance Manager</h1>
          <p className="lead mb-5">
            Witaj w aplikacji Finance Manager! To kompleksowe narzędzie do zarządzania osobistymi finansami, 
            które pomoże Ci śledzić wydatki, zarządzać budżetem i osiągać Twoje cele finansowe.
          </p>
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleGetStarted}
            className="px-5 py-3"
          >
            {authenticated ? 'Przejdź do dashboardu' : 'Rozpocznij teraz'}
          </Button>
          { !authenticated && (
          <Button
            variant="link" 
            size="lg" 
            className="ms-3"
            onClick={() => navigate('/register')}
            >
            Zarejestruj się
            </Button>
            )}
        </Col>
      </Row>

      <Row className="my-5">
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="d-flex flex-column">
              <Card.Title>Zarządzaj swoimi kontami</Card.Title>
              <Card.Text>
                Łatwe zarządzanie wszystkimi kontami finansowymi w jednym miejscu.
                Monitoruj salda, śledź wydatki i zarządzaj budżetem.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="d-flex flex-column">
              <Card.Title>Śledzenie transakcji</Card.Title>
              <Card.Text>
                Kategoryzuj i śledź swoje wydatki i przychody. 
                Uzyskaj pełny wgląd w to, gdzie trafiają Twoje pieniądze.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="d-flex flex-column">
              <Card.Title>Raporty i analizy</Card.Title>
              <Card.Text>
                Generuj szczegółowe raporty i analizy swoich finansów.
                Podejmuj lepsze decyzje finansowe w oparciu o dane.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
