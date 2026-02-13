import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = ({ organizationFilter, currentUser }) => {
  const [stats, setStats] = useState({
    organizations: 0,
    users: 0,
    fuels: 0,
    fuelRequests: 0,
    totalPrice: 0,
    totalQuantity: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: '',
    fuel: ''
  });
  const [fuels, setFuels] = useState([]);

  const getVisibleStats = useCallback(() => {
    if (!currentUser) return [];

    switch (currentUser.role) {
      case 'admin':
        return ['organizations', 'users', 'fuels', 'fuelRequests'];
      case 'manager':
        return ['users', 'fuels', 'fuelRequests'];
      case 'purchaser':
        return ['fuelRequests']; // Only transactions
      case 'salesman':
        return ['fuelRequests']; // Only transactions
      default:
        return ['fuelRequests'];
    }
  }, [currentUser]);

  const visibleStats = getVisibleStats();

  const fetchStats = useCallback(async () => {
    try {
      let orgUrl = `${process.env.REACT_APP_API_BASE_URL}/organisations`;
      let userUrl = `${process.env.REACT_APP_API_BASE_URL}/users`;
      let fuelUrl = `${process.env.REACT_APP_API_BASE_URL}/fuels`;

      const params = new URLSearchParams();
      if (currentUser?.role !== 'admin') {
        params.append('organisation', currentUser.organisation._id);
      } else if (organizationFilter) {
        params.append('organisation', organizationFilter);
      }

      const queryString = params.toString();
      if (queryString) {
        orgUrl += `?${queryString}`;
        userUrl += `?${queryString}`;
        fuelUrl += `?${queryString}`;
      }

      const [orgRes, userRes, fuelRes] = await Promise.all([
        currentUser?.role === 'admin' ? axios.get(orgUrl) : Promise.resolve({ data: [] }),
        ['admin', 'manager'].includes(currentUser?.role) ? axios.get(userUrl) : Promise.resolve({ data: [] }),
        axios.get(fuelUrl)
      ]);

      setStats(prev => ({
        ...prev,
        organizations: Array.isArray(orgRes.data) ? orgRes.data.length : (orgRes.data.data?.length || 0),
        users: Array.isArray(userRes.data) ? userRes.data.length : (userRes.data.data?.length || 0),
        fuels: Array.isArray(fuelRes.data) ? fuelRes.data.length : (fuelRes.data.data?.length || 0)
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [currentUser, organizationFilter]);

  const fetchTransactionStats = useCallback(async () => {
    try {
      if (!currentUser) return;

      // Fetch ALL filtered transactions (high limit)
      let transUrl = `${process.env.REACT_APP_API_BASE_URL}/data?limit=10000`;

      // Organization filter
      if (currentUser.role !== 'admin') {
        transUrl += `&organisation=${currentUser.organisation._id}`;
      } else if (organizationFilter) {
        transUrl += `&organisation=${organizationFilter}`;
      }

      // Role-based filters
      if (currentUser.role === 'purchaser') {
        transUrl += `&user=${currentUser.id}`;
      } else if (currentUser.role === 'salesman') {
        transUrl += `&assignedTo=${currentUser.id}`;
      }

      // Add filters
      if (filters.search) transUrl += `&search=${encodeURIComponent(filters.search)}`;
      if (filters.status) transUrl += `&status=${filters.status}`;
      if (filters.startDate) transUrl += `&startDate=${filters.startDate}`;
      if (filters.endDate) transUrl += `&endDate=${filters.endDate}`;
      if (filters.fuel) transUrl += `&fuel=${filters.fuel}`;

      const response = await axios.get(transUrl);
      const allTransactions = response.data.data || [];

      // Calculate stats
      const count = allTransactions.length;
      const totalPrice = allTransactions.reduce((sum, t) => sum + (t.totalPrice || 0), 0);
      const totalQuantity = allTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);

      setStats(prev => ({
        ...prev,
        fuelRequests: count,
        totalPrice: totalPrice,
        totalQuantity: totalQuantity
      }));
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
    }
  }, [currentUser, organizationFilter, filters]);

  const fetchTransactions = useCallback(async () => {
    try {
      if (!currentUser) return;

      let transUrl = `${process.env.REACT_APP_API_BASE_URL}/data?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}`;

      // Organization filter
      if (currentUser.role !== 'admin') {
        transUrl += `&organisation=${currentUser.organisation._id}`;
      } else if (organizationFilter) {
        transUrl += `&organisation=${organizationFilter}`;
      }

      // Role-based filters
      if (currentUser.role === 'purchaser') {
        transUrl += `&user=${currentUser.id}`;
      } else if (currentUser.role === 'salesman') {
        transUrl += `&assignedTo=${currentUser.id}`;
      }

      // Add filters
      if (filters.search) transUrl += `&search=${encodeURIComponent(filters.search)}`;
      if (filters.status) transUrl += `&status=${filters.status}`;
      if (filters.startDate) transUrl += `&startDate=${filters.startDate}`;
      if (filters.endDate) transUrl += `&endDate=${filters.endDate}`;
      if (filters.fuel) transUrl += `&fuel=${filters.fuel}`;

      const response = await axios.get(transUrl);
      setTransactions(response.data.data || []);
      setPagination(response.data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
        hasNext: false,
        hasPrev: false
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
        hasNext: false,
        hasPrev: false
      });
    }
  }, [currentUser, organizationFilter, filters, pagination.currentPage, pagination.itemsPerPage]);

  const fetchFuels = useCallback(async () => {
    try {
      let fuelUrl = `${process.env.REACT_APP_API_BASE_URL}/fuels`;
      if (currentUser?.role !== 'admin') {
        fuelUrl += `?organisation=${currentUser.organisation._id}`;
      } else if (organizationFilter) {
        fuelUrl += `?organisation=${organizationFilter}`;
      }
      const response = await axios.get(fuelUrl);
      const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
      setFuels(data);
    } catch (error) {
      console.error('Error fetching fuels:', error);
      setFuels([]);
    }
  }, [currentUser, organizationFilter]);


  useEffect(() => {
    if (currentUser) {
      fetchStats();
      fetchTransactions();
      fetchFuels();
      fetchTransactionStats();
      setLoading(false);
    }
  }, [currentUser, fetchStats, fetchTransactions, fetchFuels, fetchTransactionStats]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      startDate: '',
      endDate: '',
      fuel: ''
    });
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard Overview</h1>

      <div className="stats-grid">
        {visibleStats.includes('organizations') && (
          <div className="stat-card organizations">
            <div className="stat-icon"><i className="fas fa-building"></i></div>
            <div className="stat-content">
              <h3>{stats.organizations}</h3>
              <p>Fuel Stations</p>
            </div>
          </div>
        )}

        {visibleStats.includes('users') && (
          <div className="stat-card users">
            <div className="stat-icon"><i className="fas fa-users"></i></div>
            <div className="stat-content">
              <h3>{stats.users}</h3>
              <p>Users</p>
            </div>
          </div>
        )}

        {visibleStats.includes('fuels') && (
          <div className="stat-card fuels">
            <div className="stat-icon"><i className="fas fa-oil-can"></i></div>
            <div className="stat-content">
              <h3>{stats.fuels}</h3>
              <p>Fuel Types</p>
            </div>
          </div>
        )}

        {visibleStats.includes('fuelRequests') && (
          <>
            <div className="stat-card transactions">
              <div className="stat-icon"><i className="fas fa-chart-line"></i></div>
              <div className="stat-content">
                <h3>{stats.fuelRequests}</h3>
                <p>Fuel Requests</p>
              </div>
            </div>

            <div className="stat-card total-price">
              <div className="stat-icon"><i className="fas fa-money-bill-wave"></i></div>
              <div className="stat-content">
                <h3>${stats.totalPrice.toFixed(2)}</h3>
                <p>Total Amount</p>
              </div>
            </div>

            <div className="stat-card total-quantity">
              <div className="stat-icon"><i className="fas fa-gas-pump"></i></div>
              <div className="stat-content">
                <h3>{stats.totalQuantity.toFixed(2)}</h3>
                <p>Total Quantity</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Transactions Section */}
      {currentUser && (
        <div className="transactions-section">
          <h2>
            {currentUser.role === 'purchaser' ? 'My Purchases' :
              currentUser.role === 'salesman' ? 'My Sales' :
                'All Fuel Requests'}
          </h2>

          {/* Filters */}
          <div className="filters">
            <div className="filter-row">
              <input
                type="text"
                name="search"
                placeholder="Search requests..."
                value={filters.search}
                onChange={handleFilterChange}
              />
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                name="fuel"
                value={filters.fuel}
                onChange={handleFilterChange}
              >
                <option value="">All Fuels</option>
                {fuels.map(fuel => (
                  <option key={fuel._id} value={fuel._id}>{fuel.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-row">
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
              <button onClick={resetFilters} className="reset-btn">
                <i className="fas fa-undo"></i> Reset Filters
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="transactions-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fuel</th>
                  <th>Quantity</th>
                  <th>Total Price</th>
                  <th>Status</th>
                  {currentUser.role === 'admin' && <th>User</th>}
                  {currentUser.role === 'admin' && <th>Assigned To</th>}
                </tr>
              </thead>
              <tbody>
                {transactions && transactions.length > 0 ? (
                  transactions.map(transaction => (
                    <tr key={transaction._id}>
                      <td>{new Date(transaction.transactionDate).toLocaleDateString()}</td>
                      <td>{transaction.fuel?.name || 'N/A'}</td>
                      <td>{transaction.quantity}</td>
                      <td>${transaction.totalPrice}</td>
                      <td>
                        <span className={`status ${transaction.status}`}>
                          {transaction.status}
                        </span>
                      </td>
                      {currentUser.role === 'admin' && (
                        <td>{transaction.user?.firstname} {transaction.user?.lastname}</td>
                      )}
                      {currentUser.role === 'admin' && (
                        <td>{transaction.assignedTo?.firstname} {transaction.assignedTo?.lastname}</td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={currentUser.role === 'admin' ? 7 : 5} style={{ textAlign: 'center', padding: '20px' }}>
                      No fuel requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev}
              >
                Previous
              </button>
              <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNext}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-info">
        <h2>Welcome to Petrol Management System</h2>
        <p>Manage your fuel stations, users, and fuel requests efficiently.</p>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            {currentUser?.role === 'admin' && (
              <>
                <button className="action-btn primary"><i className="fas fa-plus"></i> Add Fuel Station</button>
                <button className="action-btn secondary"><i className="fas fa-plus"></i> Add User</button>
              </>
            )}
            {currentUser?.role === 'manager' && (
              <button className="action-btn secondary"><i className="fas fa-plus"></i> Add User</button>
            )}
            <button className="action-btn success"><i className="fas fa-plus"></i> Add Fuel</button>
            <button className="action-btn info"><i className="fas fa-eye"></i> View Fuel Requests</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;