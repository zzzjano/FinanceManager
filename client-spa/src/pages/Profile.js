import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import { useKeycloak } from '../context/KeycloakContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getUserProfile, updateUserProfile } from '../services/userService';
import Loading from '../components/Loading';

const Profile = () => {
  const { userProfile, keycloak } = useKeycloak();
  const { 
    preferences, 
    updatePreferences, 
    availableLanguages, 
    availableCurrencies, 
    loading: preferencesLoading 
  } = useUserPreferences();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    language: '',
    currency: '',
    theme: ''
  });

  // Load user profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!userProfile) return;
      console.log(userProfile);
      try {
        setLoading(true);
        const response = await getUserProfile(userProfile.id);
        if (response && response.data && response.data.user) {
          setProfile(response.data.user);
          
          setFormValues({
            firstName: response.data.user.firstName || '',
            lastName: response.data.user.lastName || '',
            email: response.data.user.email || '',
            language: preferences.language,
            currency: preferences.currency,
            theme: preferences.theme
          });
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        setMessage({
          type: 'danger',
          text: 'Nie udało się wczytać danych profilu.'
        });
      } finally {
        setLoading(false);
      }
    };

    if (userProfile && !preferencesLoading) {
      loadProfileData();
    }
  }, [userProfile, preferencesLoading]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Update profile information
      const profileData = {
        firstName: formValues.firstName,
        lastName: formValues.lastName
      };
      
      await updateUserProfile(userProfile.id, profileData);

      // Update preferences
      const preferencesData = {
        language: formValues.language,
        currency: formValues.currency,
        theme: formValues.theme
      };
      
      await updatePreferences(preferencesData);

      setMessage({
        type: 'success',
        text: 'Profil został zaktualizowany.'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        type: 'danger',
        text: 'Wystąpił błąd podczas aktualizacji profilu.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || preferencesLoading) {
    return <Loading />;
  }

  return (
    <Container>
      <h1 className="mb-4">Profil użytkownika</h1>
      
      {message.text && (
        <Alert variant={message.type} onClose={() => setMessage({ type: '', text: '' })} dismissible>
          {message.text}
        </Alert>
      )}
      
      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <h4 className="mb-3">Dane osobowe</h4>
                <Form.Group className="mb-3">
                  <Form.Label>Imię</Form.Label>
                  <Form.Control
                    type="text"
                    name="firstName"
                    value={formValues.firstName}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Nazwisko</Form.Label>
                  <Form.Control
                    type="text"
                    name="lastName"
                    value={formValues.lastName}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formValues.email}
                    disabled
                  />
                  <Form.Text className="text-muted">
                    Zmiana adresu email wymaga weryfikacji w systemie uwierzytelniania.
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <h4 className="mb-3">Preferencje</h4>
                <Form.Group className="mb-3">
                  <Form.Label>Język interfejsu</Form.Label>
                  <Form.Select
                    name="language"
                    value={formValues.language}
                    onChange={handleChange}
                  >
                    {availableLanguages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Waluta</Form.Label>
                  <Form.Select
                    name="currency"
                    value={formValues.currency}
                    onChange={handleChange}
                  >
                    {availableCurrencies.map(curr => (
                      <option key={curr.code} value={curr.code}>
                        {curr.name} ({curr.symbol})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Motyw</Form.Label>
                  <Form.Select
                    name="theme"
                    value={formValues.theme}
                    onChange={handleChange}
                  >
                    <option value="light">Jasny</option>
                    <option value="dark">Ciemny</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <div className="d-flex justify-content-end mt-3">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={saving}
              >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Profile;
