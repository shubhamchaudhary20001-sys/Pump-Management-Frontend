import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Shifts.css';

const Shifts = ({ organizationFilter }) => {
    const [shifts, setShifts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [formData, setFormData] = useState({
        name: '',
        startTime: '06:00',
        endTime: '14:00',
        isactive: true,
        assignedSalesmen: []
    });
    const [salesmen, setSalesmen] = useState([]);
    const [filters, setFilters] = useState({
        name: '',
        isactive: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    const fetchShifts = useCallback(async () => {
        setIsLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const orgId = user?.role !== 'admin' ? user?.organisation?._id : organizationFilter;

            const params = new URLSearchParams();
            if (orgId) params.append('organisation', orgId);
            if (filters.name) params.append('name', filters.name);
            if (filters.isactive) params.append('isactive', filters.isactive);

            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/shifts?${params}`);
            setShifts(response.data);
        } catch (error) {
            console.error('Error fetching shifts:', error);
            setMessage({ text: 'Error fetching shifts', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [organizationFilter, filters]);

    const fetchSalesmen = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const orgId = user?.role !== 'admin' ? user?.organisation?._id : organizationFilter;
            const params = orgId ? `?organisation=${orgId}&role=salesman&limit=1000` : '?role=salesman&limit=1000';
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/users${params}`);
            setSalesmen(response.data.data || []);
        } catch (error) {
            console.error('Error fetching salesmen:', error);
        }
    }, [organizationFilter]);

    useEffect(() => {
        fetchShifts();
        fetchSalesmen();
    }, [fetchShifts, fetchSalesmen]);

    const handleCheckboxChange = (userId) => {
        setFormData(prev => {
            const current = [...prev.assignedSalesmen];
            const index = current.indexOf(userId);
            if (index === -1) {
                current.push(userId);
            } else {
                current.splice(index, 1);
            }
            return { ...prev, assignedSalesmen: current };
        });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            startTime: '06:00',
            endTime: '14:00',
            isactive: true,
            assignedSalesmen: []
        });
        setEditingShift(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const data = {
                ...formData,
                organisation: user?.role !== 'admin' ? user?.organisation?._id : organizationFilter
            };

            if (editingShift) {
                await axios.put(`${process.env.REACT_APP_API_BASE_URL}/shifts/${editingShift}`, data);
                setMessage({ text: 'Shift updated successfully!', type: 'success' });
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/shifts`, data);
                setMessage({ text: 'Shift created successfully!', type: 'success' });
            }
            resetForm();
            fetchShifts();
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error('Error saving shift:', error);
            setMessage({ text: error.response?.data?.message || 'Error saving shift!', type: 'error' });
        }
    };

    const handleEdit = (shift) => {
        setEditingShift(shift._id);
        const assignedIds = (shift.assignedSalesmen || []).map(s => typeof s === 'object' ? s._id : s);
        setFormData({
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            isactive: shift.isactive,
            assignedSalesmen: assignedIds
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this shift?')) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/shifts/${id}`);
                setMessage({ text: 'Shift deleted successfully!', type: 'success' });
                fetchShifts();
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            } catch (error) {
                console.error('Error deleting shift:', error);
                setMessage({ text: error.response?.data?.message || 'Error deleting shift!', type: 'error' });
            }
        }
    };

    return (
        <div className="shifts-container">
            <div className="header">
                <h1><i className="fas fa-clock"></i> Shift Master</h1>
                <div className="header-actions">
                    <button
                        className="btn-primary"
                        onClick={() => {
                            if (showForm) resetForm();
                            else setShowForm(true);
                        }}
                    >
                        {showForm ? <><i className="fas fa-times"></i> Close</> : <><i className="fas fa-plus"></i> Add Shift</>}
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
                        <h2>{editingShift ? 'Edit Shift' : 'Add New Shift'}</h2>
                        <form onSubmit={handleSubmit} className="shift-form-modal" style={{ padding: 0, border: 'none', boxShadow: 'none', maxWidth: 'none', margin: 0 }}>
                            <div className="form-row">
                                <div className="form-group half">
                                    <label>Shift Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Morning Shift"
                                        required
                                    />
                                </div>
                                <div className="form-group half">
                                    <label>Status</label>
                                    <div className="checkbox-group" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                                        <input
                                            type="checkbox"
                                            id="isactive"
                                            name="isactive"
                                            checked={formData.isactive}
                                            onChange={handleChange}
                                        />
                                        <label htmlFor="isactive" style={{ marginBottom: 0 }}>Active</label>
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group half">
                                    <label>Start Time</label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group half">
                                    <label>End Time</label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Assign Salesmen (Optional)</label>
                                <div className="salesmen-checkbox-list" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', background: '#f8fafc' }}>
                                    {salesmen.length === 0 ? (
                                        <p className="no-data-sm">No salesmen available to assign.</p>
                                    ) : (
                                        salesmen.map(s => (
                                            <div key={s._id} className="salesman-checkbox-item" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    id={`salesman-${s._id}`}
                                                    checked={formData.assignedSalesmen.includes(s._id)}
                                                    onChange={() => handleCheckboxChange(s._id)}
                                                />
                                                <label htmlFor={`salesman-${s._id}`} style={{ marginBottom: 0, cursor: 'pointer' }}>
                                                    {s.firstname} {s.lastname} <small>({s.username})</small>
                                                </label>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                                    {formData.assignedSalesmen.length} salesmen selected.
                                </small>
                            </div>

                            <div className="form-actions" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                                <button type="submit" className="btn-success">
                                    <i className="fas fa-save"></i> {editingShift ? 'Update Shift' : 'Create Shift'}
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
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Search Shift Name</label>
                            <input
                                type="text"
                                value={filters.name}
                                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                placeholder="Search by name..."
                            />
                        </div>
                        <div className="filter-group">
                            <label>Status</label>
                            <select
                                value={filters.isactive}
                                onChange={(e) => setFilters({ ...filters, isactive: e.target.value })}
                            >
                                <option value="">All Status</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="shifts-list">
                <h3>Existing Shifts</h3>
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading shifts...</p>
                    </div>
                ) : shifts.length === 0 ? (
                    <p className="no-data">No shifts defined yet.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="shifts-table">
                            <thead>
                                <tr>
                                    <th>Shift Name</th>
                                    <th>Assignees (Count)</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.map(shift => (
                                    <tr key={shift._id}>
                                        <td><strong>{shift.name}</strong></td>
                                        <td>
                                            <div className="assignee-header">
                                                <span className="count-badge">{(shift.assignedSalesmen || []).length} users</span>
                                            </div>
                                            <div className="assignee-list">
                                                {(shift.assignedSalesmen || []).map(s => (
                                                    <span key={s._id} className="assignee-tag">
                                                        {s.firstname} {s.lastname}
                                                    </span>
                                                ))}
                                                {(shift.assignedSalesmen || []).length === 0 && <span className="no-assignees">None</span>}
                                            </div>
                                        </td>
                                        <td>{shift.startTime}</td>
                                        <td>{shift.endTime}</td>
                                        <td>
                                            <span className={`status-badge ${shift.isactive ? 'active' : 'inactive'}`}>
                                                {shift.isactive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-edit-sm" title="Edit" onClick={() => handleEdit(shift)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn-delete-sm" title="Delete" onClick={() => handleDelete(shift._id)}>
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
        </div>
    );
};

export default Shifts;
