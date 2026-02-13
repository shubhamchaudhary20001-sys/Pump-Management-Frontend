import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Testing.css';

const Testing = ({ organizationFilter }) => {
    const [testings, setTestings] = useState([]);
    const [tanks, setTanks] = useState([]);
    const [machines, setMachines] = useState([]);
    const [allMachines, setAllMachines] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingTesting, setEditingTesting] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [formData, setFormData] = useState(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            date: new Date().toISOString().split('T')[0],
            tank: '',
            machine: '',
            shift: user?.shift?._id || user?.shift || '',
            testAmount: '',
            notes: ''
        };
    });
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false });
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [filters, setFilters] = useState({
        tank: '',
        machine: '',
        startDate: '',
        endDate: ''
    });

    const [showFilters, setShowFilters] = useState(false);

    const fetchTestings = useCallback(async (page = 1, limit = itemsPerPage) => {
        setIsLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', limit.toString());

            if (user?.role !== 'admin' && user?.organisation?._id) {
                params.append('organisation', user.organisation._id);
            } else if (organizationFilter) {
                params.append('organisation', organizationFilter);
            }

            if (filters.tank) params.append('tank', filters.tank);
            if (filters.machine) params.append('machine', filters.machine);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/testings?${params}`);
            setTestings(response.data.data || []);
            setPagination(response.data.pagination || pagination);
        } catch (error) {
            console.error('Error fetching testings:', error);
            setMessage({ text: 'Error fetching testing records', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [organizationFilter, filters]);

    const fetchTanksAndMachines = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            let tanksUrl = `${process.env.REACT_APP_API_BASE_URL}/tanks?isactive=true&limit=1000`;
            let machinesUrl = `${process.env.REACT_APP_API_BASE_URL}/machines?isactive=true&limit=1000`;

            if (user?.role !== 'admin' && user?.organisation?._id) {
                tanksUrl += `&organisation=${user.organisation._id}`;
                machinesUrl += `&organisation=${user.organisation._id}`;
            } else if (organizationFilter) {
                tanksUrl += `&organisation=${organizationFilter}`;
                machinesUrl += `&organisation=${organizationFilter}`;
            }

            const [tanksRes, machinesRes] = await Promise.all([
                axios.get(tanksUrl),
                axios.get(machinesUrl)
            ]);

            setTanks(tanksRes.data.data || []);
            setAllMachines(machinesRes.data.data || []);

            // Fetch shifts
            let shiftsUrl = `${process.env.REACT_APP_API_BASE_URL}/shifts?isactive=true&limit=1000`;
            if (user?.role !== 'admin' && user?.organisation?._id) {
                shiftsUrl += `&organisation=${user.organisation._id}`;
            } else if (organizationFilter) {
                shiftsUrl += `&organisation=${organizationFilter}`;
            }
            const shiftsRes = await axios.get(shiftsUrl);
            setShifts(shiftsRes.data || []);
        } catch (error) {
            console.error('Error fetching tanks and machines:', error);
        }
    }, [organizationFilter]);

    useEffect(() => {
        fetchTestings();
        fetchTanksAndMachines();
    }, [fetchTestings, fetchTanksAndMachines]);

    // Filter machines based on selected tank
    useEffect(() => {
        if (formData.tank) {
            const filteredMachines = allMachines.filter(m =>
                m.tank && m.tank._id === formData.tank
            );
            setMachines(filteredMachines);

            // Reset machine if it's not linked to the selected tank
            if (formData.machine && !filteredMachines.find(m => m._id === formData.machine)) {
                setFormData(prev => ({ ...prev, machine: '' }));
            }
        } else {
            setMachines([]);
            setFormData(prev => ({ ...prev, machine: '' }));
        }
    }, [formData.tank, allMachines, formData.machine]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        setFormData({
            date: new Date().toISOString().split('T')[0],
            tank: '',
            machine: '',
            shift: user?.shift?._id || user?.shift || '',
            testAmount: '',
            notes: ''
        });
        setEditingTesting(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        try {
            const submissionData = {
                ...formData,
                testAmount: Number(formData.testAmount)
            };

            if (editingTesting) {
                await axios.put(`${process.env.REACT_APP_API_BASE_URL}/testings/${editingTesting}`, submissionData);
                setMessage({ text: 'Testing record updated successfully!', type: 'success' });
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/testings`, submissionData);
                setMessage({ text: 'Testing record added successfully!', type: 'success' });
            }

            resetForm();
            fetchTestings();
            fetchTanksAndMachines(); // Refresh to show updated tank stock
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error('Error saving testing record:', error);
            setMessage({ text: error.response?.data?.message || 'Error saving testing record!', type: 'error' });
        }
    };

    const handleEdit = (testing) => {
        setEditingTesting(testing._id);
        setFormData({
            date: testing.date.split('T')[0],
            tank: testing.tank?._id || '',
            machine: testing.machine?._id || '',
            shift: testing.shift?._id || '',
            testAmount: testing.testAmount,
            notes: testing.notes || ''
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this testing record? This will reduce the tank stock.')) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/testings/${id}`);
                setMessage({ text: 'Testing record deleted successfully!', type: 'success' });
                fetchTestings();
                fetchTanksAndMachines(); // Refresh to show updated tank stock
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            } catch (error) {
                console.error('Error deleting testing record:', error);
                setMessage({ text: error.response?.data?.message || 'Error deleting testing record!', type: 'error' });
            }
        }
    };

    const handleExport = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const params = new URLSearchParams();

            if (user?.role !== 'admin' && user?.organisation?._id) {
                params.append('organisation', user.organisation._id);
            } else if (organizationFilter) {
                params.append('organisation', organizationFilter);
            }

            if (filters.tank) params.append('tank', filters.tank);
            if (filters.machine) params.append('machine', filters.machine);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/testings/export?${params}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'fuel_testing.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting testing records:', error);
            setMessage({ text: 'Error exporting data', type: 'error' });
        }
    }, [organizationFilter, filters]);

    return (
        <div className="testing-container">
            <div className="header">
                <h1><i className="fas fa-flask"></i> Fuel Testing</h1>
                <div className="header-actions">
                    <button
                        className={`btn-filter ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <i className="fas fa-search"></i> {showFilters ? 'Hide Search' : 'Search'}
                    </button>
                    <button className="btn-export" onClick={handleExport}>
                        <i className="fas fa-file-excel"></i> Export
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => {
                            if (showForm) resetForm();
                            else setShowForm(true);
                        }}
                    >
                        {showForm ? <><i className="fas fa-times"></i> Close</> : <><i className="fas fa-plus"></i> Add Testing</>}
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
                        <h2>{editingTesting ? 'Edit Fuel Testing' : 'Add New Fuel Testing'}</h2>
                        <form onSubmit={handleSubmit} className="testing-form-modal" style={{ padding: 0, border: 'none', boxShadow: 'none', maxWidth: 'none', margin: 0 }}>
                            <div className="form-row">
                                <div className="form-group half">
                                    <label>Date *</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group half">
                                    <label>Tank *</label>
                                    <select
                                        name="tank"
                                        value={formData.tank}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select Tank</option>
                                        {tanks.map(tank => (
                                            <option key={tank._id} value={tank._id}>
                                                {tank.name} (Stock: {tank.currentStock}L / {tank.capacity}L)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group half">
                                    <label>Machine *</label>
                                    <select
                                        name="machine"
                                        value={formData.machine}
                                        onChange={handleChange}
                                        required
                                        disabled={!formData.tank}
                                    >
                                        <option value="">Select Machine</option>
                                        {machines.map(machine => (
                                            <option key={machine._id} value={machine._id}>
                                                {machine.name} ({machine.fuel?.name})
                                            </option>
                                        ))}
                                    </select>
                                    {!formData.tank && <small className="form-text" style={{ color: '#666' }}>Select a tank first</small>}
                                </div>
                                <div className="form-group half">
                                    <label>Shift *</label>
                                    <select
                                        name="shift"
                                        value={formData.shift}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select Shift</option>
                                        {shifts.map(shift => (
                                            <option key={shift._id} value={shift._id}>{shift.name} ({shift.startTime} - {shift.endTime})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group half">
                                    <label>Test Amount (L) *</label>
                                    <input
                                        type="number"
                                        name="testAmount"
                                        value={formData.testAmount}
                                        onChange={handleChange}
                                        placeholder="e.g. 2.5"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Notes</label>
                                <input
                                    type="text"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Optional notes about the test"
                                />
                            </div>

                            <div className="form-actions" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                                <button type="submit" className="btn-success">
                                    <i className="fas fa-save"></i> {editingTesting ? 'Update Testing' : 'Add Testing'}
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
                    <div className="filter-row fade-in">
                        <div className="filter-group">
                            <label>Tank</label>
                            <select
                                value={filters.tank}
                                onChange={(e) => setFilters({ ...filters, tank: e.target.value })}
                            >
                                <option value="">All Tanks</option>
                                {tanks.map(t => (
                                    <option key={t._id} value={t._id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Machine</label>
                            <select
                                value={filters.machine}
                                onChange={(e) => setFilters({ ...filters, machine: e.target.value })}
                            >
                                <option value="">All Machines</option>
                                {allMachines.map(m => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>From Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div className="filter-group">
                            <label>To Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="testing-list">
                <h3>Testing History</h3>
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading testing records...</p>
                    </div>
                ) : testings.length === 0 ? (
                    <p className="no-data">No testing records found.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="testing-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Tank</th>
                                    <th>Machine</th>
                                    <th>Shift</th>
                                    <th>Amount (L)</th>
                                    <th>Notes</th>
                                    <th>Created By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {testings.map(testing => (
                                    <tr key={testing._id}>
                                        <td>{new Date(testing.date).toLocaleDateString()}</td>
                                        <td><strong>{testing.tank?.name || 'N/A'}</strong></td>
                                        <td>{testing.machine?.name || 'N/A'}</td>
                                        <td>{testing.shift?.name || 'N/A'}</td>
                                        <td className="number-cell">{testing.testAmount.toFixed(2)}</td>
                                        <td>{testing.notes || '-'}</td>
                                        <td>{testing.createdby}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-edit-sm" title="Edit" onClick={() => handleEdit(testing)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn-delete-sm" title="Delete" onClick={() => handleDelete(testing._id)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div className="pagination-container">
                <div className="pagination-info">
                    <div>
                        Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to {Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} records
                    </div>
                    {pagination.totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                disabled={!pagination.hasPrev}
                                onClick={() => fetchTestings(pagination.currentPage - 1, itemsPerPage)}
                                className="btn-pagination"
                            >
                                <i className="fas fa-chevron-left"></i> Previous
                            </button>
                            <span className="page-indicator">Page {pagination.currentPage} of {pagination.totalPages}</span>
                            <button
                                disabled={!pagination.hasNext}
                                onClick={() => fetchTestings(pagination.currentPage + 1, itemsPerPage)}
                                className="btn-pagination"
                            >
                                Next <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                    <div className="page-size-selector">
                        <label>Items per page:</label>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                const newSize = Number(e.target.value);
                                setItemsPerPage(newSize);
                                fetchTestings(1, newSize);
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

export default Testing;
