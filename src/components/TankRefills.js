import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './TankRefills.css';

const TankRefills = ({ organizationFilter }) => {
    const [refills, setRefills] = useState([]);
    const [tanks, setTanks] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingRefill, setEditingRefill] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false });
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [formData, setFormData] = useState({
        tank: '',
        refillDate: new Date().toISOString().split('T')[0],
        quantityAdded: '',
        supplier: '',
        invoiceNumber: '',
        costPerLiter: '',
        totalCost: '',
        notes: ''
    });
    const [filters, setFilters] = useState({
        tank: '',
        startDate: '',
        endDate: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    const fetchRefills = useCallback(async (page = 1, limit = itemsPerPage) => {
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
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/tank-refills?${params}`);
            setRefills(response.data.data || []);
            setPagination(response.data.pagination || pagination);
        } catch (error) {
            console.error('Error fetching refills:', error);
            setMessage({ text: 'Error fetching refills', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [organizationFilter, filters]);

    const fetchTanks = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            let url = `${process.env.REACT_APP_API_BASE_URL}/tanks?isactive=true&limit=1000`;

            if (user?.role !== 'admin' && user?.organisation?._id) {
                url += `&organisation=${user.organisation._id}`;
            } else if (organizationFilter) {
                url += `&organisation=${organizationFilter}`;
            }

            const response = await axios.get(url);
            setTanks(response.data.data || []);
        } catch (error) {
            console.error('Error fetching tanks:', error);
        }
    }, [organizationFilter]);

    useEffect(() => {
        fetchRefills();
        fetchTanks();
    }, [fetchRefills, fetchTanks]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Auto-calculate total cost
        if (name === 'quantityAdded' || name === 'costPerLiter') {
            const qty = name === 'quantityAdded' ? value : formData.quantityAdded;
            const cost = name === 'costPerLiter' ? value : formData.costPerLiter;
            if (qty && cost) {
                setFormData(prev => ({
                    ...prev,
                    totalCost: (Number(qty) * Number(cost)).toFixed(2)
                }));
            }
        }
    };

    const resetForm = () => {
        setFormData({
            tank: '',
            refillDate: new Date().toISOString().split('T')[0],
            quantityAdded: '',
            supplier: '',
            invoiceNumber: '',
            costPerLiter: '',
            totalCost: '',
            notes: ''
        });
        setEditingRefill(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        try {
            const submissionData = {
                ...formData,
                quantityAdded: Number(formData.quantityAdded),
                costPerLiter: formData.costPerLiter ? Number(formData.costPerLiter) : undefined,
                totalCost: formData.totalCost ? Number(formData.totalCost) : undefined
            };

            if (editingRefill) {
                await axios.put(`${process.env.REACT_APP_API_BASE_URL}/tank-refills/${editingRefill}`, submissionData);
                setMessage({ text: 'Refill updated successfully!', type: 'success' });
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/tank-refills`, submissionData);
                setMessage({ text: 'Refill added successfully!', type: 'success' });
            }

            resetForm();
            fetchRefills();
            fetchTanks(); // Refresh tanks to show updated stock
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error('Error saving refill:', error);
            setMessage({ text: error.response?.data?.message || 'Error saving refill', type: 'error' });
        }
    };

    const handleEdit = (refill) => {
        setEditingRefill(refill._id);
        setFormData({
            tank: refill.tank?._id || '',
            refillDate: refill.refillDate.split('T')[0],
            quantityAdded: refill.quantityAdded,
            supplier: refill.supplier || '',
            invoiceNumber: refill.invoiceNumber || '',
            costPerLiter: refill.costPerLiter || '',
            totalCost: refill.totalCost || '',
            notes: refill.notes || ''
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this refill? This will reduce the tank stock.')) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/tank-refills/${id}`);
                setMessage({ text: 'Refill deleted successfully', type: 'success' });
                fetchRefills();
                fetchTanks(); // Refresh tanks to show updated stock
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            } catch (error) {
                console.error('Error deleting refill:', error);
                setMessage({ text: error.response?.data?.message || 'Error deleting refill', type: 'error' });
            }
        }
    };

    const handleExport = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const params = new URLSearchParams();

            if (user?.role !== 'admin' && user?.organisation?._id) {
                params.append('organisation', user.organisation._id);
            } else if (organizationFilter) {
                params.append('organisation', organizationFilter);
            }

            if (filters.tank) params.append('tank', filters.tank);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/tank-refills/export?${params}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'tank_refills.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting refills:', error);
            setMessage({ text: 'Error exporting data', type: 'error' });
        }
    };

    return (
        <div className="tank-refills-container">
            <div className="header">
                <h1><i className="fas fa-gas-pump"></i> Tank Refills</h1>
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
                        {showForm ? <><i className="fas fa-times"></i> Close</> : <><i className="fas fa-plus"></i> Add Refill</>}
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
                        <h2>{editingRefill ? 'Edit Tank Refill' : 'Add New Tank Refill'}</h2>
                        <form onSubmit={handleSubmit} className="tank-refill-form-modal" style={{ padding: 0, border: 'none', boxShadow: 'none', maxWidth: 'none', margin: 0 }}>
                            <div className="form-row">
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
                                                {tank.name} (Current: {tank.currentStock}L / {tank.capacity}L)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group half">
                                    <label>Refill Date *</label>
                                    <input
                                        type="date"
                                        name="refillDate"
                                        value={formData.refillDate}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group half">
                                    <label>Quantity Added (L) *</label>
                                    <input
                                        type="number"
                                        name="quantityAdded"
                                        value={formData.quantityAdded}
                                        onChange={handleChange}
                                        placeholder="e.g. 5000"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group half">
                                    <label>Cost Per Liter</label>
                                    <input
                                        type="number"
                                        name="costPerLiter"
                                        value={formData.costPerLiter}
                                        onChange={handleChange}
                                        placeholder="e.g. 95.50"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group half">
                                    <label>Total Cost</label>
                                    <input
                                        type="number"
                                        name="totalCost"
                                        value={formData.totalCost}
                                        onChange={handleChange}
                                        placeholder="Auto-calculated"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="form-group half">
                                    <label>Notes</label>
                                    <input
                                        type="text"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        placeholder="Additional notes"
                                    />
                                </div>
                            </div>

                            <div className="form-actions" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                                <button type="submit" className="btn-success">
                                    <i className="fas fa-save"></i> {editingRefill ? 'Update Refill' : 'Add Refill'}
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

            <div className="refills-list">
                <h3>Refill History</h3>
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading refills...</p>
                    </div>
                ) : refills.length === 0 ? (
                    <p className="no-data">No refills found.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="refills-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Tank</th>
                                    <th>Quantity (L)</th>
                                    <th>Supplier</th>
                                    <th>Invoice</th>
                                    <th>Cost/L</th>
                                    <th>Total Cost</th>
                                    <th>Created By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refills.map(refill => (
                                    <tr key={refill._id}>
                                        <td>{new Date(refill.refillDate).toLocaleDateString()}</td>
                                        <td><strong>{refill.tank?.name || 'N/A'}</strong></td>
                                        <td className="number-cell">{refill.quantityAdded.toFixed(2)}</td>
                                        <td>{refill.supplier || '-'}</td>
                                        <td>{refill.invoiceNumber || '-'}</td>
                                        <td className="number-cell">{refill.costPerLiter ? `₹${refill.costPerLiter.toFixed(2)}` : '-'}</td>
                                        <td className="number-cell">{refill.totalCost ? `₹${refill.totalCost.toFixed(2)}` : '-'}</td>
                                        <td>{refill.createdby}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-edit-sm" title="Edit" onClick={() => handleEdit(refill)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn-delete-sm" title="Delete" onClick={() => handleDelete(refill._id)}>
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
                        Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to {Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} entries
                    </div>
                    {pagination.totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                disabled={!pagination.hasPrev}
                                onClick={() => fetchRefills(pagination.currentPage - 1, itemsPerPage)}
                                className="btn-pagination"
                            >
                                <i className="fas fa-chevron-left"></i> Previous
                            </button>
                            <span className="page-indicator">Page {pagination.currentPage} of {pagination.totalPages}</span>
                            <button
                                disabled={!pagination.hasNext}
                                onClick={() => fetchRefills(pagination.currentPage + 1, itemsPerPage)}
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
                                fetchRefills(1, newSize);
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

export default TankRefills;
