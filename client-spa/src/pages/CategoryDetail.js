import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Badge, Button, Table } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCategoryById, deleteCategory, getCategories } from '../services/categoryService';
import Loading from '../components/Loading';

const CategoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [parentCategory, setParentCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    const fetchCategoryWithRelations = async () => {
      try {
        setLoading(true);
        const response = await getCategoryById(id);
        const categoryData = response.data.category;
        setCategory(categoryData);

        // Fetch parent category if exists
        if (categoryData.parent) {
          try {
            const parentResponse = await getCategoryById(categoryData.parent);
            setParentCategory(parentResponse.data.category);
          } catch (err) {
            console.error(`Error fetching parent category:`, err);
          }
        }

        // Fetch subcategories
        try {
          const allCategoriesResponse = await getCategories({ type: categoryData.type });
          const allCategories = allCategoriesResponse.data.categories || [];
          const children = allCategories.filter(cat => cat.parent === id);
          setSubcategories(children);
        } catch (err) {
          console.error(`Error fetching subcategories:`, err);
        }
        
      } catch (err) {
        console.error(`Error fetching category with ID ${id}:`, err);
        setError('Nie udało się pobrać szczegółów kategorii. Spróbuj ponownie później.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryWithRelations();
  }, [id]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteCategory(id);
      navigate('/categories', { replace: true });
    } catch (err) {
      console.error(`Error deleting category with ID ${id}:`, err);
      setError('Nie udało się usunąć kategorii. Spróbuj ponownie później.');
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const renderCategoryIcon = (icon, color) => {
    // Simple icon rendering - could be expanded with actual icons
    return (
      <div className="category-icon" style={{ 
        backgroundColor: color, 
        display: 'inline-block', 
        width: '40px', 
        height: '40px', 
        borderRadius: '50%',
        marginRight: '10px'
      }}></div>
    );
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
        <Button as={Link} to="/categories" variant="secondary">
          Wróć do listy kategorii
        </Button>
      </Container>
    );
  }

  return (
    <Container>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-4">
        <Col>
          <h1 className="d-flex align-items-center">
            {category && renderCategoryIcon(category.icon, category.color)}
            {category?.name}
          </h1>
        </Col>
        <Col xs="auto" className="d-flex align-items-center">
          <Link to={`/categories/${id}/edit`} className="btn btn-primary me-2">
            Edytuj kategorię
          </Link>
          <Link to={`/categories/new`} state={{ parentId: id, parentType: category?.type }} className="btn btn-success me-2">
            Dodaj podkategorię
          </Link>
          {!showConfirmDelete ? (
            <Button 
              variant="danger" 
              onClick={() => setShowConfirmDelete(true)}
              disabled={deleting}
            >
              Usuń kategorię
            </Button>
          ) : (
            <div className="d-flex">
              <Button 
                variant="outline-secondary"
                onClick={() => setShowConfirmDelete(false)}
                disabled={deleting}
                className="me-2"
              >
                Anuluj
              </Button>
              <Button 
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Usuwanie...' : 'Potwierdź usunięcie'}
              </Button>
            </div>
          )}
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Szczegóły kategorii</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Nazwa:</strong>
                  <p>{category?.name}</p>
                </Col>
                <Col md={6}>
                  <strong>Typ:</strong>
                  <p>
                    <Badge bg={category?.type === 'income' ? 'success' : 'danger'}>
                      {category?.type === 'income' ? 'Przychód' : 'Wydatek'}
                    </Badge>
                  </p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Kolor:</strong>
                  <p>
                    <span className="d-inline-block me-2" style={{ 
                      backgroundColor: category?.color, 
                      width: '20px', 
                      height: '20px',
                      verticalAlign: 'middle'
                    }}></span>
                    {category?.color}
                  </p>
                </Col>
                <Col md={6}>
                  <strong>Ikona:</strong>
                  <p>{category?.icon}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Status:</strong>
                  <p>
                    <Badge bg={category?.isActive ? 'success' : 'secondary'}>
                      {category?.isActive ? 'Aktywna' : 'Nieaktywna'}
                    </Badge>
                  </p>
                </Col>
                <Col md={6}>
                  <strong>Data utworzenia:</strong>
                  <p>{new Date(category?.createdAt).toLocaleDateString()}</p>
                </Col>
              </Row>
              
              {parentCategory && (
                <Row className="mb-3">
                  <Col>
                    <strong>Kategoria nadrzędna:</strong>
                    <p>
                      <Link to={`/categories/${parentCategory._id}`}>
                        <span className="d-inline-block me-2" style={{ 
                          backgroundColor: parentCategory.color, 
                          width: '15px', 
                          height: '15px',
                          verticalAlign: 'middle',
                          borderRadius: '50%'
                        }}></span>
                        {parentCategory.name}
                      </Link>
                    </p>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Hierarchia</h5>
            </Card.Header>
            <Card.Body>
              {!parentCategory && !subcategories.length ? (
                <p className="text-muted">Ta kategoria nie ma powiązań hierarchicznych.</p>
              ) : (
                <ul className="hierarchy-tree">
                  {parentCategory && (
                    <li>
                      <Link to={`/categories/${parentCategory._id}`}>
                        <strong>{parentCategory.name}</strong>
                      </Link>
                      <ul>
                        <li className="active">
                          <strong>{category.name}</strong>
                          
                          {subcategories.length > 0 && (
                            <ul>
                              {subcategories.map(subcat => (
                                <li key={subcat._id}>
                                  <Link to={`/categories/${subcat._id}`}>
                                    {subcat.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      </ul>
                    </li>
                  )}
                  
                  {!parentCategory && subcategories.length > 0 && (
                    <li className="active">
                      <strong>{category.name}</strong>
                      <ul>
                        {subcategories.map(subcat => (
                          <li key={subcat._id}>
                            <Link to={`/categories/${subcat._id}`}>
                              {subcat.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {subcategories.length > 0 && (
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">Podkategorie ({subcategories.length})</h5>
          </Card.Header>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Status</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {subcategories.map(subcat => (
                  <tr key={subcat._id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <span className="d-inline-block me-2" style={{ 
                          backgroundColor: subcat.color, 
                          width: '15px', 
                          height: '15px',
                          borderRadius: '50%'
                        }}></span>
                        {subcat.name}
                      </div>
                    </td>
                    <td>
                      <Badge bg={subcat.isActive ? 'success' : 'secondary'}>
                        {subcat.isActive ? 'Aktywna' : 'Nieaktywna'}
                      </Badge>
                    </td>
                    <td>
                      <Link to={`/categories/${subcat._id}`} className="btn btn-sm btn-info me-2">
                        Podgląd
                      </Link>
                      <Link to={`/categories/${subcat._id}/edit`} className="btn btn-sm btn-primary">
                        Edytuj
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default CategoryDetail;
