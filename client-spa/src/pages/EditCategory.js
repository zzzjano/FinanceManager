import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getCategoryById, updateCategory } from '../services/categoryService';
import CategoryForm from '../components/CategoryForm';
import Loading from '../components/Loading';

const EditCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);
        const response = await getCategoryById(id);
        setCategory(response.data.category);
      } catch (err) {
        console.error(`Error fetching category with ID ${id}:`, err);
        setError('Nie udało się pobrać danych kategorii. Spróbuj ponownie później.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id]);

  const handleUpdateCategory = async (updatedData) => {
    try {
      setSaving(true);
      await updateCategory(id, updatedData);
      navigate(`/categories/${id}`);
    } catch (err) {
      console.error(`Error updating category with ID ${id}:`, err);
      setError('Nie udało się zaktualizować kategorii. Spróbuj ponownie później.');
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error && !category) {
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
          <h1>Edycja kategorii</h1>
          <p className="lead">
            Zaktualizuj informacje o kategorii {category?.name}.
          </p>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <Row>
        <Col md={8}>
          {category && (
            <CategoryForm 
              category={category} 
              onSubmit={handleUpdateCategory} 
              isLoading={saving}
            />
          )}
        </Col>
        <Col md={4}>
          <div className="bg-light p-4 rounded">
            <h5>Wskazówki</h5>
            <ul>
              <li>Możesz zmienić nazwę, kolor i ikonę kategorii w dowolnym momencie.</li>
              <li>Zamiast usuwać nieużywane kategorie, rozważ zmianę ich statusu na "nieaktywne".</li>
              <li>Zmiana typu kategorii (przychód/wydatek) może wpłynąć na raporty i statystyki.</li>
            </ul>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default EditCategory;
