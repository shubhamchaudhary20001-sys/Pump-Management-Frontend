import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Credit.css';

const Credit = ({ organizationFilter }) => {
    const [credits, setCredits] = useState([]);
    const [users, setUsers] = useState([]); // Purchasers
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [summary, setSummary] = useState({ totalCredit: 0, totalPaid: 0, balance: 0 });
    const [currentUser, setCurrentUser] = useState(null);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
    const [itemsPerPage] = useState(10);
    const [filters, setFilters] = useState({
        user: '',
        startDate: '',
        endDate: '',
        type: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    const [formData, setFormData] = useState({
        user: '',
        type: 'payment',
        amount: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fetchSummary = useCallback(async (userId) => {
        if (!userId) {
            setSummary({ totalCredit: 0, totalPaid: 0, balance: 0 });
            return;
        }
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/credits/summary/${userId}`);
            setSummary(response.data);
        } catch (error) {
            console.error('Error fetching credit summary:', error);
        }
    }, []);

    const fetchData = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            setCurrentUser(user);

            const params = new URLSearchParams({
                page: page.toString(),
                limit: itemsPerPage.toString()
            });

            if (user && user.role !== 'admin') {
                params.append('organisation', user.organisation._id);
            } else if (organizationFilter) {
                params.append('organisation', organizationFilter);
            }

            if (filters.user) params.append('user', filters.user);
            if (filters.type) params.append('type', filters.type);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/credits?${params.toString()}`);
            setCredits(response.data.data);
            setPagination(response.data.pagination);

            if (filters.user) {
                fetchSummary(filters.user);
            } else {
                setSummary({ totalCredit: 0, totalPaid: 0, balance: 0 });
            }
        } catch (error) {
            console.error('Error fetching credit data:', error);
        } finally {
            setLoading(false);
        }
    }, [filters, itemsPerPage, organizationFilter, fetchSummary]);

    const fetchUsers = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            let url = `${process.env.REACT_APP_API_BASE_URL}/users?role=purchaser&limit=1000`;
            if (user && user.role !== 'admin') {
                url += `&organisation=${user.organisation._id}`;
            } else if (organizationFilter) {
                url += `&organisation=${organizationFilter}`;
            }
            const response = await axios.get(url);
            setUsers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }, [organizationFilter]);

    useEffect(() => {
        fetchData();
        fetchUsers();
    }, [fetchData, fetchUsers]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const resetForm = () => {
        setEditingId(null);
        setShowForm(false);
        setFormData({
            user: '',
            type: 'payment',
            amount: '',
            notes: '',
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleEdit = (entry) => {
        setEditingId(entry._id);
        setFormData({
            user: entry.user._id,
            type: entry.type,
            amount: entry.amount.toString(),
            notes: entry.notes || '',
            date: new Date(entry.date).toISOString().split('T')[0]
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this entry? This will recalculate all subsequent balances.')) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/credits/${id}`);
            fetchData();
        } catch (error) {
            console.error('Error deleting credit entry:', error);
            alert('Error deleting entry');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount)
            };

            if (editingId) {
                await axios.put(`${process.env.REACT_APP_API_BASE_URL}/credits/${editingId}`, payload);
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/credits`, payload);
            }

            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving credit entry:', error);
            alert('Error saving credit entry');
        }
    };

    return (
        <div className="credit-container">
            <div className="header">
                <h1><i className="fas fa-book"></i> Credit Ledger</h1>
                <div className="header-actions">
                    <button
                        className={`btn-filter ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <i className="fas fa-search"></i> {showFilters ? 'Hide Search' : 'Search / Filter'}
                    </button>
                    {currentUser && currentUser.role !== 'salesman' && (
                        <button className="btn-primary" onClick={() => setShowForm(true)}>
                            <i className="fas fa-plus"></i> Add Payment
                        </button>
                    )}
                </div>
            </div>

            {filters.user && (
                <div className="credit-summary">
                    <div className="credit-card">
                        <div className="card-icon icon-debt"><i className="fas fa-plus-circle"></i></div>
                        <div className="card-info">
                            <h3>Total Fuel Taken (Credit)</h3>
                            <p>₹{summary.totalCredit.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="credit-card">
                        <div className="card-icon icon-paid"><i className="fas fa-check-circle"></i></div>
                        <div className="card-info">
                            <h3>Total Paid</h3>
                            <p>₹{summary.totalPaid.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="credit-card">
                        <div className="card-icon icon-balance">
                            <i className={summary.balance >= 0 ? "fas fa-hand-holding-usd" : "fas fa-piggy-bank"}></i>
                        </div>
                        <div className="card-info">
                            <h3>{summary.balance >= 0 ? 'Outstanding Balance' : 'Advance / Excess Amount'}</h3>
                            <p className={summary.balance < 0 ? 'text-advance' : ''}>
                                ₹{Math.abs(summary.balance).toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className={`filters-wrapper ${showFilters ? 'expanded' : ''}`}>
                <div className="filters-section">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label>Purchaser</label>
                            <select name="user" value={filters.user} onChange={handleFilterChange} className="filter-select">
                                <option value="">All Purchasers</option>
                                {users.map(u => (
                                    <option key={u._id} value={u._id}>{u.firstname} {u.lastname}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Type</label>
                            <select name="type" value={filters.type} onChange={handleFilterChange} className="filter-select">
                                <option value="">All Types</option>
                                <option value="credit">Credit (Fuel taken)</option>
                                <option value="payment">Payment (Settlement)</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Start Date</label>
                            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="filter-input" />
                        </div>
                        <div className="filter-group">
                            <label>End Date</label>
                            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="filter-input" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Purchaser</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Notes</th>
                            <th>Running Balance</th>
                            {currentUser && currentUser.role !== 'salesman' && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={currentUser?.role !== 'salesman' ? "7" : "6"} style={{ textAlign: 'center' }}>Loading ledger...</td></tr>
                        ) : credits.length === 0 ? (
                            <tr><td colSpan={currentUser?.role !== 'salesman' ? "7" : "6"} style={{ textAlign: 'center' }}>No entries found</td></tr>
                        ) : (
                            credits.map(entry => (
                                <tr key={entry._id}>
                                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                                    <td>{entry.user ? `${entry.user.firstname} ${entry.user.lastname}` : 'N/A'}</td>
                                    <td>
                                        <span className={`badge ${entry.type === 'credit' ? 'badge-danger' : 'badge-success'}`}>
                                            {entry.type === 'credit' ? 'Credit' : 'Payment'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={entry.type === 'credit' ? 'type-credit' : 'type-payment'}>
                                            {entry.type === 'credit' ? '+' : '-'} ₹{entry.amount.toFixed(2)}
                                        </span>
                                    </td>
                                    <td>{entry.notes}</td>
                                    <td className="balance-cell">
                                        <span className={entry.balanceAfter > 0 ? 'balance-positive' : entry.balanceAfter < 0 ? 'balance-advance' : 'balance-zero'}>
                                            ₹{Math.abs(entry.balanceAfter).toFixed(2)}
                                            {entry.balanceAfter < 0 && <span className="advance-label">(Adv)</span>}
                                        </span>
                                    </td>
                                    {currentUser && currentUser.role !== 'salesman' && (
                                        <td className="actions-cell">
                                            <button className="btn-icon" onClick={() => handleEdit(entry)} title="Edit">
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(entry._id)} title="Delete">
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="pagination">
                <button
                    disabled={pagination.currentPage === 1}
                    onClick={() => fetchData(pagination.currentPage - 1)}
                    className="btn-secondary"
                >
                    Previous
                </button>
                <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
                <button
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() => fetchData(pagination.currentPage + 1)}
                    className="btn-secondary"
                >
                    Next
                </button>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editingId ? 'Edit Entry' : 'Record Payment / Manual Entry'}</h2>
                        <form onSubmit={handleSubmit} className="payment-form-modal">
                            <div className="form-group">
                                <label>Purchaser</label>
                                <select name="user" value={formData.user} onChange={handleFormChange} required disabled={!!editingId}>
                                    <option value="">Select Purchaser</option>
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>{u.firstname} {u.lastname}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Entry Type</label>
                                <select name="type" value={formData.type} onChange={handleFormChange} required>
                                    <option value="payment">Payment (Settlement)</option>
                                    <option value="credit">Credit (Fuel taken)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Amount (₹)</label>
                                <input type="number" name="amount" value={formData.amount} onChange={handleFormChange} step="0.01" required />
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input type="date" name="date" value={formData.date} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea name="notes" value={formData.notes} onChange={handleFormChange} rows="3" placeholder="Reference number, check no, etc."></textarea>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-success">
                                    {editingId ? 'Update Entry' : 'Save Entry'}
                                </button>
                                <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Credit;
