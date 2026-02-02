import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    organisationName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organisations, setOrganisations] = useState([]);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const response = await axios.post(`${apiBaseUrl}/auth/login`, formData);
      const { token, user } = response.data;

      // Store token in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Set authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      onLogin(user);
    } catch (error) {
      if (error.response?.data?.requiresOrganisation) {
        setShowOrgDropdown(true);
        setOrganisations(error.response.data.organisations);
        setError(error.response.data.message);
      } else {
        setError(error.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2><i className="fas fa-lock"></i> Login to Petrol Management</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
            />
          </div>

          {showOrgDropdown && (
            <div className="form-group">
              <label htmlFor="organisationName">Fuel Station Name</label>
              <select
                id="organisationName"
                name="organisationName"
                value={formData.organisationName}
                onChange={handleChange}
                required
              >
                <option value="">Select your fuel station</option>
                {organisations.map((org, index) => (
                  <option key={index} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Logging in...</> : <><i className="fas fa-sign-in-alt"></i> Login</>}
          </button>
        </form>

        <div className="auth-links">
          <p>Use the toggle below to switch to registration</p>
        </div>
      </div>
    </div>
  );
};

export default Login;