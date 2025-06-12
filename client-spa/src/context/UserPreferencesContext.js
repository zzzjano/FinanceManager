import React, { createContext, useState, useContext, useEffect } from 'react';
import { useKeycloak } from './KeycloakContext';
import { getUserPreferences, updateUserPreferences } from '../services/userService';

// Available languages and currencies
export const AVAILABLE_LANGUAGES = [
  { code: 'pl', name: 'Polski' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' }
];

export const AVAILABLE_CURRENCIES = [
  { code: 'PLN', symbol: 'zł', name: 'Polski złoty' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];

// Default preferences
const DEFAULT_PREFERENCES = {
  language: 'pl',
  currency: 'PLN',
  theme: 'light'
};

// Create context
const UserPreferencesContext = createContext(null);

// Provider component
export const UserPreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const { authenticated, keycloak, userProfile } = useKeycloak();

  // Load user preferences when authenticated
  useEffect(() => {
    const loadPreferences = async () => {
      if (authenticated && keycloak && userProfile) {
        try {
          setLoading(true);
          const response = await getUserPreferences(userProfile.id);
          if (response && response.data && response.data.preferences) {
            setPreferences(response.data.preferences);
          }
        } catch (error) {
          console.error('Error loading user preferences:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (authenticated && userProfile) {
      loadPreferences();
    }
  }, [authenticated, keycloak, userProfile]);

  // Function to update preferences
  const updatePreferences = async (newPreferences) => {
    if (!authenticated || !userProfile) return;

    try {
      setLoading(true);
      const updatedPrefs = { ...preferences, ...newPreferences };
      await updateUserPreferences(userProfile.id, updatedPrefs);
      setPreferences(updatedPrefs);
      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get current language name
  const getCurrentLanguageName = () => {
    const language = AVAILABLE_LANGUAGES.find(lang => lang.code === preferences.language);
    return language ? language.name : 'Unknown';
  };

  // Get current currency symbol
  const getCurrentCurrencySymbol = () => {
    const currency = AVAILABLE_CURRENCIES.find(curr => curr.code === preferences.currency);
    return currency ? currency.symbol : '';
  };
  // Format amount with current currency
  const formatAmount = (amount) => {
    if (amount === undefined || amount === null) return '';
    
    return new Intl.NumberFormat(preferences.language, { 
      style: 'currency', 
      currency: preferences.currency 
    }).format(amount);
  };
  
  // Format amount with specific currency
  const formatCurrency = (amount, currency = preferences.currency) => {
    if (amount === undefined || amount === null) return '';
    
    return new Intl.NumberFormat(preferences.language, { 
      style: 'currency', 
      currency: currency 
    }).format(amount);
  };

  const value = {
    preferences,
    loading,
    updatePreferences,
    availableLanguages: AVAILABLE_LANGUAGES,
    availableCurrencies: AVAILABLE_CURRENCIES,
    getCurrentLanguageName,
    getCurrentCurrencySymbol,
    formatAmount,
    formatCurrency
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

// Hook to use the preferences context
export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};
