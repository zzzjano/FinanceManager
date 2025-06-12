import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useKeycloak } from './context/KeycloakContext';
import { UserPreferencesProvider } from './context/UserPreferencesContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import NewAccount from './pages/NewAccount';
import EditAccount from './pages/EditAccount';
import AccountDetail from './pages/AccountDetail';
import Categories from './pages/Categories';
import NewCategory from './pages/NewCategory';
import EditCategory from './pages/EditCategory';
import CategoryDetail from './pages/CategoryDetail';
import Transactions from './pages/Transactions';
import NewTransaction from './pages/NewTransaction';
import EditTransaction from './pages/EditTransaction';
import TransactionDetail from './pages/TransactionDetail';
import ScheduledTransactions from './pages/ScheduledTransactions';
import NewScheduledTransaction from './pages/NewScheduledTransaction';
import EditScheduledTransaction from './pages/EditScheduledTransaction';
import ScheduledTransactionDetail from './pages/ScheduledTransactionDetail';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Budgets from './pages/Budgets';
import NewBudget from './pages/NewBudget';
import EditBudget from './pages/EditBudget';
import BudgetDetail from './pages/BudgetDetail';
import Notifications from './pages/Notifications';
import Loading from './components/Loading';

function App() {
  const { initialized, authenticated, loading } = useKeycloak();

  if (loading || !initialized) {
    return <Loading />;
  }
  return (
    <div className="app">
      {authenticated ? (
        <UserPreferencesProvider>
          <NotificationProvider>
            <Navbar />
            <div className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              <Route path="/register" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              {/* Profil użytkownika */}
              <Route path="/profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              {/* Zarządzanie kontami */}
              <Route path="/accounts" element={
                <PrivateRoute>
                  <Accounts />
                </PrivateRoute>
              } />
              <Route path="/accounts/new" element={
                <PrivateRoute>
                  <NewAccount />
                </PrivateRoute>
              } />
              <Route path="/accounts/:id" element={
                <PrivateRoute>
                  <AccountDetail />
                </PrivateRoute>
              } />
              <Route path="/accounts/:id/edit" element={
                <PrivateRoute>
                  <EditAccount />
                </PrivateRoute>
              } />
              {/* Zarządzanie kategoriami */}
              <Route path="/categories" element={
                <PrivateRoute>
                  <Categories />
                </PrivateRoute>
              } />
              <Route path="/categories/new" element={
                <PrivateRoute>
                  <NewCategory />
                </PrivateRoute>
              } />
              <Route path="/categories/:id" element={
                <PrivateRoute>
                  <CategoryDetail />
                </PrivateRoute>
              } />
              <Route path="/categories/:id/edit" element={
                <PrivateRoute>
                  <EditCategory />
                </PrivateRoute>
              } />
              {/* Zarządzanie transakcjami */}
              <Route path="/transactions" element={
                <PrivateRoute>
                  <Transactions />
                </PrivateRoute>
              } />
              <Route path="/transactions/new" element={
                <PrivateRoute>
                  <NewTransaction />
                </PrivateRoute>
              } />
              <Route path="/transactions/:id" element={
                <PrivateRoute>
                  <TransactionDetail />
                </PrivateRoute>
              } />
              <Route path="/transactions/:id/edit" element={
                <PrivateRoute>
                  <EditTransaction />
                </PrivateRoute>
              } />
              {/* Raporty */}
              <Route path="/reports" element={
                <PrivateRoute>
                  <Reports />
                </PrivateRoute>
              } />
              {/* Zarządzanie cyklicznymi transakcjami */}
              <Route path="/scheduled-transactions" element={
                <PrivateRoute>
                  <ScheduledTransactions />
                </PrivateRoute>
              } />
              <Route path="/scheduled-transactions/new" element={
                <PrivateRoute>
                  <NewScheduledTransaction />
                </PrivateRoute>
              } />
              <Route path="/scheduled-transactions/:id" element={
                <PrivateRoute>
                  <ScheduledTransactionDetail />
                </PrivateRoute>
              } />              <Route path="/scheduled-transactions/:id/edit" element={
                <PrivateRoute>
                  <EditScheduledTransaction />
                </PrivateRoute>
              } />
              {/* Zarządzanie budżetami */}
              <Route path="/budgets" element={
                <PrivateRoute>
                  <Budgets />
                </PrivateRoute>
              } />
              <Route path="/budgets/new" element={
                <PrivateRoute>
                  <NewBudget />
                </PrivateRoute>
              } />
              <Route path="/budgets/:id" element={
                <PrivateRoute>
                  <BudgetDetail />
                </PrivateRoute>
              } />
              <Route path="/budgets/:id/edit" element={
                <PrivateRoute>
                  <EditBudget />
                </PrivateRoute>
              } />
              {/* Powiadomienia */}
              <Route path="/notifications" element={
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              } />
            </Routes>
          </div>
          </NotificationProvider>
        </UserPreferencesProvider>
      ) : (
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
    </div>
  );
}

export default App;
