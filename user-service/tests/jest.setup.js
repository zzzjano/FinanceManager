// Set up any global test environment configuration
process.env.NODE_ENV = 'test';

// Mock environment variables for tests
process.env.KEYCLOAK_AUTH_SERVER_URL = 'http://localhost:8080';
process.env.KEYCLOAK_REALM = 'finance-manager';
process.env.KEYCLOAK_ADMIN = 'admin';
process.env.KEYCLOAK_ADMIN_PASSWORD = 'admin';
process.env.JWKS_URI = 'http://localhost:8080/realms/finance-manager/protocol/openid-connect/certs';

// This file runs before each test suite - perfect for setting up global mocks
