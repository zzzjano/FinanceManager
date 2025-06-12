import React, { useState } from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, Button, NavDropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useKeycloak } from '../context/KeycloakContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationBadge from './NotificationBadge';
import NotificationCenter from './NotificationCenter';

const Navbar = () => {
  const { userProfile, logout, hasRole } = useKeycloak();
  const { getCurrentLanguageName, getCurrentCurrencySymbol } = useUserPreferences();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <BootstrapNavbar bg="light" expand="lg" className="mb-4">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/dashboard">Finance Manager</BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">            <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/accounts">Konta</Nav.Link>
            <Nav.Link as={Link} to="/transactions">Transakcje</Nav.Link>
            <Nav.Link as={Link} to="/scheduled-transactions">Płatności cykliczne</Nav.Link>
            <Nav.Link as={Link} to="/categories">Kategorie</Nav.Link>
            <Nav.Link as={Link} to="/budgets">Budżety</Nav.Link>
            <Nav.Link as={Link} to="/reports">Raporty</Nav.Link>
            {hasRole('admin') && (
              <Nav.Link as={Link} to="/admin">Panel Admina</Nav.Link>
            )}          </Nav>          <Nav>
            {/* Notification icon with badge */}
            <div className="position-relative me-3 d-flex align-items-center">
              <Button 
                variant="link" 
                className="nav-link p-1 position-relative"
                onClick={() => setShowNotifications(true)}
              >
                <i className="bi bi-bell-fill fs-5"></i>
                <NotificationBadge />
              </Button>
            </div>
            
            {userProfile && (
              <NavDropdown 
                title={`${userProfile.firstName || userProfile.username} (${getCurrentCurrencySymbol()} | ${getCurrentLanguageName()})`} 
                id="user-dropdown"
                align="end"
              >
                <NavDropdown.Item as={Link} to="/profile">Profil użytkownika</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={logout}>Wyloguj</NavDropdown.Item>
              </NavDropdown>
            )}
            {!userProfile && (
              <Button variant="outline-secondary" onClick={logout}>Wyloguj</Button>
            )}
            
            {/* Notification sidebar */}
            <NotificationCenter 
              show={showNotifications} 
              handleClose={() => setShowNotifications(false)} 
            />
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
