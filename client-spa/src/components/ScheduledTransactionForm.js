import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getAccounts } from '../services/accountService';
import { getCategories } from '../services/categoryService';
import { useUserPreferences } from '../context/UserPreferencesContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const ScheduledTransactionForm = ({ scheduledTransaction = {}, onSubmit, isLoading }) => {
  const navigate = useNavigate();
  const { formatAmount } = useUserPreferences();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    accountId: scheduledTransaction.accountId || '',
    categoryId: scheduledTransaction.categoryId || '',
    amount: scheduledTransaction.amount || '',
    type: scheduledTransaction.type || 'expense',
    description: scheduledTransaction.description || '',
    payee: scheduledTransaction.payee || '',
    frequency: scheduledTransaction.frequency || 'monthly',
    startDate: scheduledTransaction.startDate ? new Date(scheduledTransaction.startDate) : new Date(),
    endDate: scheduledTransaction.endDate ? new Date(scheduledTransaction.endDate) : null,
    dayOfMonth: scheduledTransaction.dayOfMonth || (new Date().getDate()),
    dayOfWeek: scheduledTransaction.dayOfWeek !== undefined ? scheduledTransaction.dayOfWeek : new Date().getDay(),
    autoExecute: scheduledTransaction.autoExecute || false,
    tags: scheduledTransaction.tags || [],
    status: scheduledTransaction.status || 'active'
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

  // Frequency options
  const frequencyOptions = [
    { value: 'daily', label: 'Codziennie' },
    { value: 'weekly', label: 'Co tydzień' },
    { value: 'monthly', label: 'Co miesiąc' },
    { value: 'quarterly', label: 'Co kwartał' },
    { value: 'yearly', label: 'Co rok' }
  ];

  // Status options
  const statusOptions = [
    { value: 'active', label: 'Aktywny' },
    { value: 'paused', label: 'Wstrzymany' },
    { value: 'completed', label: 'Zakończony' },
    { value: 'cancelled', label: 'Anulowany' }
  ];

  // Days of week
  const daysOfWeek = [
    { value: 0, label: 'Niedziela' },
    { value: 1, label: 'Poniedziałek' },
    { value: 2, label: 'Wtorek' },
    { value: 3, label: 'Środa' },
    { value: 4, label: 'Czwartek' },
    { value: 5, label: 'Piątek' },
    { value: 6, label: 'Sobota' }
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
  const handleDateChange = (date, fieldName) => {
    setFormData({
      ...formData,
      [fieldName]: date
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

  // Generate day of month options
  const generateDaysOfMonth = () => {
    return Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }));
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

    if (!formData.frequency) {
      newErrors.frequency = 'Wybierz częstotliwość';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Data rozpoczęcia jest wymagana';
    }

    if (formData.frequency === 'weekly' && (formData.dayOfWeek < 0 || formData.dayOfWeek > 6)) {
      newErrors.dayOfWeek = 'Wybierz dzień tygodnia';
    }

    if (formData.frequency === 'monthly' && (formData.dayOfMonth < 1 || formData.dayOfMonth > 31)) {
      newErrors.dayOfMonth = 'Wybierz dzień miesiąca (1-31)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Convert dates to ISO string for API
      const submissionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate ? formData.endDate.toISOString() : null,
        dayOfMonth: formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly' 
          ? parseInt(formData.dayOfMonth, 10) 
          : undefined,
        dayOfWeek: formData.frequency === 'weekly' 
          ? parseInt(formData.dayOfWeek, 10) 
          : undefined
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
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Częstotliwość</Form.Label>
                <Form.Select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  disabled={isLoading}
                  isInvalid={!!errors.frequency}
                >
                  {frequencyOptions.map(frequency => (
                    <option key={frequency.value} value={frequency.value}>
                      {frequency.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.frequency}
                </Form.Control.Feedback>
              </Form.Group>

              {formData.frequency === 'weekly' && (
                <Form.Group className="mb-3">
                  <Form.Label>Dzień tygodnia</Form.Label>
                  <Form.Select
                    name="dayOfWeek"
                    value={formData.dayOfWeek}
                    onChange={handleChange}
                    disabled={isLoading}
                    isInvalid={!!errors.dayOfWeek}
                  >
                    {daysOfWeek.map(day => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.dayOfWeek}
                  </Form.Control.Feedback>
                </Form.Group>
              )}

              {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') && (
                <Form.Group className="mb-3">
                  <Form.Label>Dzień miesiąca</Form.Label>
                  <Form.Select
                    name="dayOfMonth"
                    value={formData.dayOfMonth}
                    onChange={handleChange}
                    disabled={isLoading}
                    isInvalid={!!errors.dayOfMonth}
                  >
                    {generateDaysOfMonth().map(day => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.dayOfMonth}
                  </Form.Control.Feedback>
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Data rozpoczęcia</Form.Label>
                <DatePicker
                  selected={formData.startDate}
                  onChange={(date) => handleDateChange(date, 'startDate')}
                  className={`form-control ${errors.startDate ? 'is-invalid' : ''}`}
                  dateFormat="dd/MM/yyyy"
                  disabled={isLoading}
                />
                {errors.startDate && (
                  <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                    {errors.startDate}
                  </Form.Control.Feedback>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Data zakończenia (opcjonalnie)</Form.Label>
                <DatePicker
                  selected={formData.endDate}
                  onChange={(date) => handleDateChange(date, 'endDate')}
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
                  disabled={isLoading}
                  isClearable
                  placeholderText="Brak daty zakończenia"
                  minDate={formData.startDate}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Wykonuj automatycznie"
                  name="autoExecute"
                  checked={formData.autoExecute}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <Form.Text className="text-muted">
                  Gdy zaznaczone, transakcje będą wykonywane automatycznie w dniu płatności.
                </Form.Text>
              </Form.Group>

              {scheduledTransaction._id && (
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={isLoading}
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
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
              {isLoading ? 'Zapisywanie...' : scheduledTransaction._id ? 'Zaktualizuj płatność cykliczną' : 'Dodaj płatność cykliczną'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ScheduledTransactionForm;
