import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Machines.css';

const Machines = ({ organizationFilter }) => {
    const [machines, setMachines] = useState([]);
    const [fuels, setFuels] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [users, setUsers] = useState([]);
    const [tanks, setTanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingMachine, setEditingMachine] = useState(null);
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
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [filters, setFilters] = useState({
        search: '',
        isactive: '',
        fuel: '',
        tank: '',
        assignedTo: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        fuel: '',
        organisation: '',
        assignedTo: '',
        tank: '',
        currentReading: '',
        isactive: true
    });

    const fetchData = useCallback(async (page = 1, limit = itemsPerPage) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));

            // Build URLs
            let machinesUrl = `${process.env.REACT_APP_API_BASE_URL}/machines?page=${page}&limit=${limit}`;
            let fuelsUrl = `${process.env.REACT_APP_API_BASE_URL}/fuels?isactive=true&limit=1000`;
            let orgsUrl = `${process.env.REACT_APP_API_BASE_URL}/organisations?page=1&limit=1000`;
            let usersUrl = `${process.env.REACT_APP_API_BASE_URL}/users?isactive=true&limit=1000`;
            let tanksUrl = `${process.env.REACT_APP_API_BASE_URL}/tanks?isactive=true&limit=1000`;

            // Add filters
            if (filters.search) {
                machinesUrl += `&name=${filters.search}`;
            }
            if (filters.isactive !== '') {
                machinesUrl += `&isactive=${filters.isactive}`;
            }
            if (filters.fuel) {
                machinesUrl += `&fuel=${filters.fuel}`;
            }
            if (filters.tank) {
                machinesUrl += `&tank=${filters.tank}`;
            }
            if (filters.assignedTo) {
                machinesUrl += `&assignedTo=${filters.assignedTo}`;
            }

            if (user && user.role !== 'admin') {
                const orgId = user.organisation._id;
                machinesUrl += `&organisation=${orgId}`;
                fuelsUrl += `&organisation=${orgId}`;
                orgsUrl += `&organisation=${orgId}`;
                usersUrl += `&organisation=${orgId}`;
                tanksUrl += `&organisation=${orgId}`;
            } else if (organizationFilter) {
                machinesUrl += `&organisation=${organizationFilter}`;
                fuelsUrl += `&organisation=${organizationFilter}`;
                orgsUrl += `&organisation=${organizationFilter}`;
                usersUrl += `&organisation=${organizationFilter}`;
                tanksUrl += `&organisation=${organizationFilter}`;
            }

            // Add sorting
            if (sortConfig.key) {
                machinesUrl += `&sortBy=${sortConfig.key}&sortOrder=${sortConfig.direction}`;
            }

            const [machinesRes, fuelsRes, orgsRes, usersRes, tanksRes] = await Promise.all([
                axios.get(machinesUrl),
                axios.get(fuelsUrl),
                axios.get(orgsUrl),
                axios.get(usersUrl),
                axios.get(tanksUrl)
            ]);

            setMachines(machinesRes.data.data || machinesRes.data || []);
            if (machinesRes.data.pagination) {
                setPagination(machinesRes.data.pagination);
            }
            setFuels(fuelsRes.data?.data || fuelsRes.data || []);
            setOrganizations(orgsRes.data?.data || orgsRes.data || []);
            const salesmen = (usersRes.data?.data || usersRes.data || []).filter(u => u.roleid === 'salesman');
            setUsers(salesmen);
            setTanks(tanksRes.data?.data || tanksRes.data || []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [organizationFilter, sortConfig, itemsPerPage, filters]);

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

            const url = `${process.env.REACT_APP_API_BASE_URL}/machines/export?${params.toString()}`;

            const response = await axios.get(url, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `machines_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting machines:', error);
        }
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
        fetchData();
    }, [fetchData]);

    const handleOrgChange = async (e) => {
        const orgId = e.target.value;
        setFormData({ ...formData, organisation: orgId });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const machineData = {
                ...formData,
                currentReading: Number(formData.currentReading)
            };

            if (currentUser && currentUser.role !== 'admin') {
                machineData.organisation = currentUser.organisation._id;
            }

            if (editingMachine) {
                await axios.put(`${process.env.REACT_APP_API_BASE_URL}/machines/${editingMachine._id}`, machineData);
                setMessage({ text: 'Machine updated successfully!', type: 'success' });
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/machines`, machineData);
                setMessage({ text: 'Machine added successfully!', type: 'success' });
            }
            fetchData();
            resetForm();
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error('Error saving machine:', error);
            setMessage({ text: error.response?.data?.message || 'Error saving machine!', type: 'error' });
        }
    };

    const handleEdit = (machine) => {
        setEditingMachine(machine);
        setFormData({
            name: machine.name,
            fuel: machine.fuel._id,
            organisation: machine.organisation,
            assignedTo: machine.assignedTo ? machine.assignedTo._id : '',
            tank: machine.tank ? machine.tank._id : '',
            currentReading: machine.currentReading,
            isactive: machine.isactive
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this machine?')) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/machines/${id}`);
                setMessage({ text: 'Machine deleted successfully!', type: 'success' });
                fetchData();
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            } catch (error) {
                console.error('Error deleting machine:', error);
                setMessage({ text: error.response?.data?.message || 'Error deleting machine!', type: 'error' });
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            fuel: '',
            organisation: currentUser?.role !== 'admin' ? currentUser.organisation._id : '',
            assignedTo: '',
            tank: '',
            currentReading: '',
            isactive: true
        });
        setEditingMachine(null);
        setShowForm(false);
    };

    if (loading) return <div className="loading">Loading machines...</div>;

    return (
        <div className="machines-container">
            <div className="header">
                <h1>⛽ Machine Master</h1>
                <div className="header-actions">
                    <button
                        className={`btn-filter ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <i className="fas fa-search"></i> {showFilters ? 'Hide Search' : 'Search'}
                    </button>
                    <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? <><i className="fas fa-times"></i> Cancel</> : <><i className="fas fa-plus"></i> Add Machine</>}
                    </button>
                </div>
            </div>

            {message.text && (
                <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
                    {message.text}
                </div>
            )}

            {showForm && (
                <form className="machine-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Machine Name / Nozzle</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Fuel Type</label>
                            <select
                                value={formData.fuel}
                                onChange={(e) => setFormData({ ...formData, fuel: e.target.value })}
                                required
                            >
                                <option value="">Select Fuel</option>
                                {fuels.map(f => (
                                    <option key={f._id} value={f._id}>{f.name} ({f.rate}/L)</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Current Reading</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.currentReading}
                                onChange={(e) => setFormData({ ...formData, currentReading: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Assign to Salesman</label>
                            <select
                                value={formData.assignedTo}
                                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                            >
                                <option value="">-- No Assignment --</option>
                                {users.map(u => (
                                    <option key={u._id} value={u._id}>{u.firstname} {u.lastname}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Source Tank</label>
                            <select
                                value={formData.tank}
                                onChange={(e) => setFormData({ ...formData, tank: e.target.value })}
                            >
                                <option value="">-- No Tank Assigned --</option>
                                {tanks.map(t => (
                                    <option key={t._id} value={t._id}>{t.name} ({t.fuel?.name})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {currentUser?.role === 'admin' && (
                        <div className="form-group">
                            <label>Organisation</label>
                            <select
                                value={formData.organisation}
                                onChange={handleOrgChange}
                                required
                            >
                                <option value="">Select Organisation</option>
                                {organizations.map(o => (
                                    <option key={o._id} value={o._id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="submit" className="btn-success">
                            <i className="fas fa-save"></i> {editingMachine ? 'Update' : 'Create'} Machine
                        </button>
                    </div>
                </form>
            )}

            <div className={`filters-wrapper ${showFilters ? 'expanded' : ''}`}>
                <div className="filters-section">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label>Search Machine</label>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="filter-input"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Status</label>
                            <select
                                value={filters.isactive}
                                onChange={(e) => setFilters({ ...filters, isactive: e.target.value })}
                                className="filter-select"
                            >
                                <option value="">All Status</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Fuel Type</label>
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
                            <label>Tank</label>
                            <select
                                value={filters.tank}
                                onChange={(e) => setFilters({ ...filters, tank: e.target.value })}
                                className="filter-select"
                            >
                                <option value="">All Tanks</option>
                                {tanks.map(tank => (
                                    <option key={tank._id} value={tank._id}>{tank.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Assigned To</label>
                            <select
                                value={filters.assignedTo}
                                onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                                className="filter-select"
                            >
                                <option value="">All Salesmen</option>
                                {users.map(user => (
                                    <option key={user._id} value={user._id}>{user.firstname} {user.lastname}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-actions" style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => {
                                    setFilters({ search: '', isactive: '', fuel: '', tank: '', assignedTo: '' });
                                    fetchData();
                                }}
                            >
                                <i className="fas fa-undo"></i> Reset
                            </button>
                            <button className="btn-excel" onClick={handleExport} title="Download Excel Report">
                                <i className="fas fa-file-excel"></i> Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="machines-list-table table-responsive">
                {machines.length === 0 ? (
                    <p className="no-data">No machines found.</p>
                ) : (
                    <table className="collections-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Machine Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                <th>Fuel Type</th>
                                <th>Source Tank</th>
                                <th onClick={() => handleSort('currentReading')} style={{ cursor: 'pointer' }}>Current Reading {sortConfig.key === 'currentReading' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                <th>Assigned To</th>
                                <th onClick={() => handleSort('isactive')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'isactive' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {machines.map(machine => (
                                <tr key={machine._id}>
                                    <td>{machine.name}</td>
                                    <td>{machine.fuel?.name}</td>
                                    <td>{machine.tank?.name || <span className="text-muted" style={{ fontSize: '12px' }}>N/A</span>}</td>
                                    <td>{machine.currentReading}</td>
                                    <td>{machine.assignedTo ? `${machine.assignedTo.firstname} ${machine.assignedTo.lastname}` : 'Unassigned'}</td>
                                    <td>
                                        <span className={`status-badge ${machine.isactive ? 'approved' : 'pending'}`}>
                                            {machine.isactive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                className="btn-edit-sm"
                                                onClick={() => handleEdit(machine)}
                                                title="Edit Machine"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                className="btn-delete-sm"
                                                onClick={() => handleDelete(machine._id)}
                                                title="Delete Machine"
                                            >
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
                        Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to {Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} machines
                    </div>
                    <div className="page-size-selector">
                        <label>Items per page:</label>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                fetchData(1, Number(e.target.value));
                            }}
                            className="page-size-select"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
                {pagination.totalPages > 1 && (
                    <div className="pagination-controls">
                        <button
                            disabled={!pagination.hasPrev}
                            onClick={() => fetchData(pagination.currentPage - 1, itemsPerPage)}
                            className="btn-pagination"
                        >
                            <i className="fas fa-chevron-left"></i> Previous
                        </button>
                        <span className="page-indicator">Page {pagination.currentPage} of {pagination.totalPages}</span>
                        <button
                            disabled={!pagination.hasNext}
                            onClick={() => fetchData(pagination.currentPage + 1, itemsPerPage)}
                            className="btn-pagination"
                        >
                            Next <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Machines;
