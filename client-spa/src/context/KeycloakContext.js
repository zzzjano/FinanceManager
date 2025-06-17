import React, { createContext, useState, useContext, useEffect } from 'react';
import Keycloak from 'keycloak-js';
import { setKeycloakInstance } from '../services/api';

// Tworzenie kontekstu Keycloak
const KeycloakContext = createContext(null);

// Konfiguracja Keycloak
const keycloakConfig = {
  url: 'http://localhost:8080/',  // Local development - browser to Keycloak
  realm: 'finance-manager',
  clientId: 'finance-manager-spa'
};

// Provider kontekstu Keycloak
export const KeycloakProvider = ({ children }) => {
  const [keycloak, setKeycloak] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const keycloakInstance = new Keycloak(keycloakConfig);
    let refreshInterval;

    keycloakInstance.init({
      checkLoginIframe: false,
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256',
      // Add audience claim to the token request to match server expectation
      tokenParams: {
        audience: 'resource-server'
      }
    })
      .then(auth => {        
        setKeycloak(keycloakInstance);
        setAuthenticated(auth);
        setInitialized(true);
        setLoading(false);
        
        // Set keycloak instance in API service
        setKeycloakInstance(keycloakInstance);

        if (auth) {
          // Pobierz profil użytkownika jeśli jest zalogowany
          keycloakInstance.loadUserProfile().then(profile => {
            setUserProfile(profile);
          });

          // Odśwież token przed wygaśnięciem
          refreshInterval = setInterval(() => {
            keycloakInstance
              .updateToken(70)
              .then(refreshed => {
                if (refreshed) {
                  console.log('Token odświeżony');
                }
              })
              .catch(() => {
                console.error('Nie udało się odświeżyć tokenu');
                keycloakInstance.logout();
              });
          }, 60000);
        }
      })
      .catch(error => {
        console.error('Błąd inicjalizacji Keycloak:', error);
        setLoading(false);
      });
      return () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  };
  }, []);

  // Funkcja logowania
  const login = () => {
    if (keycloak) {
      keycloak.login();
    }
  };

  // Funkcja wylogowania
  const logout = () => {
    if (keycloak) {
      keycloak.logout({ redirectUri: window.location.origin });
    }
  };

  // Funkcja sprawdzająca role użytkownika
  const hasRole = (roles) => {
    if (!keycloak || !authenticated) return false;
    
    if (Array.isArray(roles)) {
      return roles.some(role => keycloak.hasRealmRole(role));
    }
    
    return keycloak.hasRealmRole(roles);
  };

  const value = {
    keycloak,
    authenticated,
    initialized,
    loading,
    userProfile,
    login,
    logout,
    hasRole
  };

  return (
    <KeycloakContext.Provider value={value}>
      {children}
    </KeycloakContext.Provider>
  );
};

// Hook do użycia kontekstu Keycloak
export const useKeycloak = () => {
  const context = useContext(KeycloakContext);
  if (!context) {
    throw new Error('useKeycloak musi być używany wewnątrz KeycloakProvider');
  }
  return context;
};
