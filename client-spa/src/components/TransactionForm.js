import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getAccounts } from '../services/accountService';
import { getCategories } from '../services/categoryService';
import { useUserPreferences } from '../context/UserPreferencesContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const TransactionForm = ({ transaction = {}, onSubmit, isLoading }) => {
  const navigate = useNavigate();
  const { formatAmount } = useUserPreferences();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    accountId: transaction.accountId || '',
    categoryId: transaction.categoryId || '',
    amount: transaction.amount || '',
    type: transaction.type || 'expense',
    date: transaction.date ? new Date(transaction.date) : new Date(),
    description: transaction.description || '',
    payee: transaction.payee || '',
    isRecurring: transaction.isRecurring || false,
    tags: transaction.tags || []
  });
  
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Transaction types
  const transactionTypes = [
    { value: 'expense', label: 'Wydatek' },
    { value: 'income', label: 'Przychód' }
  ];

  // Load accounts and categories on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setAccountsLoading(true);
        const response = await getAccounts();
        setAccounts(response.data.accounts);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setAccountsLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  // Update categories when transaction type changes
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await getCategories({ type: formData.type });
        setCategories(response.data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [formData.type]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle date changes from DatePicker
  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      date
    });
  };

  // Handle tag input
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  // Add tag to transaction
  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  // Remove tag from transaction
  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Validate the form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.accountId) {
      newErrors.accountId = 'Konto jest wymagane';
    }

    if (!formData.amount || isNaN(formData.amount) || formData.amount <= 0) {
      newErrors.amount = 'Podaj prawidłową kwotę (większą niż 0)';
    }

    if (!formData.type) {
      newErrors.type = 'Wybierz typ transakcji';
    }

    if (!formData.date) {
      newErrors.date = 'Data jest wymagana';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Convert date to ISO string for API
      const submissionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: formData.date.toISOString()
      };
      
      onSubmit(submissionData);
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Typ transakcji</Form.Label>
                <Form.Select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={isLoading}
                  isInvalid={!!errors.type}
                >
                  {transactionTypes.map(type => (
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
                <Form.Label>Kwota</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={isLoading}
                  isInvalid={!!errors.amount}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.amount}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Konto</Form.Label>
                <Form.Select
                  name="accountId"
                  value={formData.accountId}
                  onChange={handleChange}
                  disabled={isLoading || accountsLoading}
                  isInvalid={!!errors.accountId}
                >
                  <option value="">Wybierz konto</option>
                  {accounts.map(account => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.accountId}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Kategoria</Form.Label>
                <Form.Select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  disabled={isLoading || categoriesLoading}
                >
                  <option value="">Brak kategorii</option>
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Data</Form.Label>
                <DatePicker
                  selected={formData.date}
                  onChange={handleDateChange}
                  className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                  dateFormat="dd/MM/yyyy"
                  disabled={isLoading}
                />
                {errors.date && (
                  <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                    {errors.date}
                  </Form.Control.Feedback>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Odbiorca</Form.Label>
                <Form.Control
                  type="text"
                  name="payee"
                  value={formData.payee}
                  onChange={handleChange}
                  placeholder="Nazwa odbiorcy/nadawcy"
                  disabled={isLoading}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Opis</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Dodaj opis transakcji"
                  disabled={isLoading}
                />
              </Form.Group>

              <Form.Group className="mb-3 hidden">
                <Form.Check
                  type="checkbox"
                  label="Transakcja cykliczna"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label>Etykiety</Form.Label>
            <div className="d-flex mb-2">
              <Form.Control
                type="text"
                placeholder="Dodaj etykietę (naciśnij Enter)"
                value={tagInput}
                onChange={handleTagInputChange}
                disabled={isLoading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(e);
                  }
                }}
              />
              <Button 
                variant="outline-secondary" 
                onClick={handleAddTag} 
                disabled={isLoading || !tagInput.trim()} 
                className="ms-2"
              >
                Dodaj
              </Button>
            </div>
            
            {formData.tags.length > 0 && (
              <div className="mb-3">
                {formData.tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="badge bg-secondary me-1 p-2" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => !isLoading && handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </span>
                ))}
              </div>
            )}
          </Form.Group>

          <div className="d-flex gap-2 justify-content-end">
            <Button
              variant="outline-secondary"
              onClick={() => navigate(-1)}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Zapisywanie...' : transaction._id ? 'Zaktualizuj transakcję' : 'Dodaj transakcję'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default TransactionForm;