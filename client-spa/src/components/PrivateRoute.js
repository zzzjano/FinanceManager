import React from 'react';
import { Navigate } from 'react-router-dom';
import { useKeycloak } from '../context/KeycloakContext';
import Loading from './Loading';

const PrivateRoute = ({ children }) => {
  const { authenticated, initialized, loading } = useKeycloak();
  
  if (loading || !initialized) {
    return <Loading />;
  }
  
  return authenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
