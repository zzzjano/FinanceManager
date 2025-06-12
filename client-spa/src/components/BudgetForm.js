import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import * as categoryService from '../services/categoryService';

const BudgetForm = ({ budget = {}, onSubmit, buttonText = 'Zapisz' }) => {
  const navigate = useNavigate();
  console.log(budget);
  const [formData, setFormData] = useState({
    name: '',
    type: 'monthly',
    totalLimit: '', // Changed from amount
    startDate: '',
    endDate: '',
    categoryId: '',
    notificationThreshold: 80, // Changed from warningThreshold
    isActive: true
    // Removed: ...budget.data.budget (will be handled in useEffect)
  });
  const [categories, setCategories] = useState([]);
  const [validated, setValidated] = useState(false);

  // Effect to populate form when 'budget' prop changes or on initial load
  useEffect(() => {
    if (budget && budget.data && budget.data.budget) {
      const budgetDetails = budget.data.budget;
      setFormData({
        name: budgetDetails.name || '',
        type: budgetDetails.type || 'monthly',
        totalLimit: budgetDetails.totalLimit !== undefined ? String(budgetDetails.totalLimit) : '',
        startDate: budgetDetails.startDate ? new Date(budgetDetails.startDate).toISOString().split('T')[0] : '',
        endDate: budgetDetails.endDate ? new Date(budgetDetails.endDate).toISOString().split('T')[0] : '',
        categoryId: budgetDetails.categories && budgetDetails.categories.length > 0 ? budgetDetails.categories[0].categoryId : '',
        notificationThreshold: budgetDetails.notificationThreshold !== undefined ? budgetDetails.notificationThreshold : 80,
        isActive: budgetDetails.isActive !== undefined ? budgetDetails.isActive : true,
      });
    } else {
      // If no budget or invalid budget prop, reset to default initial state (for a new form)
      setFormData({
        name: '',
        type: 'monthly',
        totalLimit: '',
        startDate: '',
        endDate: '',
        categoryId: '',
        notificationThreshold: 80,
        isActive: true,
      });
    }
  }, [budget]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await categoryService.getCategories();
        setCategories(categoriesData.data.categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    const budgetData = {
      ...formData,
      totalLimit: parseFloat(formData.totalLimit), // Changed from amount
      notificationThreshold: parseInt(formData.notificationThreshold, 10) // Changed from warningThreshold
    };

    console.log(budgetData);
    
    await onSubmit(budgetData);
  };

  return (
    <Form noValidate validated={validated} onSubmit={handleSubmit}>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Nazwa budżetu</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <Form.Control.Feedback type="invalid">
              Nazwa budżetu jest wymagana
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Typ budżetu</Form.Label>
            <Form.Select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="monthly">Miesięczny</option>
              <option value="weekly">Tygodniowy</option>
              <option value="annual">Roczny</option>
              <option value="custom">Niestandardowy</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Kwota</Form.Label>
            <Form.Control
              type="number"
              name="totalLimit" // Changed from amount
              value={formData.totalLimit} // Ensured consistency
              onChange={handleChange}
              min="0"
              step="0.01"
              required
            />
            <Form.Control.Feedback type="invalid">
              Kwota budżetu jest wymagana
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Kategoria</Form.Label>
            <Form.Select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              required
            >
              <option value="">Wybierz kategorię</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              Kategoria jest wymagana
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Data rozpoczęcia</Form.Label>
            <Form.Control
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
            <Form.Control.Feedback type="invalid">
              Data rozpoczęcia jest wymagana
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Data zakończenia</Form.Label>
            <Form.Control
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
            />
            <Form.Text className="text-muted">
              Opcjonalne dla budżetów powtarzających się
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>
      
      <Form.Group className="mb-3">
        <Form.Label>Próg ostrzeżeń (% wykorzystania budżetu)</Form.Label>
        <Form.Control
          type="number"
          name="notificationThreshold" // Changed from warningThreshold
          value={formData.notificationThreshold} // Changed from warningThreshold
          onChange={handleChange}
          min="1"
          max="100"
          required
        />
        <Form.Control.Feedback type="invalid">
          Próg ostrzeżeń musi być liczbą od 1 do 100
        </Form.Control.Feedback>
      </Form.Group>
      
      <Form.Group className="mb-4">
        <Form.Check
          type="checkbox"
          label="Aktywny"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
        />
      </Form.Group>
      
      <div className="d-flex gap-2">
        <Button variant="primary" type="submit">
          {buttonText}
        </Button>
        <Button variant="outline-secondary" onClick={() => navigate(-1)}>
          Anuluj
        </Button>
      </div>
    </Form>
  );
};

export default BudgetForm;
