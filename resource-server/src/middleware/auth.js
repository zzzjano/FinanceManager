const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const { logger } = require('../utils/logger');

// Define possible issuer URLs - for Docker and local development
const possibleIssuers = [
  `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}`,
  'http://keycloak:8080/realms/finance-manager',
  'http://localhost:8080/realms/finance-manager'
];

logger.info(`Configured JWT issuers: ${JSON.stringify(possibleIssuers)}`);

// Setup authentication middleware using JWT validation
const authMiddleware = jwt({  // Dynamically fetch the public key from the JWKS endpoint
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.JWKS_URI  }), 
  audience: false, 
  issuer: possibleIssuers, 
  algorithms: ['RS256']
}).unless({ 
  // Paths that don't require authentication
  path: [
    '/api/health',
    '/api/public',
    '/api/users/register',
    '/api/users/forgot-password',
    '/api/users/reset-password',
    '/debug-sentry',
    '/api/scheduled-transactions/process'
  ] 
});

// Add role-based access control middleware
const requireRole = (role) => {
  return (req, res, next) => {
    // Check if the user is authenticated
    if (!req.auth) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Check if the user has the required role
    // Keycloak typically includes roles in realm_access.roles array
    const userRoles = req.auth.realm_access?.roles || [];
    
    if (Array.isArray(role)) {
      // Check if user has any of the specified roles
      if (!role.some(r => userRoles.includes(r))) {
        logger.warn(`Access denied: User ${req.auth.sub} does not have required roles ${role}`);
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }
    } else {
      // Check for a specific role
      if (!userRoles.includes(role)) {
        logger.warn(`Access denied: User ${req.auth.sub} does not have required role ${role}`);
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }
    }
    
    // User has the required role(s), proceed to the next middleware
    next();
  };
};

// Role constants
const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

module.exports = {
  authMiddleware,
  requireRole,
  ROLES
};
