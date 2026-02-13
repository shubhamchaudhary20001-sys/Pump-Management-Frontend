import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Organizations from './components/Organizations';
import Users from './components/Users';
import Fuels from './components/Fuels';
import Transactions from './components/Transactions';
import Login from './components/Login';
import Register from './components/Register';
import DailyCollection from './components/DailyCollection';
import Machines from './components/Machines';
import Tanks from './components/Tanks';
import TankRefills from './components/TankRefills';
import Testing from './components/Testing';
import Shifts from './components/Shifts';
import SalesReport from './components/SalesReport';
import AuditLogs from './components/AuditLogs';
import Credit from './components/Credit';


function App() {
  const [activeTab, setActiveTab] = useState('daily-collection');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [selectedOrganization, setSelectedOrganization] = useState(localStorage.getItem('selectedOrganization') || '');

  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        // Set authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Verify token with backend
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
        const response = await axios.get(`${apiBaseUrl}/auth/verify`);

        if (response.data && response.data.user) {
          const user = response.data.user;
          setCurrentUser(user);
          setIsAuthenticated(true);

          // Set appropriate default tab based on role if currently on daily-collection
          if (activeTab === 'daily-collection' && (user.role === 'purchaser' || user.role === 'salesman')) {
            setActiveTab('transactions');
          }
        } else {
          throw new Error('Invalid authentication response');
        }
      } catch (error) {
        // Token invalid, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);

    // Set appropriate default tab based on role
    if (user.role === 'purchaser') {
      setActiveTab('transactions');
    } else if (user.role === 'salesman') {
      setActiveTab('transactions');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedOrganization');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthMode('login');
    setSelectedOrganization('');
  };

  const handleOrganizationChange = (orgId) => {
    setSelectedOrganization(orgId);
    if (orgId) {
      localStorage.setItem('selectedOrganization', orgId);
    } else {
      localStorage.removeItem('selectedOrganization');
    }
  };

  const renderAuthContent = () => {
    if (authMode === 'login') {
      return <Login onLogin={handleLogin} />;
    } else {
      return <Register onLogin={handleLogin} />;
    }
  };

  const renderContent = () => {
    const commonProps = { organizationFilter: currentUser?.role === 'admin' ? selectedOrganization : '' };

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard {...commonProps} />;
      case 'organizations':
        return <Organizations />;
      case 'users':
        return <Users {...commonProps} />;
      case 'fuels':
        return <Fuels {...commonProps} />;
      case 'transactions':
        return <Transactions {...commonProps} />;
      case 'machines':
        return <Machines {...commonProps} />;
      case 'daily-collection':
        return <DailyCollection {...commonProps} />;
      case 'tanks':
        return <Tanks {...commonProps} />;
      case 'tank-refills':
        return <TankRefills {...commonProps} />;
      case 'testing':
        return <Testing {...commonProps} />;
      case 'shifts':
        return <Shifts {...commonProps} />;
      case 'reports':
        return <SalesReport {...commonProps} />;
      case 'audit-logs':
        return <AuditLogs {...commonProps} />;
      case 'credit-ledger':
        return <Credit {...commonProps} />;
      default:
        return <Dashboard {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="App">
        {renderAuthContent()}
        <div className="auth-toggle">
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={sidebarCollapsed}
        selectedOrganization={selectedOrganization}
        onOrganizationChange={handleOrganizationChange}
      />
      <div className={`mobile-backdrop ${sidebarCollapsed ? 'show' : ''}`} onClick={() => setSidebarCollapsed(false)}></div>
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <button className="mobile-menu-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          ☰
        </button>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
