import React, { useState } from 'react';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AccountForm = ({ account = {}, onSubmit, isLoading }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: account.name || '',
    type: account.type || 'CHECKING',
    balance: account.balance || 0,
    currency: account.currency || 'PLN',
    description: account.description || '',
    isActive: account.isActive !== false // default to true
  });
  const [errors, setErrors] = useState({});

  const accountTypes = [
    { value: 'CHECKING', label: 'Konto osobiste' },
    { value: 'SAVINGS', label: 'Konto oszczędnościowe' },
    { value: 'CREDIT_CARD', label: 'Karta kredytowa' },
    { value: 'LOAN', label: 'Pożyczka/Kredyt' },
    { value: 'INVESTMENT', label: 'Inwestycje' },
    { value: 'CASH', label: 'Gotówka' },
    { value: 'OTHER', label: 'Inne' }
  ];

  const currencies = [
    'PLN', 'USD', 'EUR', 'GBP', 'CHF'
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
      newErrors.name = 'Nazwa konta jest wymagana';
    }
    
    if (!formData.type) {
      newErrors.type = 'Typ konta jest wymagany';
    }
    
    if (!formData.currency) {
      newErrors.currency = 'Waluta jest wymagana';
    }
    
    if (formData.balance === '' || isNaN(formData.balance)) {
      newErrors.balance = 'Saldo musi być liczbą';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const accountData = {
        ...formData,
        balance: parseFloat(formData.balance)
      };
      
      onSubmit(accountData);
    }
  };
  
  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Nazwa konta</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Np. Konto główne, Oszczędności"
              isInvalid={!!errors.name}
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.name}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Typ konta</Form.Label>
            <Form.Select
              name="type"
              value={formData.type}
              onChange={handleChange}
              isInvalid={!!errors.type}
              disabled={isLoading}
            >
              {accountTypes.map(type => (
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
            <Form.Label>Saldo początkowe</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              name="balance"
              value={formData.balance}
              onChange={handleChange}
              isInvalid={!!errors.balance}
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.balance}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Dla kont kredytowych, wprowadź ujemną wartość jako saldo początkowe.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Waluta</Form.Label>
            <Form.Select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              isInvalid={!!errors.currency}
              disabled={isLoading}
            >
              {currencies.map(currency => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {errors.currency}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Opis (opcjonalnie)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={isLoading}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Check
              type="checkbox"
              label="Konto aktywne"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              disabled={isLoading}
            />
            <Form.Text className="text-muted">
              Nieaktywne konta nie są uwzględniane w raportach i zestawieniach.
            </Form.Text>
          </Form.Group>

          <div className="d-flex gap-2">
            <Button 
              variant="primary" 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Zapisywanie...' : 'Zapisz konto'}
            </Button>
            <Button 
              variant="outline-secondary" 
              onClick={() => navigate('/accounts')}
              disabled={isLoading}
            >
              Anuluj
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default AccountForm;
