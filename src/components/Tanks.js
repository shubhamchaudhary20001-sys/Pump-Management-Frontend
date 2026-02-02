import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Tanks.css';

const Tanks = ({ organizationFilter }) => {
    const [tanks, setTanks] = useState([]);
    const [fuels, setFuels] = useState([]);
    const [machines, setMachines] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTank, setEditingTank] = useState(null);
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
    const [sortConfig] = useState({ key: 'name', direction: 'asc' });
    const [filters, setFilters] = useState({
        search: '',
        isactive: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        fuel: '',
        organisation: '',
        capacity: '',
        currentStock: '',
        machines: [],
        isactive: true
    });

    const fetchData = useCallback(async (page = 1, limit = itemsPerPage) => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));

            let tanksUrl = `${process.env.REACT_APP_API_BASE_URL}/tanks?page=${page}&limit=${limit}`;
            let fuelsUrl = `${process.env.REACT_APP_API_BASE_URL}/fuels?isactive=true&limit=1000`;
            let machinesUrl = `${process.env.REACT_APP_API_BASE_URL}/machines?isactive=true&limit=1000`;
            let orgsUrl = `${process.env.REACT_APP_API_BASE_URL}/organisations?page=1&limit=1000`;

            const orgId = user?.role !== 'admin' ? user?.organisation?._id : organizationFilter;

            if (orgId) {
                tanksUrl += `&organisation=${orgId}`;
                fuelsUrl += `&organisation=${orgId}`;
                machinesUrl += `&organisation=${orgId}`;
                orgsUrl += `&organisation=${orgId}`;
            }

            if (filters.search) tanksUrl += `&search=${filters.search}`;
            if (filters.isactive !== '') tanksUrl += `&isactive=${filters.isactive}`;
            if (sortConfig.key) tanksUrl += `&sortBy=${sortConfig.key}&sortOrder=${sortConfig.direction}`;

            const [tanksRes, fuelsRes, machinesRes, orgsRes] = await Promise.all([
                axios.get(tanksUrl),
                axios.get(fuelsUrl),
                axios.get(machinesUrl),
                axios.get(orgsUrl)
            ]);

            setTanks(tanksRes.data.data || []);
            setPagination(tanksRes.data.pagination || pagination);
            setFuels(fuelsRes.data?.data || fuelsRes.data || []);
            setMachines(machinesRes.data?.data || machinesRes.data || []);
            setOrganizations(orgsRes.data?.data || orgsRes.data || []);

        } catch (error) {
            console.error('Error fetching tanks data:', error);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizationFilter, sortConfig, itemsPerPage, filters]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                capacity: Number(formData.capacity),
                currentStock: Number(formData.currentStock)
            };

            if (currentUser && currentUser.role !== 'admin') {
                payload.organisation = currentUser.organisation._id;
            }

            if (editingTank) {
                await axios.put(`${process.env.REACT_APP_API_BASE_URL}/tanks/${editingTank._id}`, payload);
                setMessage({ text: 'Tank updated successfully!', type: 'success' });
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/tanks`, payload);
                setMessage({ text: 'Tank added successfully!', type: 'success' });
            }
            fetchData();
            resetForm();
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error('Error saving tank:', error);
            setMessage({ text: error.response?.data?.message || 'Error saving tank!', type: 'error' });
        }
    };

    const handleEdit = (tank) => {
        setEditingTank(tank);
        setFormData({
            name: tank.name,
            fuel: tank.fuel?._id || '',
            organisation: tank.organisation,
            capacity: tank.capacity,
            currentStock: tank.currentStock,
            machines: tank.machines?.map(m => m._id) || [],
            isactive: tank.isactive
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this tank?')) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/tanks/${id}`);
                setMessage({ text: 'Tank deleted successfully!', type: 'success' });
                fetchData();
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            } catch (error) {
                console.error('Error deleting tank:', error);
                setMessage({ text: error.response?.data?.message || 'Error deleting tank!', type: 'error' });
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            fuel: '',
            organisation: currentUser?.role !== 'admin' ? currentUser?.organisation?._id : '',
            capacity: '',
            currentStock: '',
            machines: [],
            isactive: true
        });
        setEditingTank(null);
        setShowForm(false);
    };

    const handleMachineToggle = (machineId) => {
        const currentMachines = [...formData.machines];
        const index = currentMachines.indexOf(machineId);
        if (index > -1) {
            currentMachines.splice(index, 1);
        } else {
            currentMachines.push(machineId);
        }
        setFormData({ ...formData, machines: currentMachines });
    };

    const handleExport = async () => {
        try {
            const orgId = currentUser?.role !== 'admin' ? currentUser?.organisation?._id : organizationFilter;
            const params = new URLSearchParams();
            if (orgId) params.append('organisation', orgId);

            const url = `${process.env.REACT_APP_API_BASE_URL}/tanks/export?${params.toString()}`;
            const response = await axios.get(url, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `tanks_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting tanks:', error);
        }
    };

    if (loading && tanks.length === 0) return <div className="loading">Loading tanks...</div>;

    return (
        <div className="tanks-container">
            <div className="header">
                <h1>🛢️ Tank Master</h1>
                <div className="header-actions">
                    <button
                        className={`btn-filter ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <i className="fas fa-search"></i> {showFilters ? 'Hide Search' : 'Search'}
                    </button>
                    <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? <><i className="fas fa-times"></i> Cancel</> : <><i className="fas fa-plus"></i> Add Tank</>}
                    </button>
                </div>
            </div>

            {message.text && (
                <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
                    {message.text}
                </div>
            )}

            {showForm && (
                <form className="machine-form tank-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Tank Name</label>
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
                                    <option key={f._id} value={f._id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Capacity (Liters)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Current Stock (Liters)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.currentStock}
                                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Connected Machines</label>
                        <div className="machines-multiselect">
                            {machines.map(m => (
                                <label key={m._id} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.machines.includes(m._id)}
                                        onChange={() => handleMachineToggle(m._id)}
                                    />
                                    <span>{m.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {currentUser?.role === 'admin' && (
                        <div className="form-group">
                            <label>Organisation</label>
                            <select
                                value={formData.organisation}
                                onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
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
                            <i className="fas fa-save"></i> {editingTank ? 'Update' : 'Create'} Tank
                        </button>
                    </div>
                </form>
            )}

            <div className={`filters-wrapper ${showFilters ? 'expanded' : ''}`}>
                <div className="filters-section">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label>Search Tank</label>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        <div className="filter-actions" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setFilters({ search: '', isactive: '' })}>
                                <i className="fas fa-undo"></i> Reset
                            </button>
                            <button className="btn-excel" onClick={handleExport}>
                                <i className="fas fa-file-excel"></i> Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>



            <div className="machines-list-table table-responsive">
                {tanks.length === 0 ? (
                    <p className="no-data">No tanks found.</p>
                ) : (
                    <table className="collections-table">
                        <thead>
                            <tr>
                                <th>Tank Name</th>
                                <th>Fuel</th>
                                <th>Capacity</th>
                                <th>Stock Level</th>
                                <th>Machines</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tanks.map(tank => {
                                const percentage = Math.min(100, (tank.currentStock / tank.capacity) * 100);
                                const color = percentage < 20 ? '#ef4444' : percentage < 50 ? '#f59e0b' : '#10b981';

                                return (
                                    <tr key={tank._id}>
                                        <td><strong>{tank.name}</strong></td>
                                        <td>{tank.fuel?.name}</td>
                                        <td>{tank.capacity} L</td>
                                        <td>
                                            <div className="stock-level-container">
                                                <div className="progress-bg">
                                                    <div
                                                        className="progress-bar"
                                                        style={{ width: `${percentage}%`, backgroundColor: color }}
                                                    ></div>
                                                </div>
                                                <span className="stock-text">{tank.currentStock} L ({percentage.toFixed(0)}%)</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="linked-machines">
                                                {tank.machines?.map(m => (
                                                    <span key={m._id} className="machine-tag">{m.name}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button className="btn-edit-sm" onClick={() => handleEdit(tank)}><i className="fas fa-edit"></i></button>
                                                <button className="btn-delete-sm" onClick={() => handleDelete(tank._id)}><i className="fas fa-trash-alt"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="pagination-container">
                <div className="pagination-info">
                    <div>
                        Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to {Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} tanks
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

export default Tanks;
