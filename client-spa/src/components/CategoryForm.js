import React, { useState, useEffect } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../services/categoryService';

const CategoryForm = ({ category = {}, onSubmit, isLoading }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: category.name || '',
    type: category.type || 'expense',
    color: category.color || '#000000',
    icon: category.icon || 'default-icon',
    isActive: category.isActive !== false, // default to true
    parent: category.parent || ''
  });
  const [errors, setErrors] = useState({});
  const [availableParentCategories, setAvailableParentCategories] = useState([]);
  const [hierarchicalCategories, setHierarchicalCategories] = useState([]);

  // Pobieranie dostępnych kategorii nadrzędnych
  useEffect(() => {
    const fetchParentCategories = async () => {
      try {
        // Pobieramy kategorie z tego samego typu (przychód/wydatek)
        const response = await getCategories({ type: formData.type });
        // Filtrujemy, aby nie pokazywać bieżącej kategorii jako rodzica (w przypadku edycji)
        // i nie pokazujemy podkategorii bieżącej kategorii (aby uniknąć cykli)
        const filteredCategories = response.data.categories.filter(
          cat => (!category._id || cat._id !== category._id) && 
                 (!category._id || !isChildOf(cat, category._id))
        );
        setAvailableParentCategories(filteredCategories);
        
        // Organizacja kategorii w hierarchię dla lepszego wyświetlania
        const hierarchy = createHierarchy(filteredCategories);
        setHierarchicalCategories(hierarchy);
      } catch (error) {
        console.error('Błąd podczas pobierania dostępnych kategorii:', error);
      }
    };

    fetchParentCategories();
  }, [formData.type, category._id]);

  // Sprawdza czy dana kategoria jest potomkiem wskazanej kategorii
  const isChildOf = (category, parentId) => {
    if (!category.parent) return false;
    if (category.parent === parentId) return true;
    
    // Znajdź rodzica i sprawdź rekurencyjnie
    const parent = availableParentCategories.find(cat => cat._id === category.parent);
    return parent ? isChildOf(parent, parentId) : false;
  };

  // Tworzy hierarchiczną strukturę kategorii do wyświetlenia w dropdown
  const createHierarchy = (categories) => {
    // Mapowanie kategorii po ID
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id] = { ...cat, children: [] };
    });
    
    // Budowanie drzewa
    const rootCategories = [];
    categories.forEach(cat => {
      if (cat.parent && categoryMap[cat.parent]) {
        categoryMap[cat.parent].children.push(categoryMap[cat._id]);
      } else {
        rootCategories.push(categoryMap[cat._id]);
      }
    });
    
    return rootCategories;
  };

  // Renderuje opcje kategorii z wcięciem dla podkategorii
  const renderCategoryOptions = (categories, level = 0) => {
    return categories.flatMap(cat => [
      <option key={cat._id} value={cat._id}>
        {'\u00A0'.repeat(level * 4)}{level > 0 ? '└─ ' : ''}{cat.name}
      </option>,
      ...renderCategoryOptions(cat.children || [], level + 1)
    ]);
  };

  const categoryTypes = [
    { value: 'expense', label: 'Wydatek' },
    { value: 'income', label: 'Przychód' }
  ];

  // Available icons (simplified version)
  const categoryIcons = [
    'default-icon', 'food', 'transport', 'entertainment', 'shopping',
    'home', 'bills', 'health', 'education', 'salary', 'investment'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nazwa kategorii jest wymagana';
    }
    
    if (!formData.type) {
      newErrors.type = 'Typ kategorii jest wymagany';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Create a copy of the form data to clean up
      const formDataToSubmit = { ...formData };
      
      // Convert empty parent string to null to avoid MongoDB ObjectId casting errors
      if (formDataToSubmit.parent === '') {
        formDataToSubmit.parent = null;
      }
      
      onSubmit(formDataToSubmit);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Nazwa kategorii</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              isInvalid={!!errors.name}
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.name}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Typ kategorii</Form.Label>
            <Form.Select
              name="type"
              value={formData.type}
              onChange={handleChange}
              isInvalid={!!errors.type}
              disabled={isLoading}
            >
              {categoryTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {errors.type}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Kolor</Form.Label>
            <div className="d-flex align-items-center">
              <Form.Control
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                disabled={isLoading}
                style={{ width: '50px', height: '40px' }}
              />
              <span className="ms-2">{formData.color}</span>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Ikona</Form.Label>
            <Form.Select
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              disabled={isLoading}
            >
              {categoryIcons.map(icon => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Aktywna"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              disabled={isLoading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Kategoria nadrzędna (opcjonalnie)</Form.Label>
            <Form.Select
              name="parent"
              value={formData.parent}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="">-- Brak (kategoria główna) --</option>
              {renderCategoryOptions(hierarchicalCategories)}
            </Form.Select>
            <Form.Text className="text-muted">
              Wybierz kategorię nadrzędną, aby utworzyć podkategorię. Hierarchia może mieć wiele poziomów.
            </Form.Text>
          </Form.Group>

          <div className="d-flex justify-content-between">
            <Button
              variant="secondary"
              onClick={() => navigate('/categories')}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Zapisywanie...' : (category._id ? 'Zaktualizuj kategorię' : 'Dodaj kategorię')}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default CategoryForm;
