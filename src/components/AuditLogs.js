import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AuditLogs.css';

const AuditLogs = ({ organizationFilter }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasNext: false,
        hasPrev: false
    });
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = useCallback(async (page = 1, limit = itemsPerPage) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });

            if (organizationFilter) params.append('organisation', organizationFilter);
            if (appliedSearch) params.append('search', appliedSearch);
            if (sortConfig.key) {
                params.append('sortBy', sortConfig.key);
                params.append('sortOrder', sortConfig.direction);
            }

            const url = `${process.env.REACT_APP_API_BASE_URL}/audit-logs?${params.toString()}`;
            const response = await axios.get(url);
            setLogs(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, [organizationFilter, appliedSearch, sortConfig, itemsPerPage]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (organizationFilter) params.append('organisation', organizationFilter);
            if (appliedSearch) params.append('search', appliedSearch);

            const url = `${process.env.REACT_APP_API_BASE_URL}/audit-logs/export?${params.toString()}`;

            const response = await axios.get(url, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting logs:', error);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const formatDetails = (details) => {
        if (!details) return '-';
        try {
            // If details is an object, format it nicely
            if (typeof details === 'object') {
                return Object.entries(details)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
            }
            return String(details);
        } catch (e) {
            return String(details);
        }
    };

    if (loading && logs.length === 0) return <div className="loading">Loading logs...</div>;

    return (
        <div className="audit-logs-container">
            <div className="header">
                <h1>🛡️ Audit Logs</h1>
                <div className="header-actions">
                    <button
                        className={`btn-filter ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <i className="fas fa-search"></i> {showFilters ? 'Hide Search' : 'Search'}
                    </button>
                    <button className="btn-excel" onClick={handleExport}>
                        <i className="fas fa-file-excel"></i> Excel
                    </button>
                    <button className="btn-secondary" onClick={() => fetchLogs(pagination.currentPage)}>
                        <i className="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>

            <div className={`filters-wrapper ${showFilters ? 'expanded' : ''}`}>
                <div className="filters-section">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label>Search Logs</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Search by user, action, or details..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && setAppliedSearch(search)}
                                    className="filter-input"
                                />
                                <button className="btn-primary" onClick={() => setAppliedSearch(search)}>
                                    <i className="fas fa-search"></i>
                                </button>
                                <button className="btn-secondary" onClick={() => { setSearch(''); setAppliedSearch(''); }}>
                                    <i className="fas fa-undo"></i> Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="collections-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer' }}>
                                Timestamp {sortConfig.key === 'timestamp' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th onClick={() => handleSort('action')} style={{ cursor: 'pointer' }}>
                                Action {sortConfig.key === 'action' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th>User</th>
                            <th>Role</th>
                            <th>Details</th>
                            <th>IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="no-data">No logs found.</td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log._id}>
                                    <td className="timestamp">{formatDate(log.timestamp)}</td>
                                    <td><span className={`badge badge-${log.action.split('_')[0].toLowerCase()}`}>{log.action}</span></td>
                                    <td>
                                        {log.user ? (
                                            <div>
                                                <div className="user-fullname">{log.user.firstname} {log.user.lastname}</div>
                                                <div className="user-username">@{log.user.username}</div>
                                            </div>
                                        ) : (
                                            log.username || 'System'
                                        )}
                                    </td>
                                    <td>{log.user?.roleid || 'N/A'}</td>
                                    <td className="details-cell" title={JSON.stringify(log.details, null, 2)}>
                                        {formatDetails(log.details)}
                                    </td>
                                    <td>{log.ip || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-container">
                <div className="pagination-info">
                    <div>
                        Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to {Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} logs
                    </div>
                    {pagination.totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                disabled={!pagination.hasPrev}
                                onClick={() => fetchLogs(pagination.currentPage - 1, itemsPerPage)}
                                className="btn-pagination"
                            >
                                <i className="fas fa-chevron-left"></i> Previous
                            </button>
                            <span className="page-indicator">Page {pagination.currentPage} of {pagination.totalPages}</span>
                            <button
                                disabled={!pagination.hasNext}
                                onClick={() => fetchLogs(pagination.currentPage + 1, itemsPerPage)}
                                className="btn-pagination"
                            >
                                Next <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                    <div className="page-size-selector">
                        <label>Logs per page:</label>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                fetchLogs(1, Number(e.target.value));
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

export default AuditLogs;
