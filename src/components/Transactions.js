import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Transactions.css';
import { getInvoiceHtml } from '../utils/InvoiceTemplate';

const Transactions = ({ organizationFilter }) => {
  const [transactions, setTransactions] = useState([]);
  const [fuels, setFuels] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [machines, setMachines] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [assigningTransactionId, setAssigningTransactionId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [pagination, setPagination] = useState({
    hasNext: false,
    hasPrev: false
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'transactionDate', direction: 'desc' });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: '',
    fuel: '',
    user: '', // Purchaser
    salesman: '', // Assigned To
    vehicleNumber: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [summaryStats, setSummaryStats] = useState({
    count: 0,
    totalPrice: 0,
    totalQuantity: 0
  });
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unassigned', 'pending', 'completed'
  const [formData, setFormData] = useState(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const currentDate = new Date().toISOString().split('T')[0];
    const purchaserName = user && user.role === 'purchaser' ? `${user.firstname} ${user.lastname}` : '';

    return {
      fuel: '',
      user: '',
      organisation: '',
      quantity: '',
      vehicleType: '',
      vehicleNumber: '',
      transactionDate: user && user.role === 'purchaser' ? currentDate : '',
      status: 'pending',
      notes: '',
      createdby: purchaserName,
      machine: null
    };
  });

  const handleExportExcel = useCallback(async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user'));
      const params = new URLSearchParams();

      if (user && user.role !== 'admin') {
        params.append('organisation', user.organisation._id);
      } else if (organizationFilter) {
        params.append('organisation', organizationFilter);
      }

      if (filters.search) params.append('search', filters.search);

      let statusFilter = '';
      if (activeTab === 'unassigned') {
        statusFilter = 'pending';
        params.append('assigned', 'false');
      } else if (activeTab === 'pending') {
        statusFilter = 'pending';
        params.append('assigned', 'true');
      } else if (activeTab === 'completed') {
        statusFilter = 'completed';
      } else if (filters.status) {
        statusFilter = filters.status;
      }

      if (statusFilter) params.append('status', statusFilter);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.fuel) params.append('fuel', filters.fuel);
      if (filters.user) params.append('user', filters.user);
      if (filters.salesman) params.append('assignedTo', filters.salesman);
      if (filters.vehicleNumber) params.append('vehicleNumber', filters.vehicleNumber);

      if (user.role === 'purchaser') params.append('user', user._id);
      if (user.role === 'salesman') params.append('assignedTo', user._id);

      const url = `${process.env.REACT_APP_API_BASE_URL}/data/export?${params.toString()}`;

      const response = await axios.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error exporting excel", error);
      alert("Failed to export excel");
    } finally {
      setLoading(false);
    }
  }, [organizationFilter, filters, activeTab]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const fetchTransactionStats = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;

      let statsUrl = `${process.env.REACT_APP_API_BASE_URL}/data/stats?`;
      const params = new URLSearchParams();

      if (user.role !== 'admin') {
        params.append('organisation', user.organisation._id);
      } else if (organizationFilter) {
        params.append('organisation', organizationFilter);
      }

      // Role-based filters
      if (user.role === 'purchaser') {
        params.append('user', user._id);
      } else if (user.role === 'salesman') {
        params.append('assignedTo', user._id);
      }

      // Add filters
      if (filters.search) params.append('search', filters.search);

      let statusFilter = '';
      if (activeTab === 'unassigned') {
        statusFilter = 'pending';
        params.append('assigned', 'false');
      } else if (activeTab === 'pending') {
        statusFilter = 'pending';
        params.append('assigned', 'true');
      } else if (activeTab === 'completed') {
        statusFilter = 'completed';
      } else if (filters.status) {
        statusFilter = filters.status;
      }

      if (statusFilter) params.append('status', statusFilter);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.fuel) params.append('fuel', filters.fuel);
      if (filters.user) params.append('user', filters.user);
      if (filters.vehicleNumber) params.append('vehicleNumber', filters.vehicleNumber);

      const response = await axios.get(statsUrl + params.toString());
      const stats = response.data || { count: 0, totalPrice: 0, totalQuantity: 0 };

      setSummaryStats({
        count: stats.count,
        totalPrice: stats.totalPrice,
        totalQuantity: stats.totalQuantity
      });
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
    }
  }, [activeTab, organizationFilter, filters]);

  const fetchData = useCallback(async (page = 1, limit = itemsPerPage) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      setCurrentUser(user);

      // Build transaction URL with filters
      let transUrl = `${process.env.REACT_APP_API_BASE_URL}/data?page=${page}&limit=${limit}`;
      if (user && user.role !== 'admin') {
        transUrl += `&organisation=${user.organisation._id}`;
      } else if (organizationFilter) {
        transUrl += `&organisation=${organizationFilter}`;
      }

      // Add filters
      if (filters.search) transUrl += `&search=${encodeURIComponent(filters.search)}`;

      // Handle tab-based status filtering
      let statusFilter = '';
      if (activeTab === 'unassigned') {
        statusFilter = 'pending';
        transUrl += `&assigned=false`; // Only unassigned transactions
      } else if (activeTab === 'pending') {
        statusFilter = 'pending';
        transUrl += `&assigned=true`; // Only assigned transactions with pending status
      } else if (activeTab === 'completed') {
        statusFilter = 'completed';
      } else if (filters.status) {
        statusFilter = filters.status;
      }

      if (statusFilter) transUrl += `&status=${statusFilter}`;

      if (filters.startDate) transUrl += `&startDate=${filters.startDate}`;
      if (filters.endDate) transUrl += `&endDate=${filters.endDate}`;
      if (filters.fuel) transUrl += `&fuel=${filters.fuel}`;
      if (filters.user) transUrl += `&user=${filters.user}`;
      if (filters.vehicleNumber) transUrl += `&vehicleNumber=${encodeURIComponent(filters.vehicleNumber)}`;

      // Role-based visibility enforcement
      if (user.role === 'purchaser') {
        transUrl += `&user=${user.id}`;
      } else if (user.role === 'salesman') {
        transUrl += `&assignedTo=${user.id}`;
      }

      // Add sorting
      if (sortConfig.key) {
        transUrl += `&sortBy=${sortConfig.key}&sortOrder=${sortConfig.direction}`;
      }

      // Fetch users - for non-admin users, only get users from their organization
      let usersUrl = `${process.env.REACT_APP_API_BASE_URL}/users?page=1&limit=1000`; // Increased limit
      if (user && user.role !== 'admin') {
        usersUrl += `&organisation=${user.organisation._id}`;
      } else if (organizationFilter) {
        usersUrl += `&organisation=${organizationFilter}`;
      }

      // Fetch organizations - for non-admin users, only get their organization
      let orgsUrl = `${process.env.REACT_APP_API_BASE_URL}/organisations?page=1&limit=1000`; // Increased limit
      if (user && user.role !== 'admin') {
        orgsUrl += `&organisation=${user.organisation._id}`;
      } else if (organizationFilter) {
        orgsUrl += `&organisation=${organizationFilter}`;
      }

      // Fetch fuels - for admin, manager, and purchaser
      let fuelsPromise = Promise.resolve({ data: [] });
      if (user && ['admin', 'manager', 'purchaser'].includes(user.role)) {
        let fuelsUrl = `${process.env.REACT_APP_API_BASE_URL}/fuels?page=1&limit=1000`; // Increased limit
        if (user.role !== 'admin') {
          fuelsUrl += `&organisation=${user.organisation._id}`;
        } else if (organizationFilter) {
          fuelsUrl += `&organisation=${organizationFilter}`;
        }
        fuelsPromise = axios.get(fuelsUrl);
      }

      // Fetch users - only for admin and manager
      let usersPromise = Promise.resolve({ data: [] });
      if (user && ['admin', 'manager'].includes(user.role)) {
        usersPromise = axios.get(usersUrl);
      }

      // Fetch machines - for salesman and admin/manager (NOT for purchaser)
      let machinesPromise = Promise.resolve({ data: [] });
      if (user && user.role !== 'purchaser') {
        let machinesUrl = `${process.env.REACT_APP_API_BASE_URL}/machines?page=1&limit=1000&isactive=true`;
        if (user.role === 'salesman') {
          machinesUrl += '&mine=true';
        } else if (user.role !== 'admin') {
          machinesUrl += `&organisation=${user.organisation._id}`;
        } else if (organizationFilter) {
          machinesUrl += `&organisation=${organizationFilter}`;
        }
        machinesPromise = axios.get(machinesUrl);
      }

      const [transRes, fuelsRes, usersRes, orgsRes, machinesRes] = await Promise.all([
        axios.get(transUrl),
        fuelsPromise,
        usersPromise,
        axios.get(orgsUrl),
        machinesPromise
      ]);

      setTransactions(transRes.data.data);
      setPagination(transRes.data.pagination);
      setFuels(fuelsRes.data?.data || fuelsRes.data || []);
      setUsers(usersRes.data?.data || usersRes.data || []);
      setOrganizations(orgsRes.data?.data || orgsRes.data || []);
      const machinesList = machinesRes.data?.data || machinesRes.data || [];
      setMachines(machinesList);

      // Auto-select if only one machine
      if (user && user.role === 'salesman' && machinesList.length === 1) {
        setSelectedMachine(machinesList[0]._id);
      }

      // Also fetch stats whenever fetchData is called with filters
      fetchTransactionStats();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, organizationFilter, filters, sortConfig, fetchTransactionStats, itemsPerPage]);

  useEffect(() => {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);

    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [activeTab, organizationFilter, filters, fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validation
      if (!formData.fuel) {
        alert('Please select a fuel type');
        return;
      }
      if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
        alert('Please enter a valid quantity');
        return;
      }

      let transactionData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        transactionDate: formData.transactionDate || new Date().toISOString()
      };

      // For non-admin users, automatically set their organization
      if (currentUser && currentUser.role !== 'admin') {
        transactionData.organisation = currentUser.organisation._id || currentUser.organisation;
      }

      // For purchasers, auto-set current date and don't send user field
      if (currentUser && currentUser.role === 'purchaser') {
        transactionData.transactionDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
        // Remove user field for purchasers as it will be set to purchaser's ID in backend
        delete transactionData.user;
      }

      if (editingTransaction) {
        await axios.put(`${process.env.REACT_APP_API_BASE_URL}/data/${editingTransaction._id}`, {
          ...transactionData,
          updateby: formData.createdby
        });
      } else {
        await axios.post(`${process.env.REACT_APP_API_BASE_URL}/data`, transactionData);
      }
      fetchData();
      resetForm();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert(`Error saving transaction: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      fuel: transaction.fuel?._id || transaction.fuel,
      user: transaction.user?._id || transaction.user,
      organisation: transaction.organisation?._id || transaction.organisation,
      quantity: transaction.quantity,
      vehicleType: transaction.vehicleType || '',
      vehicleNumber: transaction.vehicleNumber || '',
      transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate).toISOString().split('T')[0] : '',
      status: transaction.status || 'pending',
      notes: transaction.notes || '',
      createdby: transaction.createdby
    });
    setShowForm(true);
  };

  const handleAssign = (transactionId) => {
    setAssigningTransactionId(transactionId);
    setShowMachineModal(true);
  };

  const submitAssign = async () => {
    if (!selectedMachine) {
      alert('Please select a machine');
      return;
    }

    try {
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/data/${assigningTransactionId}/assign`, {
        machine: selectedMachine,
        updateby: currentUser.firstname + ' ' + currentUser.lastname
      });
      fetchData();
      setShowMachineModal(false);
      setSelectedMachine('');
      setAssigningTransactionId(null);
      alert('Transaction assigned successfully!');
    } catch (error) {
      console.error('Error assigning transaction:', error);
      alert(error.response?.data?.message || 'Error assigning transaction');
    }
  };

  const handleReject = async (transactionId) => {
    if (window.confirm('Are you sure you want to reject this transaction?')) {
      try {
        await axios.put(`${process.env.REACT_APP_API_BASE_URL}/data/${transactionId}/reject`, {
          updateby: currentUser.firstname + ' ' + currentUser.lastname
        });
        fetchData();
        alert('Transaction rejected successfully!');
      } catch (error) {
        console.error('Error rejecting transaction:', error);
        alert(error.response?.data?.message || 'Error rejecting transaction');
      }
    }
  };

  const handleApprove = async (transactionId) => {
    if (window.confirm('Are you sure you want to approve this transaction?')) {
      try {
        await axios.put(`${process.env.REACT_APP_API_BASE_URL}/data/${transactionId}/approve`, {
          updateby: currentUser.firstname + ' ' + currentUser.lastname
        });
        fetchData();
        alert('Transaction approved successfully!');
      } catch (error) {
        console.error('Error approving transaction:', error);
        alert(error.response?.data?.message || 'Error approving transaction');
      }
    }
  };

  const handleDelete = async (transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/data/${transactionId}`);
        fetchData();
        alert('Transaction deleted successfully!');
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction');
      }
    }
  };

  const resetForm = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    const purchaserName = currentUser && currentUser.role === 'purchaser' ? `${currentUser.firstname} ${currentUser.lastname}` : '';

    setFormData({
      fuel: '',
      user: '',
      organisation: '',
      quantity: '',
      vehicleType: '',
      vehicleNumber: '',
      transactionDate: currentUser && currentUser.role === 'purchaser' ? currentDate : '',
      status: 'pending',
      notes: '',
      createdby: purchaserName,
      machine: null
    });
    setEditingTransaction(null);
    setShowForm(false);
  };

  const getFuelName = (fuelId) => {
    if (!fuelId) return 'Unknown';
    // Handle both populated object and ID string
    const fuel = typeof fuelId === 'object' ? fuelId : fuels.find(f => f._id === fuelId);
    return fuel ? fuel.name : 'Unknown';
  };

  const getUserName = (userId) => {
    if (!userId) return 'Unknown';
    // Handle populated object case first
    if (typeof userId === 'object' && userId !== null) {
      if (userId.firstname) return `${userId.firstname} ${userId.lastname || ''}`.trim();
      if (userId.name) return userId.name;
    }
    // Handle ID string case
    const user = users.find(u => u._id === (userId._id || userId));
    return user ? `${user.firstname} ${user.lastname}` : 'Unknown';
  };

  const getOrgName = (orgId) => {
    if (!orgId) return 'Unknown';
    // Handle both populated object and ID string
    const org = typeof orgId === 'object' ? orgId : organizations.find(o => o._id === orgId);
    return org ? org.name : 'Unknown';
  };

  const calculateTotal = (transaction) => {
    if (!transaction.fuel || !transaction.quantity) return 'N/A';
    // Handle both populated object and ID string
    const fuel = typeof transaction.fuel === 'object' ? transaction.fuel : fuels.find(f => f._id === transaction.fuel);
    return fuel ? (transaction.quantity * fuel.rate).toFixed(2) : 'N/A';
  };

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  // Filter users for dropdowns
  const purchasers = users.filter(u => u.role === 'purchaser' || u.roleid === 'purchaser');
  const salesmen = users.filter(u => u.role === 'salesman' || u.roleid === 'salesman');

  return (
    <div className="transactions">
      <div className="header">
        <h1><i className="fas fa-gas-pump"></i> Fuel Requests Management</h1>
        <div className="header-actions">
          <button
            className={`btn-filter ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="fas fa-search"></i> {showFilters ? 'Hide Search' : 'Search'}
          </button>
          {currentUser && currentUser.role !== 'salesman' && (
            <button
              className="btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? <><i className="fas fa-times"></i> Cancel</> : <><i className="fas fa-plus"></i> Add Fuel Request</>}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingTransaction ? 'Edit Fuel Request' : 'Add New Fuel Request'}</h2>
            <form className="transaction-form-modal" onSubmit={handleSubmit} style={{ padding: 0, border: 'none', boxShadow: 'none', maxWidth: 'none', margin: 0 }}>
              <div className="form-row">
                {currentUser && ['admin', 'manager', 'salesman', 'purchaser'].includes(currentUser.role) && (
                  <div className="form-group">
                    <label>Fuel:</label>
                    <select
                      value={formData.fuel}
                      onChange={(e) => setFormData({ ...formData, fuel: e.target.value })}
                      required
                    >
                      <option value="">Select Fuel</option>
                      {fuels.map(fuel => (
                        <option key={fuel._id} value={fuel._id}>{fuel.name} (₹{fuel.rate}/{fuel.unit})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                {currentUser && ['admin', 'manager'].includes(currentUser.role) && (
                  <div className="form-group">
                    <label>User:</label>
                    <select
                      value={formData.user}
                      onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                      required
                    >
                      <option value="">Select User</option>
                      {users.map(user => (
                        <option key={user._id} value={user._id}>{user.firstname} {user.lastname}</option>
                      ))}
                    </select>
                  </div>
                )}
                {currentUser && currentUser.role === 'admin' && (
                  <div className="form-group">
                    <label>Fuel Station:</label>
                    <select
                      value={formData.organisation}
                      onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                      required
                    >
                      <option value="">Select Fuel Station</option>
                      {organizations.map(org => (
                        <option key={org._id} value={org._id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {currentUser && currentUser.role !== 'admin' && (
                  <div className="form-group">
                    <label>Fuel Station:</label>
                    <input
                      type="text"
                      value={currentUser.organisation?.name || 'Your Fuel Station'}
                      readOnly
                      className="readonly-input"
                    />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle Type:</label>
                  <input
                    type="text"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    placeholder="e.g. Truck, Car, Bike"
                  />
                </div>
                <div className="form-group">
                  <label>Vehicle Number:</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="e.g. ABC-1234"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Transaction Date:</label>
                  {currentUser && currentUser.role === 'purchaser' ? (
                    <input
                      type="text"
                      value={new Date().toLocaleDateString()}
                      readOnly
                      className="readonly-input"
                    />
                  ) : (
                    <input
                      type="date"
                      value={formData.transactionDate}
                      onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    />
                  )}
                </div>
                <div className="form-group">
                  <label>Created By:</label>
                  {currentUser && currentUser.role === 'purchaser' ? (
                    <input
                      type="text"
                      value={`${currentUser.firstname} ${currentUser.lastname}`}
                      readOnly
                      className="readonly-input"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.createdby}
                      onChange={(e) => setFormData({ ...formData, createdby: e.target.value })}
                      required
                    />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Notes:</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="2"
                />
              </div>

              <div className="form-actions" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                <button type="submit" className="btn-success">
                  <i className="fas fa-save"></i> {editingTransaction ? 'Update' : 'Create'} Request
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Stats Section */}
      <div className="transaction-summary-stats">
        <div className="summary-stat-card">
          <span className="summary-stat-label"><i className="fas fa-file-invoice"></i> Total Fuel Requests</span>
          <span className="summary-stat-value">{summaryStats.count}</span>
        </div>
        <div className="summary-stat-card">
          <span className="summary-stat-label"><i className="fas fa-money-bill-wave"></i> Total Amount</span>
          <span className="summary-stat-value">₹{summaryStats.totalPrice.toFixed(2)}</span>
        </div>
        <div className="summary-stat-card">
          <span className="summary-stat-label"><i className="fas fa-oil-can"></i> Total Quantity</span>
          <span className="summary-stat-value">{summaryStats.totalQuantity.toFixed(2)} L</span>
        </div>
      </div>

      {/* Transaction Status Tabs */}
      <div className="transaction-tabs">
        <button
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Requests
        </button>
        <button
          className={`tab-button ${activeTab === 'unassigned' ? 'active' : ''}`}
          onClick={() => setActiveTab('unassigned')}
        >
          Unassigned
        </button>
        <button
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending
        </button>
        <button
          className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      {/* Filters Section */}
      <div className={`filters-wrapper ${showFilters ? 'expanded' : ''}`}>
        <div className="filters-section">
          <div className="filters-row">
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search requests..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="filter-input"
              />
            </div>

            {activeTab === 'all' && (
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="filter-select"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}

            <div className="filter-group">
              <label>Vehicle Number</label>
              <input
                type="text"
                placeholder="Vehicle Number"
                value={filters.vehicleNumber}
                onChange={(e) => setFilters({ ...filters, vehicleNumber: e.target.value })}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                placeholder="Start Date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                placeholder="End Date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="filter-input"
              />
            </div>

            {currentUser && ['admin', 'manager'].includes(currentUser.role) && (
              <>
                <div className="filter-group">
                  <label>Fuel</label>
                  <select
                    value={filters.fuel}
                    onChange={(e) => setFilters({ ...filters, fuel: e.target.value })}
                    className="filter-select"
                  >
                    <option value="">All Fuels</option>
                    {fuels.map(fuel => (
                      <option key={fuel._id} value={fuel._id}>{fuel.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Purchaser</label>
                  <select
                    value={filters.user}
                    onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                    className="filter-select"
                  >
                    <option value="">All Purchasers</option>
                    {purchasers.map(user => (
                      <option key={user._id} value={user._id}>{user.firstname} {user.lastname}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Salesman</label>
                  <select
                    value={filters.salesman}
                    onChange={(e) => setFilters({ ...filters, salesman: e.target.value })}
                    className="filter-select"
                  >
                    <option value="">All Salesmen</option>
                    {salesmen.map(user => (
                      <option key={user._id} value={user._id}>{user.firstname} {user.lastname}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* <div className="filter-actions" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end', marginTop: '10px' }}> */}
            <button
              onClick={() => {
                setFilters({
                  search: '',
                  status: '',
                  startDate: '',
                  endDate: '',
                  fuel: '',
                  user: '',
                  salesman: '',
                  vehicleNumber: ''
                });
                setActiveTab('all');
                fetchData();
              }}
              className="btn-secondary"
            >
              <i className="fas fa-undo"></i> Reset
            </button>
            <button onClick={() => fetchData()} className="btn-primary">
              <i className="fas fa-filter"></i> Apply
            </button>
            <button onClick={handleExportExcel} className="btn-excel">
              <i className="fas fa-file-excel"></i> Excel
            </button>
          </div>
        </div>
      </div>

      <div className="transactions-list-table table-responsive">
        {transactions.length === 0 ? (
          <p className="no-data">No fuel requests found. Create your first request!</p>
        ) : (
          <table className="collections-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('transactionDate')} style={{ cursor: 'pointer' }}>Date {sortConfig.key === 'transactionDate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Machine</th>
                <th>Salesman</th>
                <th onClick={() => handleSort('fuel')} style={{ cursor: 'pointer' }}>Fuel {sortConfig.key === 'fuel' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>Qty {sortConfig.key === 'quantity' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('totalPrice')} style={{ cursor: 'pointer' }}>Amount {sortConfig.key === 'totalPrice' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('user')} style={{ cursor: 'pointer' }}>Purchaser {sortConfig.key === 'user' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('vehicleNumber')} style={{ cursor: 'pointer' }}>Vehicle {sortConfig.key === 'vehicleNumber' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('organisation')} style={{ cursor: 'pointer' }}>Station {sortConfig.key === 'organisation' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction._id}>
                  <td>{transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    {transaction.machine ? (
                      <span className="machine-badge" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', border: '1px solid #bcf0da' }}>
                        <i className="fas fa-gears"></i> {transaction.machine.name || 'Assigned Machine'}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td style={{ fontWeight: '500' }}>
                    {transaction.assignedTo ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fas fa-user-tag" style={{ color: '#0ea5e9' }}></i> {getUserName(transaction.assignedTo)}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not Assigned</span>
                    )}
                  </td>
                  <td>{getFuelName(transaction.fuel)}</td>
                  <td>{transaction.quantity}</td>
                  <td>₹{calculateTotal(transaction)}</td>
                  <td>{getUserName(transaction.user)}</td>
                  <td>{transaction.vehicleNumber || transaction.vehicleType || '-'}</td>
                  <td>{getOrgName(transaction.organisation)}</td>
                  <td><span className={`status-badge ${transaction.status || 'pending'}`}>{transaction.status || 'pending'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {currentUser && currentUser.role === 'salesman' && !transaction.assignedTo && (
                        <button className="btn-primary" onClick={() => handleAssign(transaction._id)}>
                          <i className="fas fa-hand-pointer"></i> Assign
                        </button>
                      )}
                      {currentUser && currentUser.role === 'salesman' && transaction.assignedTo && transaction.assignedTo._id === currentUser.id && (
                        <button className="btn-danger" onClick={() => handleReject(transaction._id)}>
                          <i className="fas fa-ban"></i> Reject
                        </button>
                      )}
                      {currentUser && ['admin', 'manager'].includes(currentUser.role) && transaction.assignedTo && transaction.status === 'pending' && (
                        <button className="btn-approve-sm" onClick={() => handleApprove(transaction._id)} title="Approve">
                          <i className="fas fa-check-circle"></i>
                        </button>
                      )}
                      {((['admin', 'manager', 'purchaser'].includes(currentUser?.role) && transaction.status !== 'completed') ||
                        (currentUser?.role === 'admin' && transaction.status === 'completed')) && (
                          <button className="btn-edit-sm" onClick={() => handleEdit(transaction)} title="Edit">
                            <i className="fas fa-edit"></i>
                          </button>
                        )}
                      {((['admin', 'manager', 'purchaser'].includes(currentUser?.role) && transaction.status !== 'completed') ||
                        (currentUser?.role === 'admin' && transaction.status === 'completed')) && (
                          <button className="btn-delete-sm" onClick={() => handleDelete(transaction._id)} title="Delete">
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        )}
                      {transaction.status === 'completed' && (
                        <button
                          className="btn-invoice-sm"
                          onClick={() => {
                            const html = getInvoiceHtml(transaction);
                            const win = window.open('', '_blank');
                            win.document.write(html);
                            win.document.close();
                          }}
                          title="View Invoice"
                        >
                          <i className="fas fa-file-invoice"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <div className="items-per-page">
          <label style={{ marginRight: '10px' }}>Items per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
            }}
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            {[10, 20, 50, 100, 250, 500, 1000].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn-pagination"
              onClick={() => fetchData(pagination.currentPage - 1)}
              disabled={!pagination.hasPrev}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total items)
            </span>
            <button
              className="btn-pagination"
              onClick={() => fetchData(pagination.currentPage + 1)}
              disabled={!pagination.hasNext}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Machine Selection Modal */}
      {showMachineModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
              <i className="fas fa-gears" style={{ color: '#0ea5e9' }}></i> Select Your Machine
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
              Please select the machine you are currently operating to fulfill this fuel request.
            </p>
            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>Operating Machine:</label>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '16px' }}
                required
              >
                <option value="">-- Choose Machine --</option>
                {machines.map(m => (
                  <option key={m._id} value={m._id}>{m.name} ({m.fuel?.name})</option>
                ))}
              </select>
            </div>
            <div className="form-actions" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
              <button
                className="btn-success"
                onClick={submitAssign}
                style={{ flex: 1 }}
              >
                Confirm & Assign
              </button>
              <button
                className="btn-secondary"
                onClick={() => { setShowMachineModal(false); setSelectedMachine(''); setAssigningTransactionId(null); }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default Transactions;