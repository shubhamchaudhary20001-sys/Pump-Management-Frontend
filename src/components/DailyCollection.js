import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './DailyCollection.css';

const DailyCollection = ({ organizationFilter }) => {
    const [machines, setMachines] = useState([]);
    const [users, setUsers] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [selectedMachine, setSelectedMachine] = useState('');
    const [formData, setFormData] = useState(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            date: new Date().toISOString().split('T')[0],
            startReading: '',
            endReading: '',
            totalSale: 0,
            rate: 0,
            amount: 0,
            cash: '',
            card: '',
            upi: '',
            credit: '',
            shortExcess: 0,
            expenses: [{ amount: '', remarks: '' }],
            shift: user?.shift?._id || user?.shift || '',
            isTestingDone: false,
            notes: ''
        };
    });
    const [collections, setCollections] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasNext: false,
        hasPrev: false
    });
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [aggregates, setAggregates] = useState({
        totalAmount: 0,
        totalSale: 0,
        totalCash: 0,
        totalCard: 0,
        totalUPI: 0,
        totalCredit: 0,
        totalExpenses: 0,
        totalTesting: 0
    });
    const [message, setMessage] = useState({ text: '', type: '' });
    const [relatedTransactions, setRelatedTransactions] = useState([]);
    const [testingVolume, setTestingVolume] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        machine: '',
        status: '',
        createdby: '',
        shift: ''
    });
    const [appliedFilters, setAppliedFilters] = useState({
        startDate: '',
        endDate: '',
        machine: '',
        status: '',
        createdby: '',
        shift: ''
    });
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [showFilters, setShowFilters] = useState(false);

    const fetchCollections = useCallback(async (page = 1, limit = itemsPerPage) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role === 'purchaser') return;

        setIsLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });

            if (user && user.role !== 'admin') {
                params.append('organisation', user.organisation._id);
            } else if (organizationFilter) {
                params.append('organisation', organizationFilter);
            }

            if (appliedFilters.startDate) params.append('startDate', appliedFilters.startDate);
            if (appliedFilters.endDate) params.append('endDate', appliedFilters.endDate);
            if (appliedFilters.machine) params.append('machine', appliedFilters.machine);
            if (appliedFilters.status) params.append('status', appliedFilters.status);
            if (appliedFilters.createdby) params.append('createdby', appliedFilters.createdby);
            if (appliedFilters.shift) params.append('shift', appliedFilters.shift);

            if (sortConfig.key) {
                params.append('sortBy', sortConfig.key);
                params.append('sortOrder', sortConfig.direction);
            }

            const url = `${process.env.REACT_APP_API_BASE_URL}/daily-collections?${params.toString()}`;
            const response = await axios.get(url);

            if (response.data.data) {
                setCollections(response.data.data);
                setPagination(response.data.pagination);
                if (response.data.aggregates) {
                    setAggregates(response.data.aggregates);
                }
            } else {
                setCollections(response.data);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
            setMessage({ text: 'Error fetching collections', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [appliedFilters, organizationFilter, sortConfig, itemsPerPage]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleExport = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const params = new URLSearchParams();

            if (user && user.role !== 'admin') {
                params.append('organisation', user.organisation._id);
            } else if (organizationFilter) {
                params.append('organisation', organizationFilter);
            }

            if (appliedFilters.startDate) params.append('startDate', appliedFilters.startDate);
            if (appliedFilters.endDate) params.append('endDate', appliedFilters.endDate);
            if (appliedFilters.machine) params.append('machine', appliedFilters.machine);
            if (appliedFilters.status) params.append('status', appliedFilters.status);
            if (appliedFilters.createdby) params.append('createdby', appliedFilters.createdby);
            if (appliedFilters.shift) params.append('shift', appliedFilters.shift);

            const url = `${process.env.REACT_APP_API_BASE_URL}/daily-collections/export?${params.toString()}`;
            const response = await axios.get(url, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `daily_collections_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting collections:', error);
            setMessage({ text: 'Error exporting collections', type: 'error' });
        }
    }, [appliedFilters, organizationFilter]);

    const fetchTestingVolume = useCallback(async (machineId, date, shiftId = null) => {
        if (!machineId || !date) {
            setTestingVolume(0);
            return;
        }
        try {
            const shift = shiftId || formData.shift;
            let url = `${process.env.REACT_APP_API_BASE_URL}/testings/for-date-machine?machine=${machineId}&date=${date}`;
            if (shift) url += `&shift=${shift}`;
            const response = await axios.get(url);
            setTestingVolume(response.data.testAmount || 0);
        } catch (error) {
            console.error('Error fetching testing volume:', error);
            setTestingVolume(0);
        }
    }, [formData.shift]);

    const fetchUsers = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            let url = `${process.env.REACT_APP_API_BASE_URL}/users?page=1&limit=1000`;

            if (user && user.role !== 'admin') {
                url += `&organisation=${user.organisation._id}`;
            } else if (organizationFilter) {
                url += `&organisation=${organizationFilter}`;
            }

            const response = await axios.get(url);
            setUsers(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }, [organizationFilter]);

    const fetchShifts = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            let url = `${process.env.REACT_APP_API_BASE_URL}/shifts?isactive=true&limit=1000`;

            if (user && user.role !== 'admin') {
                url += `&organisation=${user.organisation._id}`;
            } else if (organizationFilter) {
                url += `&organisation=${organizationFilter}`;
            }

            const response = await axios.get(url);
            setShifts(response.data || []);
        } catch (error) {
            console.error('Error fetching shifts:', error);
        }
    }, [organizationFilter]);

    const fetchMachines = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            let url = `${process.env.REACT_APP_API_BASE_URL}/machines?isactive=true&limit=1000`;

            if (user && user.role === 'salesman') {
                url += '&mine=true';
            } else if (user && user.role !== 'admin') {
                url += `&organisation=${user.organisation._id}`;
            } else if (organizationFilter) {
                url += `&organisation=${organizationFilter}`;
            }

            const response = await axios.get(url);
            const machinesList = response.data?.data || response.data || [];
            setMachines(machinesList);
        } catch (error) {
            console.error('Error fetching machines:', error);
        }
    }, [organizationFilter]);

    const fetchRelatedTransactions = useCallback(async () => {
        if (!selectedMachine || !formData.date) {
            setRelatedTransactions([]);
            return;
        }

        try {
            const url = `${process.env.REACT_APP_API_BASE_URL}/data?machine=${selectedMachine}&startDate=${formData.date}&endDate=${formData.date}&status=pending&limit=1000`;
            const response = await axios.get(url);
            setRelatedTransactions(response.data.data || []);
        } catch (error) {
            console.error('Error fetching related transactions:', error);
        }
    }, [selectedMachine, formData.date]);

    useEffect(() => {
        fetchRelatedTransactions();
    }, [fetchRelatedTransactions]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role !== 'purchaser') {
            fetchMachines();
            fetchUsers();
            fetchShifts();
        }
    }, [fetchMachines, fetchUsers, fetchShifts]);

    useEffect(() => {
        fetchCollections();
    }, [fetchCollections]);

    const handleMachineChange = (e) => {
        const id = e.target.value;
        setSelectedMachine(id);
        setFormData(prev => ({
            ...prev,
            machine: id
        }));

        if (id) {
            const machine = machines.find(m => m._id === id);
            if (machine) {
                setFormData(prev => ({
                    ...prev,
                    startReading: machine.currentReading || 0,
                    rate: machine.fuel?.rate || 0
                }));
            }
            fetchTestingVolume(id, formData.date);
        } else {
            setTestingVolume(0);
        }
    };

    const calculateShortExcess = useCallback((data, testingVol) => {
        const start = parseFloat(data.startReading) || 0;
        const end = parseFloat(data.endReading) || 0;
        const rate = parseFloat(data.rate) || 0;
        const totalSale = Math.max(0, end - start);
        const grossAmount = totalSale * rate;
        const testingAmount = data.isTestingDone ? (testingVol || 0) * rate : 0;
        const netAmount = grossAmount - testingAmount;

        const cash = parseFloat(data.cash) || 0;
        const card = parseFloat(data.card) || 0;
        const upi = parseFloat(data.upi) || 0;
        const credit = parseFloat(data.credit) || 0;
        const totalCollected = cash + card + upi + credit;

        const expenseAmount = (data.expenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        // shortExcess = (Collected + Expenses) - (Total Dispensed Value - Testing Value)
        const shortExcess = (totalCollected + expenseAmount) - netAmount;

        return {
            totalSale: totalSale.toFixed(2),
            amount: netAmount.toFixed(2), // amount is now net sale amount
            shortExcess: shortExcess.toFixed(2),
            expenseAmount: expenseAmount.toFixed(2)
        };
    }, []);

    useEffect(() => {
        if (showForm) {
            const results = calculateShortExcess(formData, testingVolume);
            setFormData(prev => ({
                ...prev,
                ...results
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testingVolume, calculateShortExcess, showForm]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            if (name === 'date' && selectedMachine) {
                fetchTestingVolume(selectedMachine, value, formData.shift);
            }

            if (name === 'shift' && selectedMachine) {
                fetchTestingVolume(selectedMachine, formData.date, value);
            }

            if (['startReading', 'endReading', 'rate', 'cash', 'card', 'upi', 'credit', 'isTestingDone'].includes(name)) {
                const results = calculateShortExcess(newData, testingVolume);
                return { ...newData, ...results };
            }
            return newData;
        });
    };

    const handleExpenseChange = (index, field, value) => {
        setFormData(prev => {
            const newExpenses = [...prev.expenses];
            newExpenses[index][field] = value;
            const newData = { ...prev, expenses: newExpenses };
            const results = calculateShortExcess(newData, testingVolume);
            return { ...newData, ...results };
        });
    };

    const addExpenseRow = () => {
        setFormData({
            ...formData,
            expenses: [...formData.expenses, { amount: '', remarks: '' }]
        });
    };

    const removeExpenseRow = (index) => {
        const newExpenses = formData.expenses.filter((_, i) => i !== index);
        setFormData({ ...formData, expenses: newExpenses });
    };

    const [editingCollection, setEditingCollection] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        try {
            const submissionData = {
                ...formData,
                machine: selectedMachine,
                startReading: Number(formData.startReading),
                endReading: Number(formData.endReading),
                cash: Number(formData.cash) || 0,
                card: Number(formData.card) || 0,
                upi: Number(formData.upi) || 0,
                credit: Number(formData.credit) || 0
            };

            if (editingCollection) {
                await axios.put(`${process.env.REACT_APP_API_BASE_URL}/daily-collections/${editingCollection}`, submissionData);
                setMessage({ text: 'Daily collection updated successfully!', type: 'success' });
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/daily-collections`, submissionData);
                setMessage({ text: 'Daily collection added successfully!', type: 'success' });
            }

            fetchMachines();
            fetchCollections();
            resetForm();
        } catch (error) {
            console.error('Error saving collection:', error);
            setMessage({ text: error.response?.data?.message || 'Error saving collection!', type: 'error' });
        }
    };

    const handleEdit = (item) => {
        setEditingCollection(item._id);
        setSelectedMachine(item.machine?._id || '');
        setFormData({
            date: item.date.split('T')[0],
            startReading: item.startReading,
            endReading: item.endReading,
            totalSale: item.totalSale,
            rate: item.rate,
            amount: item.amount,
            cash: item.cash,
            card: item.card,
            upi: item.upi,
            credit: item.credit || '',
            shortExcess: item.shortExcess,
            expenses: item.expenses || [{ amount: '', remarks: '' }],
            shift: item.shift?._id || item.shift || '',
            isTestingDone: item.isTestingDone || false,
            notes: item.notes || ''
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/daily-collections/${id}`);
                setMessage({ text: 'Daily collection deleted successfully!', type: 'success' });
                fetchCollections();
            } catch (error) {
                console.error('Error deleting collection:', error);
                setMessage({ text: 'Error deleting collection!', type: 'error' });
            }
        }
    };

    const resetForm = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        setFormData({
            date: new Date().toISOString().split('T')[0],
            startReading: '',
            endReading: '',
            totalSale: 0,
            rate: 0,
            amount: 0,
            cash: '',
            card: '',
            upi: '',
            credit: '',
            shortExcess: 0,
            expenses: [{ amount: '', remarks: '' }],
            shift: user?.shift?._id || user?.shift || '',
            isTestingDone: false,
            notes: ''
        });
        setSelectedMachine('');
        setEditingCollection(null);
        setShowForm(false);
    };

    const handleApplyFilters = () => {
        setAppliedFilters({ ...filters });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleClearFilters = () => {
        const emptyFilters = { startDate: '', endDate: '', machine: '', status: '', createdby: '', shift: '' };
        setFilters(emptyFilters);
        setAppliedFilters(emptyFilters);
    };

    const handleApprove = async (id) => {
        if (window.confirm('Are you sure you want to approve this entry? It will be locked for editing.')) {
            try {
                await axios.put(`${process.env.REACT_APP_API_BASE_URL}/daily-collections/${id}/approve`);
                setMessage({ text: 'Entry approved successfully!', type: 'success' });
                fetchCollections();
            } catch (error) {
                console.error('Error approving entry:', error);
                setMessage({ text: error.response?.data?.message || 'Error approving entry', type: 'error' });
            }
        }
    };

    return (
        <div className="daily-collection-container">
            <div className="header">
                <h1><i className="fas fa-file-invoice-dollar"></i> Daily Reading & Collection</h1>
                <div className="header-actions">
                    <button
                        className={`btn-filter ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                        title="Toggle Search & Filters"
                    >
                        <i className="fas fa-search"></i> {showFilters ? 'Hide Search' : 'Search'}
                    </button>
                    <button
                        className="btn-excel"
                        onClick={handleExport}
                        title="Export to Excel"
                    >
                        <i className="fas fa-file-excel"></i> Excel
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => {
                            if (showForm) {
                                resetForm();
                            } else {
                                setShowForm(true);
                            }
                        }}
                    >
                        {showForm ? <><i className="fas fa-times"></i> Close</> : <><i className="fas fa-plus"></i> Add Entry</>}
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
                        <h2>{editingCollection ? 'Edit Daily Collection' : 'Add New Daily Collection'}</h2>
                        <form onSubmit={handleSubmit} className="daily-collection-form-modal" style={{ padding: 0, border: 'none', boxShadow: 'none', maxWidth: 'none', margin: 0 }}>
                            <div className="form-row">
                                <div className="form-group half">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group half">
                                    <label>Machine</label>
                                    <select
                                        name="machine"
                                        value={selectedMachine}
                                        onChange={handleMachineChange}
                                        required
                                    >
                                        <option value="">Select Machine</option>
                                        {machines.map(machine => (
                                            <option key={machine._id} value={machine._id}>
                                                {machine.name} ({machine.fuel?.name})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group half">
                                    <label>Shift</label>
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
                            </div>

                            <div className="form-row">
                                <div className="form-group third">
                                    <label>Start Reading</label>
                                    <input
                                        type="number"
                                        name="startReading"
                                        value={formData.startReading}
                                        readOnly
                                        className="readonly-input"
                                    />
                                </div>
                                <div className="form-group third">
                                    <label>End Reading</label>
                                    <input
                                        type="number"
                                        name="endReading"
                                        value={formData.endReading}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="form-group third">
                                    <label>Total Sale (Ltrs)</label>
                                    <input
                                        type="number"
                                        value={formData.totalSale}
                                        readOnly
                                        className="readonly-input"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group third">
                                    <label>Rate (₹)</label>
                                    <input
                                        type="number"
                                        name="rate"
                                        value={formData.rate}
                                        onChange={handleChange}
                                        readOnly={JSON.parse(localStorage.getItem('user'))?.role !== 'manager'}
                                        className={JSON.parse(localStorage.getItem('user'))?.role !== 'manager' ? "readonly-input" : ""}
                                    />
                                </div>
                                <div className="form-group third">
                                    <label>Testing Deduction (₹)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '42px' }}>
                                        <div className="checkbox-group" style={{ margin: 0 }}>
                                            <input
                                                type="checkbox"
                                                id="isTestingDone"
                                                name="isTestingDone"
                                                checked={formData.isTestingDone}
                                                onChange={(e) => handleChange({ target: { name: 'isTestingDone', value: e.target.checked } })}
                                            />
                                            <label htmlFor="isTestingDone" style={{ marginBottom: 0 }}>Deduct Testing?</label>
                                        </div>
                                        {formData.isTestingDone && (
                                            <span style={{ color: '#0369a1', fontWeight: '600', fontSize: '14px' }}>
                                                - ₹{(testingVolume * formData.rate).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group third">
                                    <label>Net Sale Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        readOnly
                                        className="readonly-input"
                                        style={{ fontWeight: 'bold', color: '#16a34a' }}
                                    />
                                </div>
                            </div>

                            <div style={{ margin: '20px 0', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                <h4 style={{ marginBottom: '15px', color: '#475569' }}>Collections</h4>
                                <div className="form-row">
                                    <div className="form-group third">
                                        <label>Cash</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="cash"
                                            value={formData.cash}
                                            onChange={handleChange}
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group third">
                                        <label>Card</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="card"
                                            value={formData.card}
                                            onChange={handleChange}
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group third">
                                        <label>UPI</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="upi"
                                            value={formData.upi}
                                            onChange={handleChange}
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group third">
                                        <label>Credit</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="credit"
                                            value={formData.credit}
                                            onChange={handleChange}
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Short / Excess</label>
                                <input
                                    type="number"
                                    value={formData.shortExcess}
                                    readOnly
                                    className={`readonly-input ${formData.shortExcess < 0 ? 'negative' : 'positive'}`}
                                />
                            </div>

                            <div style={{ margin: '20px 0', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h4 style={{ margin: 0, color: '#475569' }}>Shift Expenses</h4>
                                    <button type="button" className="btn-primary" onClick={addExpenseRow} style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }}>
                                        <i className="fas fa-plus"></i> Add Expense
                                    </button>
                                </div>
                                {formData.expenses.map((expense, index) => (
                                    <div key={index} className="form-row" style={{ marginBottom: '10px', alignItems: 'flex-end', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #eee' }}>
                                        <div className="form-group" style={{ flex: 2 }}>
                                            <label>Amount</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={expense.amount}
                                                onChange={(e) => handleExpenseChange(index, 'amount', e.target.value)}
                                                placeholder="Amount"
                                                min="0"
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 3 }}>
                                            <label>Remarks</label>
                                            <input
                                                type="text"
                                                value={expense.remarks}
                                                onChange={(e) => handleExpenseChange(index, 'remarks', e.target.value)}
                                                placeholder="e.g. Tea, Oil, Repairs"
                                            />
                                        </div>
                                        {formData.expenses.length > 1 && (
                                            <button
                                                type="button"
                                                className="btn-delete-sm"
                                                onClick={() => removeExpenseRow(index)}
                                                style={{ height: '42px', marginBottom: '4px', borderColor: '#fee2e2' }}
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="form-group">
                                <label>Notes:</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Additional details..."
                                    rows="2"
                                ></textarea>
                            </div>

                            {relatedTransactions.length > 0 && (
                                <div className="related-transactions-summary" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                    <h4 style={{ color: '#0369a1', marginBottom: '10px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fas fa-gas-pump"></i> Fuel Requests for this Shift
                                    </h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', color: '#0c4a6e' }}>
                                            Found <strong>{relatedTransactions.length}</strong> transactions totaling <strong>₹{relatedTransactions.reduce((sum, t) => sum + (t.totalPrice || 0), 0).toFixed(2)}</strong>
                                        </span>
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={() => {
                                                const cardAmount = relatedTransactions.reduce((sum, t) => sum + (t.totalPrice || 0), 0).toFixed(2);
                                                setFormData(prev => ({ ...prev, card: cardAmount }));
                                                const results = calculateShortExcess({ ...formData, card: cardAmount }, testingVolume);
                                                setFormData(prev => ({ ...prev, ...results }));
                                            }}
                                            style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }}
                                        >
                                            <i className="fas fa-sync-alt"></i> Apply to Card
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="form-actions" style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                                <button type="submit" className="btn-success" disabled={!selectedMachine || formData.endReading === ''}>
                                    <i className="fas fa-save"></i> {editingCollection ? 'Update Entry' : 'Save Entry'}
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
                <div className="filters-section" style={{ marginBottom: '0', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: '600' }}>Filters</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        <div className="filter-group">
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Start Date</label>
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
                        <div className="filter-group">
                            <label>Machine</label>
                            <select
                                value={filters.machine}
                                onChange={(e) => setFilters({ ...filters, machine: e.target.value })}
                            >
                                <option value="">All Machines</option>
                                {machines.map(m => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Created By</label>
                            <select
                                value={filters.createdby}
                                onChange={(e) => setFilters({ ...filters, createdby: e.target.value })}
                            >
                                <option value="">All Staff</option>
                                {users.map(u => (
                                    <option key={u._id} value={`${u.firstname} ${u.lastname}`}>{u.firstname} {u.lastname}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Shift</label>
                            <select
                                value={filters.shift}
                                onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
                            >
                                <option value="">All Shifts</option>
                                {shifts.map(s => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="filter-actions" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                        <button
                            className="btn-primary"
                            onClick={handleApplyFilters}
                            style={{ padding: '8px 16px' }}
                        >
                            <i className="fas fa-filter"></i> Apply Filters
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={handleClearFilters}
                            style={{ padding: '8px 16px' }}
                        >
                            <i className="fas fa-undo"></i> Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Aggregates Summary */}
            {
                !isLoading && collections.length > 0 && (
                    <div className="aggregates-summary" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '20px',
                        marginBottom: '20px',
                        padding: '20px',
                        backgroundColor: '#e7f3ff',
                        borderRadius: '8px',
                        border: '1px solid #b3d7ff'
                    }}>
                        <div className="aggregate-item">
                            <span style={{ fontSize: '13px', color: '#555', display: 'block', fontWeight: '500' }}>Sales (Ltrs)</span>
                            <strong style={{ fontSize: '18px', color: '#0056b3' }}>{(Number(aggregates.totalSale) || 0).toFixed(2)} L</strong>
                        </div>
                        <div className="aggregate-card" style={{ borderLeft: '1px solid #b3d7ff', paddingLeft: '15px' }}>
                            <span style={{ fontSize: '13px', color: '#991b1b', display: 'block', fontWeight: '500' }}>Total Testing</span>
                            <strong style={{ fontSize: '18px', color: '#dc2626' }}>{(Number(aggregates.totalTesting) || 0).toFixed(2)} L</strong>
                        </div>
                        <div className="aggregate-item" style={{ borderLeft: '1px solid #b3d7ff', paddingLeft: '15px' }}>
                            <span style={{ fontSize: '13px', color: '#555', display: 'block', fontWeight: '500' }}>Bill Amount</span>
                            <strong style={{ fontSize: '18px', color: '#0056b3' }}>₹{(Number(aggregates.totalAmount) || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="aggregate-item" style={{ borderLeft: '1px solid #b3d7ff', paddingLeft: '15px' }}>
                            <span style={{ fontSize: '13px', color: '#7c3aed', display: 'block', fontWeight: '500' }}><i className="fas fa-money-bill-wave"></i> Cash</span>
                            <strong style={{ fontSize: '18px', color: '#7c3aed' }}>₹{(Number(aggregates.totalCash) || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="aggregate-item" style={{ borderLeft: '1px solid #b3d7ff', paddingLeft: '15px' }}>
                            <span style={{ fontSize: '13px', color: '#0891b2', display: 'block', fontWeight: '500' }}><i className="fas fa-credit-card"></i> Card</span>
                            <strong style={{ fontSize: '18px', color: '#0891b2' }}>₹{(Number(aggregates.totalCard) || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="aggregate-item" style={{ borderLeft: '1px solid #b3d7ff', paddingLeft: '15px' }}>
                            <span style={{ fontSize: '13px', color: '#db2777', display: 'block', fontWeight: '500' }}><i className="fas fa-mobile-alt"></i> UPI</span>
                            <strong style={{ fontSize: '18px', color: '#db2777' }}>₹{(Number(aggregates.totalUPI) || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="aggregate-item" style={{ borderLeft: '1px solid #b3d7ff', paddingLeft: '15px' }}>
                            <span style={{ fontSize: '13px', color: '#f59e0b', display: 'block', fontWeight: '500' }}><i className="fas fa-handshake"></i> Credit</span>
                            <strong style={{ fontSize: '18px', color: '#f59e0b' }}>₹{(Number(aggregates.totalCredit) || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="aggregate-item" style={{ borderLeft: '1px solid #b3d7ff', paddingLeft: '15px' }}>
                            <span style={{ fontSize: '13px', color: '#dc2626', display: 'block', fontWeight: '500' }}><i className="fas fa-wallet"></i> Expenses</span>
                            <strong style={{ fontSize: '18px', color: '#dc2626' }}>₹{(Number(aggregates.totalExpenses) || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="aggregate-item" style={{ borderLeft: '2px solid #16a34a', paddingLeft: '15px', backgroundColor: '#f0fdf4', borderRadius: '4px', padding: '10px' }}>
                            <span style={{ fontSize: '13px', color: '#16a34a', display: 'block', fontWeight: '700' }}><i className="fas fa-hand-holding-usd"></i> CASH IN HAND</span>
                            <strong style={{ fontSize: '20px', color: '#16a34a' }}>₹{(Number(aggregates.totalCash || 0) - Number(aggregates.totalExpenses || 0)).toLocaleString('en-IN')}</strong>
                        </div>
                    </div>
                )
            }

            <div className="collections-list">
                <h3>Recent Collections</h3>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="spinner"></div>
                        <p>Loading collections...</p>
                    </div>
                ) : collections.length === 0 ? (
                    <p className="no-data">No daily collections found.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="collections-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                                        Date {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th>Shift</th>
                                    <th onClick={() => handleSort('machine')} style={{ cursor: 'pointer' }}>
                                        Machine {sortConfig.key === 'machine' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th>Reading</th>
                                    <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                                        Sale/Amt {sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th>Testing</th>
                                    <th>Collections</th>
                                    <th>Expenses</th>
                                    <th onClick={() => handleSort('shortExcess')} style={{ cursor: 'pointer' }}>
                                        Diff {sortConfig.key === 'shortExcess' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th onClick={() => handleSort('createdby')} style={{ cursor: 'pointer' }}>
                                        Created By {sortConfig.key === 'createdby' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                                        Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collections.map(item => {
                                    const user = JSON.parse(localStorage.getItem('user'));
                                    const isAdmin = user?.role === 'admin';
                                    const isManager = user?.role === 'manager';
                                    const isCreator = item.createdby === (user?.firstname + ' ' + user?.lastname);
                                    const canEdit = isAdmin || (item.status !== 'approved' && (isManager || isCreator));
                                    const canApprove = (isManager || isAdmin) && item.status !== 'approved';

                                    return (
                                        <tr key={item._id} className={item.status === 'approved' ? 'approved-row' : ''}>
                                            <td>{new Date(item.date).toLocaleDateString()}</td>
                                            <td><span className="badge badge-info" style={{ fontSize: '10px' }}>{item.shift ? item.shift.name : 'N/A'}</span></td>
                                            <td>{item.machine?.name || 'Unknown'} <small>({item.machine?.fuel?.name})</small></td>
                                            <td>
                                                <div style={{ fontSize: '12px' }}>{item.startReading}</div>
                                                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.endReading}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '12px' }}>{item.totalSale.toFixed(1)} L</div>
                                                <div style={{ fontWeight: 'bold' }}>₹{item.amount.toFixed(0)}</div>
                                            </td>
                                            <td>
                                                {item.testingVolume > 0 ? (
                                                    <div style={{ fontSize: '12px', color: '#0369a1' }}>
                                                        <div>{item.testingVolume.toFixed(2)} L</div>
                                                        <div style={{ fontSize: '11px' }}>(-₹{item.testingAmount?.toFixed(0)})</div>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td>
                                                <div className="collection-breakdown">
                                                    <div title="Cash"><i className="fas fa-money-bill-wave"></i> {item.cash}</div>
                                                    <div title="Card"><i className="fas fa-credit-card"></i> {item.card}</div>
                                                    <div title="UPI"><i className="fas fa-mobile-alt"></i> {item.upi}</div>
                                                    <div title="Credit"><i className="fas fa-handshake"></i> {item.credit || 0}</div>
                                                </div>
                                            </td>
                                            <td>
                                                {item.expenseAmount > 0 ? (
                                                    <div className="expense-details">
                                                        <div className="text-danger" style={{ fontWeight: 'bold' }}>₹{item.expenseAmount}</div>
                                                        <div style={{ fontSize: '11px', color: '#666' }}>
                                                            {(item.expenses || []).map((e, i) => (
                                                                <div key={i}>• {e.remarks || 'Misc'}: {e.amount}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className={item.shortExcess < 0 ? 'text-danger' : 'text-success'}>
                                                {item.shortExcess.toFixed(0)}
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px' }}>{item.createdby || 'N/A'}</div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${item.status}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    {canApprove && (
                                                        <button className="btn-approve-sm" onClick={() => handleApprove(item._id)} title="Approve">
                                                            <i className="fas fa-check-circle"></i>
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <>
                                                            <button className="btn-edit-sm" onClick={() => handleEdit(item)} title="Edit">
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button className="btn-delete-sm" onClick={() => handleDelete(item._id)} title="Delete">
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <div className="items-per-page">
                    <label style={{ marginRight: '10px' }}>Items per page:</label>
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
                            onClick={() => fetchCollections(pagination.currentPage - 1)}
                            disabled={!pagination.hasPrev}
                        >
                            Previous
                        </button>
                        <span className="pagination-info">
                            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total items)
                        </span>
                        <button
                            className="btn-pagination"
                            onClick={() => fetchCollections(pagination.currentPage + 1)}
                            disabled={!pagination.hasNext}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default DailyCollection;
