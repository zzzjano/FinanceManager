import React, { useState } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { createCategory } from '../services/categoryService';
import CategoryForm from '../components/CategoryForm';

const NewCategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Sprawdzamy czy jesteśmy w trybie dodawania podkategorii
  const parentId = location.state?.parentId || '';
  const parentType = location.state?.parentType || 'expense';
  
  // Przygotowanie początkowych danych dla formularza
  const initialCategory = {
    parent: parentId,
    type: parentType
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      setSaving(true);
      const response = await createCategory(categoryData);
      const newCategoryId = response.data.category._id;
      navigate(`/categories/${newCategoryId}`);
    } catch (err) {
      console.error('Error creating category:', err);
      setError('Nie udało się utworzyć kategorii. Spróbuj ponownie później.');
      setSaving(false);
    }
  };

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>{parentId ? 'Dodaj podkategorię' : 'Dodaj nową kategorię'}</h1>
          <p className="lead">
            {parentId 
              ? 'Utwórz nową podkategorię dla istniejącej kategorii.' 
              : 'Utwórz nową kategorię dla przychodów lub wydatków.'}
          </p>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col md={8}>
          <CategoryForm 
            category={initialCategory}
            onSubmit={handleCreateCategory} 
            isLoading={saving}
          />
        </Col>
        <Col md={4}>
          <div className="bg-light p-4 rounded">
            <h5>Wskazówki</h5>
            <ul>
              <li>Wybierz odpowiedni typ kategorii - przychód lub wydatek.</li>
              <li>Ustaw charakterystyczny kolor, który pomoże Ci łatwo identyfikować tę kategorię na wykresach.</li>
              <li>Wybierz ikonę, która będzie reprezentować tę kategorię.</li>
              <li>Możesz utworzyć hierarchię kategorii poprzez wybór kategorii nadrzędnej.</li>
              <li>Kategorie mogą mieć wiele poziomów podkategorii dla dokładniejszej analizy wydatków.</li>
            </ul>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default NewCategory;
