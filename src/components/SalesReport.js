import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './SalesReport.css';

const SalesReport = ({ organizationFilter }) => {
    const [reportData, setReportData] = useState({
        summary: { totalCash: 0, totalCard: 0, totalUPI: 0, totalCredit: 0, totalVolume: 0, totalAmount: 0, totalTesting: 0 },
        machineWise: [],
        tankWise: []
    });
    const [machines, setMachines] = useState([]);
    const [tanks, setTanks] = useState([]);
    const [salesmen, setSalesmen] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showFilters, setShowFilters] = useState(true);
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0], // Last 7 days
        endDate: new Date().toISOString().split('T')[0],
        machine: '',
        tank: '',
        createdby: ''
    });

    const fetchDropdownData = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const orgId = user?.role !== 'admin' ? user?.organisation?._id : organizationFilter;

            let params = orgId ? `?organisation=${orgId}` : '';

            const [machinesRes, tanksRes, usersRes] = await Promise.all([
                axios.get(`${process.env.REACT_APP_API_BASE_URL}/machines${params}${params ? '&' : '?'}limit=1000`),
                axios.get(`${process.env.REACT_APP_API_BASE_URL}/tanks${params}${params ? '&' : '?'}limit=1000`),
                axios.get(`${process.env.REACT_APP_API_BASE_URL}/users${params}${params ? '&' : '?'}roleid=salesman&limit=1000`)
            ]);

            setMachines(machinesRes.data.data || []);
            setTanks(tanksRes.data.data || []);
            setSalesmen(usersRes.data.data || []);
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
        }
    }, [organizationFilter]);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const orgId = user?.role !== 'admin' ? user?.organisation?._id : organizationFilter;

            const params = new URLSearchParams({
                ...filters,
                ...(orgId ? { organisation: orgId } : {})
            });

            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/daily-collections/reports?${params.toString()}`);
            setReportData(response.data);
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoading(false);
        }
    }, [filters, organizationFilter]);

    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleReset = () => {
        setFilters({
            startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            machine: '',
            tank: '',
            createdby: ''
        });
    };

    return (
        <div className="sales-report-container">
            <div className="header">
                <h1>📊 Sales Analytics Dashboard</h1>
                <div className="header-actions">
                    <button
                        className={`btn-filter ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <i className="fas fa-filter"></i> {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                    <button className="btn-secondary" onClick={handleReset}>
                        <i className="fas fa-undo"></i> Reset Filters
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="filters-section">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label>From Date</label>
                            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        </div>
                        <div className="filter-group">
                            <label>To Date</label>
                            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                        </div>
                        <div className="filter-group">
                            <label>Salesman</label>
                            <select name="createdby" value={filters.createdby} onChange={handleFilterChange}>
                                <option value="">All Salesmen</option>
                                {salesmen.map(s => (
                                    <option key={s._id} value={`${s.firstname} ${s.lastname}`}>{s.firstname} {s.lastname}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Machine</label>
                            <select name="machine" value={filters.machine} onChange={handleFilterChange}>
                                <option value="">All Machines</option>
                                {machines.map(m => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Tank</label>
                            <select name="tank" value={filters.tank} onChange={handleFilterChange}>
                                <option value="">All Tanks</option>
                                {tanks.map(t => (
                                    <option key={t._id} value={t._id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Generating Report...</p>
                </div>
            ) : (
                <>
                    <div className="summary-cards">
                        <div className="report-card primary">
                            <span className="card-label">Total Volume</span>
                            <strong className="card-value">{reportData.summary.totalVolume.toFixed(2)} L</strong>
                            <i className="fas fa-gas-pump card-icon"></i>
                        </div>
                        <div className="report-card success">
                            <span className="card-label">Cash Sale</span>
                            <strong className="card-value">₹{reportData.summary.totalCash.toLocaleString()}</strong>
                            <i className="fas fa-money-bill-wave card-icon"></i>
                        </div>
                        <div className="report-card info">
                            <span className="card-label">UPI Sale</span>
                            <strong className="card-value">₹{reportData.summary.totalUPI.toLocaleString()}</strong>
                            <i className="fas fa-mobile-alt card-icon"></i>
                        </div>
                        <div className="report-card warning">
                            <span className="card-label">Credit Sale</span>
                            <strong className="card-value">₹{reportData.summary.totalCredit.toLocaleString()}</strong>
                            <i className="fas fa-handshake card-icon"></i>
                        </div>
                        <div className="report-card purple">
                            <span className="card-label">Card Sale</span>
                            <strong className="card-value">₹{reportData.summary.totalCard.toLocaleString()}</strong>
                            <i className="fas fa-credit-card card-icon"></i>
                        </div>
                        <div className="report-card primary" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                            <span className="card-label" style={{ color: '#475569' }}>Total Testing</span>
                            <strong className="card-value" style={{ color: '#1e293b' }}>{reportData.summary.totalTesting.toFixed(2)} L</strong>
                            <i className="fas fa-flask card-icon" style={{ color: '#94a3b8' }}></i>
                        </div>
                    </div>

                    <div className="report-grid">
                        <div className="report-section">
                            <h3><i className="fas fa-gears"></i> Machine-wise Breakdown</h3>
                            <div className="table-responsive">
                                <table className="collections-table">
                                    <thead>
                                        <tr>
                                            <th>Machine</th>
                                            <th>Sales (L)</th>
                                            <th>Testing (L)</th>
                                            <th>Cash</th>
                                            <th>UPI</th>
                                            <th>Card</th>
                                            <th>Credit</th>
                                            <th>Total (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.machineWise.map(m => (
                                            <tr key={m._id}>
                                                <td><strong>{m.name}</strong></td>
                                                <td>{m.totalVolume.toFixed(2)} L</td>
                                                <td className="text-info">{m.totalTesting ? m.totalTesting.toFixed(2) : '0.00'} L</td>
                                                <td>₹{m.totalCash.toLocaleString()}</td>
                                                <td>₹{m.totalUPI.toLocaleString()}</td>
                                                <td>₹{m.totalCard.toLocaleString()}</td>
                                                <td>₹{m.totalCredit.toLocaleString()}</td>
                                                <td><strong>₹{m.totalAmount.toLocaleString()}</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="report-section">
                            <h3><i className="fas fa-drum-steel-pan"></i> Tank-wise Breakdown</h3>
                            <div className="table-responsive">
                                <table className="collections-table">
                                    <thead>
                                        <tr>
                                            <th>Tank</th>
                                            <th>Sales (L)</th>
                                            <th>Testing (L)</th>
                                            <th>Cash</th>
                                            <th>UPI</th>
                                            <th>Card</th>
                                            <th>Credit</th>
                                            <th>Total (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.tankWise.map(t => (
                                            <tr key={t._id}>
                                                <td><strong>{t.name}</strong></td>
                                                <td>{t.totalVolume.toFixed(2)} L</td>
                                                <td className="text-info">{t.totalTesting ? t.totalTesting.toFixed(2) : '0.00'} L</td>
                                                <td>₹{t.totalCash.toLocaleString()}</td>
                                                <td>₹{t.totalUPI.toLocaleString()}</td>
                                                <td>₹{t.totalCard.toLocaleString()}</td>
                                                <td>₹{t.totalCredit.toLocaleString()}</td>
                                                <td><strong>₹{t.totalAmount.toLocaleString()}</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalesReport;
