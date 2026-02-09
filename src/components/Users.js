import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Users.css';


const Users = ({ organizationFilter }) => {
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [machines, setMachines] = useState([]); // Add machines state
  const [shifts, setShifts] = useState([]); // Add shifts state
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
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
    role: '',
    organisation: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'createdat', direction: 'desc' });
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    mobileno: '',
    roleid: 'salesman',
    organisation: '',
    username: '',
    password: '',
    assignedMachineIds: [], // Fixed: pluralized and initialized as empty array
    shift: ''
  });

  const fetchData = useCallback(async (page = 1, limit = itemsPerPage) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      setCurrentUser(user);

      // Build users URL with filters
      let usersUrl = `${process.env.REACT_APP_API_BASE_URL}/users?page=${page}&limit=${limit}`;
      if (user && user.role !== 'admin') {
        usersUrl += `&organisation=${user.organisation._id}`;
      } else if (organizationFilter) {
        usersUrl += `&organisation=${organizationFilter}`;
      }

      // Add filters
      if (filters.search) usersUrl += `&search=${encodeURIComponent(filters.search)}`;
      if (filters.role) usersUrl += `&role=${filters.role}`;
      if (filters.organisation && user?.role === 'admin') usersUrl += `&organisation=${filters.organisation}`;

      // Add sorting
      if (sortConfig.key) {
        usersUrl += `&sortBy=${sortConfig.key}&sortOrder=${sortConfig.direction}`;
      }

      // Fetch organizations - for non-admin users, only get their organization
      let orgsUrl = `${process.env.REACT_APP_API_BASE_URL}/organisations?page=1&limit=1000`; // Increased limit
      let machinesUrl = `${process.env.REACT_APP_API_BASE_URL}/machines?isactive=true&limit=1000`; // Increased limit
      let shiftsUrl = `${process.env.REACT_APP_API_BASE_URL}/shifts?isactive=true&limit=1000`;

      if (user && user.role !== 'admin') {
        orgsUrl += `&organisation=${user.organisation._id}`;
        machinesUrl += `&organisation=${user.organisation._id}`;
        shiftsUrl += `&organisation=${user.organisation._id}`;
      } else if (organizationFilter) {
        orgsUrl += `&organisation=${organizationFilter}`;
        machinesUrl += `&organisation=${organizationFilter}`;
        shiftsUrl += `&organisation=${organizationFilter}`;
      }

      const [usersRes, orgsRes, machinesRes, shiftsRes] = await Promise.all([
        axios.get(usersUrl),
        axios.get(orgsUrl),
        axios.get(machinesUrl),
        axios.get(shiftsUrl)
      ]);

      setUsers(usersRes.data.data);
      setPagination(usersRes.data.pagination);
      setOrganizations(orgsRes.data?.data || orgsRes.data || []);
      setMachines(machinesRes.data?.data || machinesRes.data || []);
      setShifts(shiftsRes.data?.data || shiftsRes.data || []);
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
      if (filters.role) params.append('role', filters.role);
      if (filters.organisation && user?.role === 'admin') params.append('organisation', filters.organisation);

      const url = `${process.env.REACT_APP_API_BASE_URL}/users/export?${params.toString()}`;

      const response = await axios.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting users:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`${process.env.REACT_APP_API_BASE_URL}/users/${editingUser._id}`, formData);
      } else {
        await axios.post(`${process.env.REACT_APP_API_BASE_URL}/users`, formData);
      }
      fetchData();
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    // Find all machines assigned to this user
    const assignedMachines = machines.filter(m =>
      m.assignments?.some(a => (a.user?._id || a.user) === user._id)
    );

    setFormData({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      mobileno: user.mobileno,
      roleid: user.roleid,
      organisation: user.organisation?._id || user.organisation,
      username: user.username,
      password: '', // Password usually kept empty on edit
      assignedMachineIds: assignedMachines.map(m => m._id),
      shift: user.shift?._id || user.shift || '',
      isactive: user.isactive
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/users/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
      }
    }
  };


  const resetForm = () => {
    setFormData({
      firstname: '',
      lastname: '',
      email: '',
      mobileno: '',
      roleid: 'salesman',
      organisation: '',
      username: '',
      password: '',
      assignedMachineIds: [],
      shift: '',
      isactive: true
    });
    setEditingUser(null);
    setShowForm(false);
  };

  const getOrgName = (orgId) => {
    const org = organizations.find(o => o._id === orgId);
    return org ? org.name : 'Unknown';
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="users">
      <div className="header">
        <h1>👥 Users Management</h1>
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
            {showForm ? <><i className="fas fa-times"></i> Cancel</> : <><i className="fas fa-plus"></i> Add User</>}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
            <form className="user-form-modal" onSubmit={handleSubmit} style={{ padding: 0, border: 'none', boxShadow: 'none', maxWidth: 'none', margin: 0 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name:</label>
                  <input
                    type="text"
                    value={formData.firstname}
                    onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name:</label>
                  <input
                    type="text"
                    value={formData.lastname}
                    onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mobile:</label>
                  <input
                    type="text"
                    value={formData.mobileno}
                    onChange={(e) => setFormData({ ...formData, mobileno: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Username:</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role:</label>
                  <select
                    value={formData.roleid}
                    onChange={(e) => setFormData({ ...formData, roleid: e.target.value })}
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="purchaser">Purchaser</option>
                    <option value="salesman">Salesman</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Default Shift:</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  >
                    <option value="">No Default Shift</option>
                    {shifts.map(shift => (
                      <option key={shift._id} value={shift._id}>{shift.name} ({shift.startTime} - {shift.endTime})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Machine Assignment for Salesman or Manager */}
              {
                (formData.roleid === 'salesman' || formData.roleid === 'manager') && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Assign Machines:</label>
                      <div className="checkbox-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                        {machines
                          .map(m => {
                            const isAssigned = formData.assignedMachineIds.includes(m._id);
                            return (
                              <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="checkbox"
                                  id={`machine-${m._id}`}
                                  checked={isAssigned}
                                  onChange={(e) => {
                                    const newIds = e.target.checked
                                      ? [...formData.assignedMachineIds, m._id]
                                      : formData.assignedMachineIds.filter(id => id !== m._id);
                                    setFormData({ ...formData, assignedMachineIds: newIds });
                                  }}
                                />
                                <label htmlFor={`machine-${m._id}`} style={{ marginBottom: 0, cursor: 'pointer', fontSize: '13px' }}>
                                  {m.name} ({m.fuel?.name})
                                </label>
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  </div>
                )
              }

              {/* Only show organization dropdown for admin users */}
              {currentUser?.role === 'admin' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Organization:</label>
                    <select
                      value={formData.organisation}
                      onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                    >
                      <option value="">Select Organization (leave empty for auto-creation)</option>
                      {organizations.map(org => (
                        <option key={org._id} value={org._id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {editingUser ? (
                <div className="form-group" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                    <i className="fas fa-key"></i> Reset Password (optional)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password to reset"
                  />
                  <small style={{ color: '#64748b' }}>Leave blank to keep current password. Minimum 6 characters.</small>
                </div>
              ) : (
                <div className="form-group" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                  <label>Password:</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-actions" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                <button type="submit" className="btn-success">
                  <i className="fas fa-save"></i> {editingUser ? 'Update' : 'Create'} User
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
              <label>Search Users</label>
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Filter by Role</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="filter-select"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="purchaser">Purchaser</option>
                <option value="salesman">Salesman</option>
              </select>
            </div>

            {currentUser && currentUser.role === 'admin' && (
              <div className="filter-group">
                <label>Filter by Station</label>
                <select
                  value={filters.organisation}
                  onChange={(e) => setFilters({ ...filters, organisation: e.target.value })}
                  className="filter-select"
                >
                  <option value="">All Organizations</option>
                  {organizations.map(org => (
                    <option key={org._id} value={org._id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="filter-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    role: '',
                    organisation: ''
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
            </div>
          </div>
        </div>
      </div>

      <div className="users-list-table table-responsive">
        {users.length === 0 ? (
          <p className="no-data">No users found. Create your first user!</p>
        ) : (
          <table className="collections-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('firstname')} style={{ cursor: 'pointer' }}>Name {sortConfig.key === 'firstname' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>Username {sortConfig.key === 'username' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>Email {sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Mobile</th>
                <th onClick={() => handleSort('roleid')} style={{ cursor: 'pointer' }}>Role {sortConfig.key === 'roleid' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Assigned Machine</th>
                <th>Organization</th>
                <th onClick={() => handleSort('isactive')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'isactive' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>{user.firstname} {user.lastname}</td>
                  <td>@{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.mobileno}</td>
                  <td><span className={`status-badge ${user.roleid}`}>{user.roleid}</span></td>
                  <td>
                    {(() => {
                      const assignedToUser = machines.filter(m =>
                        m.assignments?.some(a => (a.user?._id || a.user) === user._id)
                      );
                      if (assignedToUser.length === 0) return <span className="text-muted">None</span>;
                      return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {assignedToUser.map(m => (
                            <span key={m._id} className="machine-badge" style={{ fontSize: '11px', padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                              {m.name}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td>{user.organisation?.name || getOrgName(user.organisation)}</td>
                  <td>
                    <span className={`status-badge ${user.isactive ? 'approved' : 'pending'}`}>
                      {user.isactive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {currentUser && currentUser.id !== user._id && (
                        <button className="btn-edit-sm" onClick={() => handleEdit(user)} title="Edit">
                          <i className="fas fa-edit"></i>
                        </button>
                      )}
                      {currentUser && currentUser.id !== user._id && (
                        <button className="btn-delete-sm" onClick={() => handleDelete(user._id)} title="Delete">
                          <i className="fas fa-trash-alt"></i>
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
          <label style={{ marginRight: '10px' }}>Users per page:</label>
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

export default Users;
