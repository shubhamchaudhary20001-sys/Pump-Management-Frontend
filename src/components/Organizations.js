import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Organizations.css';


const Organizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'createdat', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    name: ''
  });

  const fetchOrganizations = useCallback(async (page = 1, limit = itemsPerPage) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      setCurrentUser(user);

      // Build organizations URL with filters
      let orgsUrl = `${process.env.REACT_APP_API_BASE_URL}/organisations?page=${page}&limit=${limit}`;
      if (user && user.role !== 'admin') {
        orgsUrl += `&organisation=${user.organisation._id}`;
      }

      // Add filters
      if (filters.search) orgsUrl += `&search=${encodeURIComponent(filters.search)}`;
      if (filters.status) orgsUrl += `&isactive=${filters.status === 'active'}`;

      // Add sorting
      if (sortConfig.key) {
        orgsUrl += `&sortBy=${sortConfig.key}&sortOrder=${sortConfig.direction}`;
      }

      const response = await axios.get(orgsUrl);
      setOrganizations(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, sortConfig, itemsPerPage]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExport = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const params = new URLSearchParams();
      if (user && user.role !== 'admin') params.append('organisation', user.organisation._id);

      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('isactive', filters.status === 'active');

      const url = `${process.env.REACT_APP_API_BASE_URL}/organisations/export?${params.toString()}`;

      const response = await axios.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `organizations_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting organizations:', error);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOrg) {
        await axios.put(`${process.env.REACT_APP_API_BASE_URL}/organisations/${editingOrg._id}`, formData);
      } else {
        await axios.post(`${process.env.REACT_APP_API_BASE_URL}/organisations`, formData);
      }
      fetchOrganizations();
      resetForm();
    } catch (error) {
      console.error('Error saving fuel station:', error);
      alert('Error saving fuel station');
    }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      createdby: org.createdby
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this fuel station?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/organisations/${id}`);
        fetchOrganizations();
      } catch (error) {
        console.error('Error deleting fuel station:', error);
        alert('Error deleting fuel station');
      }
    }
  };

  const handleToggleStatus = async (org) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/organisations/${org._id}`, {
        ...org,
        isactive: !org.isactive,
        updateby: currentUser.username
      });
      fetchOrganizations();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Error toggling status');
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingOrg(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Loading fuel stations...</div>;
  }

  return (
    <div className="organizations">
      <div className="header">
        <h1><i className="fas fa-building"></i> Fuel Stations Management</h1>
        <div className="header-actions">
          <button
            className={`btn-filter ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="fas fa-search"></i> {showFilters ? 'Hide Search' : 'Search'}
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <><i className="fas fa-times"></i> Cancel</> : <><i className="fas fa-plus"></i> Add Fuel Station</>}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingOrg ? 'Edit Fuel Station' : 'Add New Fuel Station'}</h2>
            <form className="org-form-modal" onSubmit={handleSubmit} style={{ padding: 0, border: 'none', boxShadow: 'none', maxWidth: 'none', margin: 0 }}>
              <div className="form-group">
                <label>Fuel Station Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-actions" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                <button type="submit" className="btn-success">
                  <i className="fas fa-save"></i> {editingOrg ? 'Update' : 'Create'} Station
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={`filters-wrapper ${showFilters ? 'expanded' : ''}`}>
        <div className="filters-section">
          <div className="filters-row">
            <div className="filter-group">
              <label>Search Stations</label>
              <input
                type="text"
                placeholder="Search by name, address, or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Filter by Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="filter-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    status: ''
                  });
                  fetchOrganizations();
                }}
                className="btn-secondary"
              >
                <i className="fas fa-undo"></i> Reset
              </button>
              <button onClick={() => fetchOrganizations()} className="btn-primary">
                <i className="fas fa-filter"></i> Apply
              </button>
              <button onClick={handleExport} className="btn-excel">
                <i className="fas fa-file-excel"></i> Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="organizations-list-table table-responsive">
        {organizations.length === 0 ? (
          <p className="no-data">No fuel stations found. Create your first fuel station!</p>
        ) : (
          <table className="collections-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('isactive')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'isactive' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('createdat')} style={{ cursor: 'pointer' }}>Created {sortConfig.key === 'createdat' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map(org => (
                <tr key={org._id}>
                  <td>{org.name}</td>
                  <td>
                    <span className={`status-badge ${org.isactive ? 'approved' : 'pending'}`}>
                      {org.isactive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(org.createdat).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {currentUser && currentUser.role === 'admin' && (
                        <label className="switch" title={org.isactive ? 'Deactivate' : 'Activate'}>
                          <input
                            type="checkbox"
                            checked={org.isactive}
                            onChange={() => handleToggleStatus(org)}
                          />
                          <span className="slider"></span>
                        </label>
                      )}
                      <button className="btn-edit-sm" onClick={() => handleEdit(org)} title="Edit">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn-delete-sm" onClick={() => handleDelete(org._id)} title="Delete">
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pagination-container">
        <div className="pagination-info">
          <div>
            Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to {Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} stations
          </div>
          {pagination.totalPages > 1 && (
            <div className="pagination-controls">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => fetchOrganizations(pagination.currentPage - 1, itemsPerPage)}
                className="btn-pagination"
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <span className="page-indicator">Page {pagination.currentPage} of {pagination.totalPages}</span>
              <button
                disabled={!pagination.hasNext}
                onClick={() => fetchOrganizations(pagination.currentPage + 1, itemsPerPage)}
                className="btn-pagination"
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
          <div className="page-size-selector">
            <label>Stations per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                fetchOrganizations(1, Number(e.target.value));
              }}
              className="page-size-select"
            >
              {[10, 20, 50, 100, 250, 500, 1000].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Organizations;