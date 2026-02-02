import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Navbar.css';

const Navbar = ({ activeTab, setActiveTab, currentUser, onLogout, isCollapsed, onToggleSidebar, isMobileOpen, selectedOrganization, onOrganizationChange }) => {
  const [organisations, setOrganisations] = useState([]);

  const fetchOrganisations = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/organisations/public`);
      setOrganisations(response.data);
    } catch (error) {
      console.error('Error fetching organisations:', error);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchOrganisations();
    }
  }, [currentUser, fetchOrganisations]);

  const getNavItems = () => {
    const baseItems = [
      // { id: 'dashboard', label: 'Dashboard', icon: <i className="fas fa-chart-line"></i> },
      { id: 'transactions', label: 'Fuel Requests', icon: <i className="fas fa-gas-pump"></i> }
    ];

    if (currentUser?.role === 'admin') {
      return [
        ...baseItems,
        { id: 'organizations', label: 'Fuel Stations', icon: <i className="fas fa-building"></i> },
        { id: 'users', label: 'Users', icon: <i className="fas fa-users"></i> },
        { id: 'machines', label: 'Machines', icon: <i className="fas fa-gears"></i> }, // Or something else
        { id: 'tanks', label: 'Tanks', icon: <i className="fas fa-oil-can"></i> },
        { id: 'tank-refills', label: 'Tank Refills', icon: <i className="fas fa-fill-drip"></i> },
        { id: 'testing', label: 'Testing', icon: <i className="fas fa-flask"></i> },
        { id: 'shifts', label: 'Shift Master', icon: <i className="fas fa-clock"></i> },
        { id: 'fuels', label: 'Fuels', icon: <i className="fas fa-oil-can"></i> },
        { id: 'daily-collection', label: 'Daily Collection', icon: <i className="fas fa-file-invoice-dollar"></i> },
        { id: 'reports', label: 'Sales Report', icon: <i className="fas fa-chart-line"></i> },
        { id: 'audit-logs', label: 'Audit Logs', icon: <i className="fas fa-file-shield"></i> }
      ];
    } else if (currentUser?.role === 'manager') {
      return [
        ...baseItems,
        { id: 'users', label: 'Users', icon: <i className="fas fa-users"></i> },
        { id: 'machines', label: 'Machines', icon: <i className="fas fa-gears"></i> },
        { id: 'tanks', label: 'Tanks', icon: <i className="fas fa-oil-can"></i> },
        { id: 'tank-refills', label: 'Tank Refills', icon: <i className="fas fa-fill-drip"></i> },
        { id: 'testing', label: 'Testing', icon: <i className="fas fa-flask"></i> },
        { id: 'shifts', label: 'Shift Master', icon: <i className="fas fa-clock"></i> },
        { id: 'fuels', label: 'Fuels', icon: <i className="fas fa-oil-can"></i> },
        { id: 'daily-collection', label: 'Daily Collection', icon: <i className="fas fa-file-invoice-dollar"></i> },
        { id: 'reports', label: 'Sales Report', icon: <i className="fas fa-chart-line"></i> }
      ];
    } else if (currentUser?.role === 'purchaser') {
      return baseItems; // Only Dashboard and Transactions
    } else if (currentUser?.role === 'salesman') {
      return [
        // { id: 'dashboard', label: 'Dashboard', icon: <i className="fas fa-chart-line"></i> },
        { id: 'transactions', label: 'Fuel Requests', icon: <i className="fas fa-gas-pump"></i> },
        { id: 'daily-collection', label: 'Daily Collection', icon: <i className="fas fa-file-invoice-dollar"></i> }
      ]; // Only Dashboard, Transactions, Daily Collection
    }

    return baseItems; // Default fallback
  };

  const navItems = getNavItems();

  return (
    <nav className={`navbar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="navbar-header">
        <div className="navbar-brand">
          {!isCollapsed && (
            <h2 title={currentUser?.role === 'admin' ? 'Petrol Management' : (currentUser?.organisation?.name || 'Fuel Station')}>
              <i className="fas fa-gas-pump"></i> {currentUser?.role === 'admin' ? 'Petrol Management' : (currentUser?.organisation?.name || 'Petrol Management')}
            </h2>
          )}
          {/* {isCollapsed && <span className="brand-icon"><i className="fas fa-gas-pump"></i></span>} */}
        </div>
        <button className="toggle-btn" onClick={onToggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>

      </div>

      {currentUser?.role === 'admin' && !isCollapsed && (
        <div className="navbar-filter">
          <label htmlFor="station-filter">Filter Station:</label>
          <select
            id="station-filter"
            value={selectedOrganization}
            onChange={(e) => onOrganizationChange(e.target.value)}
          >
            <option value="">All Stations</option>
            {organisations.map(org => (
              <option key={org._id} value={org._id}>{org.name}</option>
            ))}
          </select>
        </div>
      )}

      <ul className="navbar-nav">
        {navItems.map(item => (
          <li key={item.id}>
            <button
              className={`nav-link ${activeTab === item.id ? 'active' : ''} nav-link-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="nav-text">{item.label}</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className="navbar-user">
        {!isCollapsed && (
          <div className="user-info">
            <span className="user-name">
              {currentUser?.firstname} {currentUser?.lastname}
            </span>
            <span className="user-role">{currentUser?.role}</span>
          </div>
        )}
        <button
          className="logout-btn"
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : ''}
        >
          <i className="fas fa-sign-out-alt"></i>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;