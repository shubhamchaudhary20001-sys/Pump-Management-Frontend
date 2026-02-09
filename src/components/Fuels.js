import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Fuels.css';


const Fuels = ({ organizationFilter }) => {
  const [fuels, setFuels] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFuel, setEditingFuel] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
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
    unit: '',
    organisation: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'createdat', direction: 'desc' });
  const [formData, setFormData] = useState({
    name: '',
    rate: '',
    unit: 'liter',
    organisation: '',
    createdby: ''
  });

  const fetchData = useCallback(async (page = 1, limit = itemsPerPage) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      setCurrentUser(user);

      // Build fuels URL with filters
      let fuelsUrl = `${process.env.REACT_APP_API_BASE_URL}/fuels?page=${page}&limit=${limit}`;
      if (user && user.role !== 'admin') {
        fuelsUrl += `&organisation=${user.organisation._id}`;
      } else if (organizationFilter) {
        fuelsUrl += `&organisation=${organizationFilter}`;
      }

      // Add filters
      if (filters.search) fuelsUrl += `&search=${encodeURIComponent(filters.search)}`;
      if (filters.unit) fuelsUrl += `&unit=${filters.unit}`;
      if (filters.status) fuelsUrl += `&isactive=${filters.status === 'active'}`;
      if (filters.organisation && user?.role === 'admin') fuelsUrl += `&organisation=${filters.organisation}`;

      // Add sorting
      if (sortConfig.key) {
        fuelsUrl += `&sortBy=${sortConfig.key}&sortOrder=${sortConfig.direction}`;
      }

      // Fetch organizations - for non-admin users, only get their organization
      let orgsUrl = `${process.env.REACT_APP_API_BASE_URL}/organisations?page=1&limit=1000`; // Increased limit
      if (user && user.role !== 'admin') {
        orgsUrl += `&organisation=${user.organisation._id}`;
      } else if (organizationFilter) {
        orgsUrl += `&organisation=${organizationFilter}`;
      }

      const [fuelsRes, orgsRes] = await Promise.all([
        axios.get(fuelsUrl),
        axios.get(orgsUrl)
      ]);

      setFuels(fuelsRes.data.data);
      setPagination(fuelsRes.data.pagination);
      setOrganizations(orgsRes.data?.data || orgsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationFilter, filters, sortConfig, itemsPerPage]);

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
      else if (organizationFilter) params.append('organisation', organizationFilter);

      if (filters.search) params.append('search', filters.search);
      if (filters.unit) params.append('unit', filters.unit);
      if (filters.status) params.append('isactive', filters.status === 'active');
      if (filters.organisation && user?.role === 'admin') params.append('organisation', filters.organisation);

      const url = `${process.env.REACT_APP_API_BASE_URL}/fuels/export?${params.toString()}`;

      const response = await axios.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `fuels_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting fuels:', error);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fuelData = {
        ...formData,
        rate: parseFloat(formData.rate)
      };

      // Set organization automatically for non-admin users
      if (currentUser && currentUser.role !== 'admin') {
        fuelData.organisation = currentUser.organisation._id;
      }

      if (editingFuel) {
        await axios.put(`${process.env.REACT_APP_API_BASE_URL}/fuels/${editingFuel._id}`, {
          ...fuelData,
          updateby: formData.createdby
        });
        setMessage({ text: 'Fuel updated successfully!', type: 'success' });
      } else {
        await axios.post(`${process.env.REACT_APP_API_BASE_URL}/fuels`, fuelData);
        setMessage({ text: 'Fuel added successfully!', type: 'success' });
      }
      fetchData();
      resetForm();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error saving fuel:', error);
      setMessage({ text: error.response?.data?.message || 'Error saving fuel!', type: 'error' });
    }
  };

  const handleEdit = (fuel) => {
    setEditingFuel(fuel);
    setFormData({
      name: fuel.name,
      rate: fuel.rate,
      unit: fuel.unit,
      organisation: fuel.organisation?._id || fuel.organisation,
      createdby: fuel.createdby
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this fuel?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/fuels/${id}`);
        setMessage({ text: 'Fuel deleted successfully!', type: 'success' });
        fetchData();
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } catch (error) {
        console.error('Error deleting fuel:', error);
        setMessage({ text: error.response?.data?.message || 'Error deleting fuel!', type: 'error' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      rate: '',
      unit: 'liter',
      organisation: '',
      createdby: ''
    });
    setEditingFuel(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Loading fuels...</div>;
  }

  return (
    <div className="fuels">
      <div className="header">
        <h1>⛽ Fuels Management</h1>
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
            {showForm ? <><i className="fas fa-times"></i> Cancel</> : <><i className="fas fa-plus"></i> Add Fuel</>}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingFuel ? 'Edit Fuel' : 'Add New Fuel'}</h2>
            <form className="fuel-form-modal" onSubmit={handleSubmit} style={{ padding: 0, border: 'none', boxShadow: 'none', maxWidth: 'none', margin: 0 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Fuel Name:</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Unit:</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="liter">Liter</option>
                    <option value="gallon">Gallon</option>
                    <option value="kg">Kilogram</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Rate (per unit):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    required
                  />
                </div>
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

              <div className="form-group">
                <label>Created By:</label>
                <input
                  type="text"
                  value={formData.createdby}
                  onChange={(e) => setFormData({ ...formData, createdby: e.target.value })}
                  required
                />
              </div>

              <div className="form-actions" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                <button type="submit" className="btn-success">
                  <i className="fas fa-save"></i> {editingFuel ? 'Update' : 'Create'} Fuel
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className={`filters-wrapper ${showFilters ? 'expanded' : ''}`}>
        <div className="filters-section">
          <div className="filters-row">
            <div className="filter-group">
              <label>Search Fuel</label>
              <input
                type="text"
                placeholder="Search fuels..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Filter by Unit</label>
              <select
                value={filters.unit}
                onChange={(e) => setFilters({ ...filters, unit: e.target.value })}
                className="filter-select"
              >
                <option value="">All Units</option>
                <option value="liter">Liter</option>
                <option value="gallon">Gallon</option>
                <option value="kg">Kilogram</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
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

            {currentUser && currentUser.role === 'admin' && (
              <div className="filter-group">
                <label>Station</label>
                <select
                  value={filters.organisation}
                  onChange={(e) => setFilters({ ...filters, organisation: e.target.value })}
                  className="filter-select"
                >
                  <option value="">All Fuel Stations</option>
                  {organizations.map(org => (
                    <option key={org._id} value={org._id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* <div className="filter-actions" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end', marginTop: '10px' }}> */}
            <button
              onClick={() => {
                setFilters({
                  search: '',
                  unit: '',
                  organisation: '',
                  status: ''
                });
                fetchData();
              }}
              className="btn-secondary"
            >
              <i className="fas fa-undo"></i> Reset
            </button>
            <button onClick={() => fetchData()} className="btn-primary">
              <i className="fas fa-filter"></i> Apply
            </button>
            <button onClick={handleExport} className="btn-excel">
              <i className="fas fa-file-excel"></i> Excel
            </button>
            {/* </div> */}
          </div>
        </div>
      </div>

      <div className="fuels-list-table table-responsive">
        {fuels.length === 0 ? (
          <p className="no-data">No fuels found. Create your first fuel type!</p>
        ) : (
          <table className="collections-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Fuel Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('rate')} style={{ cursor: 'pointer' }}>Rate {sortConfig.key === 'rate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('unit')} style={{ cursor: 'pointer' }}>Unit {sortConfig.key === 'unit' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Fuel Station</th>
                <th onClick={() => handleSort('isactive')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'isactive' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('createdat')} style={{ cursor: 'pointer' }}>Created {sortConfig.key === 'createdat' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fuels.map(fuel => (
                <tr key={fuel._id}>
                  <td>{fuel.name}</td>
                  <td>₹{fuel.rate}</td>
                  <td>{fuel.unit}</td>
                  <td>{fuel.organisation?.name || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${fuel.isactive ? 'approved' : 'pending'}`}>
                      {fuel.isactive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(fuel.createdat).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="btn-edit-sm" onClick={() => handleEdit(fuel)} title="Edit">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn-delete-sm" onClick={() => handleDelete(fuel._id)} title="Delete">
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

      {/* Pagination Controls */}
      <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <div className="items-per-page">
          <label style={{ marginRight: '10px' }}>Fuels per page:</label>
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
    </div>
  );
};

export default Fuels;