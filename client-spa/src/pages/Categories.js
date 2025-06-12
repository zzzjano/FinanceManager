import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Alert, Badge, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getCategories } from '../services/categoryService';
import Loading from '../components/Loading';
import { useUserPreferences } from '../context/UserPreferencesContext';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ type: '', isActive: '' });
  const [expandedCategories, setExpandedCategories] = useState({});
  
  const { getCurrentLanguageName, getCurrentCurrencySymbol } = useUserPreferences();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        // Apply only non-empty filters
        const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== '') acc[key] = value;
          return acc;
        }, {});
        
        const response = await getCategories(activeFilters);
        const categoriesData = response.data.categories || [];
        
        // Organizacja kategorii w hierarchiczną strukturę
        const organizeCategories = (cats) => {
          // Mapowanie kategorii po ID dla łatwego dostępu
          const categoryMap = {};
          cats.forEach(cat => {
            categoryMap[cat._id] = { ...cat, subcategories: [] };
          });
          
          // Tworzenie drzewa kategorii
          const rootCategories = [];
          cats.forEach(cat => {
            if (cat.parent && categoryMap[cat.parent]) {
              categoryMap[cat.parent].subcategories.push(categoryMap[cat._id]);
            } else {
              rootCategories.push(categoryMap[cat._id]);
            }
          });
          
          return rootCategories;
        };
        
        setCategories(organizeCategories(categoriesData));
        
        // Domyślnie rozwinięte wszystkie kategorie główne
        const defaultExpanded = {};
        categoriesData.forEach(cat => {
          if (!cat.parent) {
            defaultExpanded[cat._id] = true;
          }
        });
        setExpandedCategories(defaultExpanded);
        
        setError('');
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Nie udało się pobrać listy kategorii. Spróbuj ponownie później.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const toggleCategoryExpand = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const renderCategoryIcon = (icon, color) => {
    // Simple icon rendering - could be expanded with actual icons
    return (
      <span className="category-icon" style={{ 
        backgroundColor: color, 
        display: 'inline-block', 
        width: '20px', 
        height: '20px', 
        borderRadius: '50%',
        marginRight: '8px'
      }}></span>
    );
  };

  // Komponent do renderowania pojedynczego wiersza kategorii z podkategoriami
  const CategoryRow = ({ category, level = 0 }) => {
    const hasSubcategories = category.subcategories?.length > 0;
    const isExpanded = expandedCategories[category._id];
    
    return (
      <>
        <tr>
          <td>
            <div className="d-flex align-items-center">
              <div style={{ width: `${level * 20}px` }}></div>
              
              {hasSubcategories && (
                <Button 
                  variant="link" 
                  className="p-0 me-2" 
                  onClick={() => toggleCategoryExpand(category._id)}
                  style={{ fontSize: '1.2rem', textDecoration: 'none' }}
                >
                  {isExpanded ? '−' : '+'}
                </Button>
              )}
              
              {!hasSubcategories && level > 0 && <div style={{ width: '1.8rem' }}></div>}
              
              {renderCategoryIcon(category.icon, category.color)}
              {category.name}
              
              {hasSubcategories && (
                <Badge bg="info" className="ms-2">
                  {category.subcategories.length} podkategorii
                </Badge>
              )}
            </div>
          </td>
          <td>
            <Badge bg={category.type === 'income' ? 'success' : 'danger'}>
              {category.type === 'income' ? 'Przychód' : 'Wydatek'}
            </Badge>
          </td>
          <td>
            <Badge bg={category.isActive ? 'success' : 'secondary'}>
              {category.isActive ? 'Aktywna' : 'Nieaktywna'}
            </Badge>
          </td>
          <td>
            <Link to={`/categories/${category._id}`} className="btn btn-sm btn-info me-2">
              Podgląd
            </Link>
            <Link to={`/categories/${category._id}/edit`} className="btn btn-sm btn-primary me-2">
              Edytuj
            </Link>
            <Link to={`/categories/new`} state={{ parentId: category._id, parentType: category.type }} className="btn btn-sm btn-success">
              Dodaj podkategorię
            </Link>
          </td>
        </tr>
        {/* Renderowanie podkategorii z większym wcięciem tylko jeśli kategoria jest rozwinięta */}
        {hasSubcategories && isExpanded && category.subcategories.map(subcategory => (
          <CategoryRow key={subcategory._id} category={subcategory} level={level + 1} />
        ))}
      </>
    );
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>Kategorie</h1>
          <p className="lead">
            Zarządzaj kategoriami przychodów i wydatków. Możesz tworzyć podkategorie dla lepszej organizacji.
          </p>
        </Col>
        <Col xs="auto" className="d-flex align-items-center">
          <Link to="/categories/new" className="btn btn-primary">
            Dodaj nową kategorię
          </Link>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Filtry</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Typ kategorii</Form.Label>
                <Form.Select 
                  name="type" 
                  value={filters.type}
                  onChange={handleFilterChange}
                >
                  <option value="">Wszystkie</option>
                  <option value="expense">Wydatki</option>
                  <option value="income">Przychody</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select 
                  name="isActive" 
                  value={filters.isActive}
                  onChange={handleFilterChange}
                >
                  <option value="">Wszystkie</option>
                  <option value="true">Aktywne</option>
                  <option value="false">Nieaktywne</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <Button 
                variant="outline-secondary"
                className="mb-3"
                onClick={() => {
                  // Przełącz rozwinięcie wszystkich kategorii
                  const allCategoryIds = {};
                  const collectAllIds = (cats, expand) => {
                    cats.forEach(cat => {
                      allCategoryIds[cat._id] = expand;
                      if (cat.subcategories?.length) {
                        collectAllIds(cat.subcategories, expand);
                      }
                    });
                  };
                  
                  // Sprawdź, czy wszystkie są rozwinięte
                  const allExpanded = categories.every(cat => expandedCategories[cat._id]);
                  collectAllIds(categories, !allExpanded);
                  
                  setExpandedCategories(allCategoryIds);
                }}
              >
                {Object.values(expandedCategories).every(Boolean) ? 'Zwiń wszystkie' : 'Rozwiń wszystkie'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          {categories.length === 0 ? (
            <p className="text-center my-4">
              Nie znaleziono kategorii odpowiadających podanym kryteriom.
            </p>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Typ</th>
                  <th>Status</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <CategoryRow key={category._id} category={category} />
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Categories;
