import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Auth.css';

const Register = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    mobileno: '',
    username: '',
    password: '',
    confirmPassword: '',
    organisation: ''
  });
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrganisations = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/organisations`);
      setOrganisations(response.data);
    } catch (error) {
      console.error('Error fetching organisations:', error);
    }
  }, []);

  useEffect(() => {
    fetchOrganisations();
  }, [fetchOrganisations]);

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

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const registerData = {
        firstname: formData.firstname,
        lastname: formData.lastname,
        email: formData.email,
        mobileno: formData.mobileno,
        username: formData.username,
        password: formData.password,
        organisation: formData.organisation || null
      };

      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/auth/register`, registerData);
      const { token, user } = response.data;

      // Store token in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Set authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      onLogin(user);
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed';
      if (msg.includes('duplicate key error') && msg.includes('name_1')) {
        setError('A fuel station with this name already exists. Please choose a different name.');
      } else if (msg.includes('username') && msg.includes('organisation')) {
        setError('This username is already taken in this fuel station.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2><i className="fas fa-user-plus"></i> Register for Petrol Management</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstname">First Name</label>
              <input
                type="text"
                id="firstname"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                required
                placeholder="Enter first name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastname">Last Name</label>
              <input
                type="text"
                id="lastname"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                required
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="mobileno">Mobile Number</label>
            <input
              type="tel"
              id="mobileno"
              name="mobileno"
              value={formData.mobileno}
              onChange={handleChange}
              required
              placeholder="Enter mobile number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Choose a username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="organisation">Organization (Optional)</label>
            <select
              id="organisation"
              name="organisation"
              value={formData.organisation}
              onChange={handleChange}
            >
              <option value="">Select an organization (leave empty to create new)</option>
              {organisations.map(org => (
                <option key={org._id} value={org._id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter password (min 6 characters)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Registering...</> : <><i className="fas fa-user-check"></i> Register</>}
          </button>
        </form>

        <div className="auth-links">
          <p>Use the toggle below to switch to login</p>
        </div>
      </div>
    </div>
  );
};

export default Register;