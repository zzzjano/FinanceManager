import React from 'react';
import { Badge } from 'react-bootstrap';
import { useUserPreferences } from '../context/UserPreferencesContext';

/**
 * Displays the current user preferences as badges
 */
const PreferencesInfo = () => {
  const { 
    preferences, 
    getCurrentLanguageName, 
    getCurrentCurrencySymbol 
  } = useUserPreferences();
  
  return (
    <div className="d-flex gap-2">
      <Badge bg="info">
        Język: {getCurrentLanguageName()}
      </Badge>
      
      <Badge bg="success">
        Waluta: {preferences.currency} ({getCurrentCurrencySymbol()})
      </Badge>
      
      <Badge bg={preferences.theme === 'dark' ? 'dark' : 'light'} text={preferences.theme === 'dark' ? 'white' : 'dark'}>
        Motyw: {preferences.theme === 'dark' ? 'Ciemny' : 'Jasny'}
      </Badge>
    </div>
  );
};

export default PreferencesInfo;
