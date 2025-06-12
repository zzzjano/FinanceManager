import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

const Loading = () => {
  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
      <div className="text-center">
        <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }} />
        <h4 className="mt-3">Ładowanie...</h4>
      </div>
    </Container>
  );
};

export default Loading;
