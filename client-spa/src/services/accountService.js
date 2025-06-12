import api from './api';

// Get all accounts
export const getAccounts = async () => {
  try {
    const response = await api.get('/accounts');
    return response.data;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
};

// Get single account by ID
export const getAccountById = async (id) => {
  try {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching account with ID ${id}:`, error);
    throw error;
  }
};

// Create new account
export const createAccount = async (accountData) => {
  try {
    const response = await api.post('/accounts', accountData);
    return response.data;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

// Update account
export const updateAccount = async (id, accountData) => {
  try {
    const response = await api.put(`/accounts/${id}`, accountData);
    return response.data;
  } catch (error) {
    console.error(`Error updating account with ID ${id}:`, error);
    throw error;
  }
};

// Delete account
export const deleteAccount = async (id) => {
  try {
    const response = await api.delete(`/accounts/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting account with ID ${id}:`, error);
    throw error;
  }
};
