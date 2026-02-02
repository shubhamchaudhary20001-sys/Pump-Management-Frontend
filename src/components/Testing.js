import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Testing.css';

const Testing = ({ organizationFilter }) => {
    const [testings, setTestings] = useState([]);
    const [tanks, setTanks] = useState([]);
    const [machines, setMachines] = useState([]);
    const [allMachines, setAllMachines] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingTesting, setEditingTesting] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        tank: '',
        machine: '',
        testAmount: '',
        notes: ''
    });
    const [filters, setFilters] = useState({
        tank: '',
        machine: '',
        startDate: '',
        endDate: ''
    });

    const fetchTestings = useCallback(async () => {
        setIsLoading(true);
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
            params.append('limit', '1000');

            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/testings?${params}`);
            setTestings(response.data.data || []);
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
        setFormData({
            date: new Date().toISOString().split('T')[0],
            tank: '',
            machine: '',
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
                <form onSubmit={handleSubmit} className="testing-form fade-in">
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
                            {!formData.tank && <small className="form-text">Select a tank first</small>}
                        </div>
                        <div className="form-group half">
                            <label>Test Amount (Liters) *</label>
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

                    <div className="form-actions">
                        <button type="submit" className="btn-primary">
                            <i className="fas fa-save"></i> {editingTesting ? 'Update Testing' : 'Add Testing'}
                        </button>
                        {editingTesting && (
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            )}

            <div className="filters-section">
                <h3>Filters</h3>
                <div className="filter-row">
                    <div className="filter-group">
                        <label>Tank</label>
                        <select
                            value={filters.tank}
                            onChange={(e) => setFilters({ ...filters, tank: e.target.value })}
                        >
                            <option value="">All Tanks</option>
                            {tanks.map(tank => (
                                <option key={tank._id} value={tank._id}>{tank.name}</option>
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
                            {allMachines.map(machine => (
                                <option key={machine._id} value={machine._id}>{machine.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                    </div>
                    <div className="filter-group">
                        <label>End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
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
        </div>
    );
};

export default Testing;
