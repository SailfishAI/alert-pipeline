import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '../../hooks/useAlerts';
import AlertCard from '../Dashboard/AlertCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { Severity, AlertStatus } from '../../types';

const SEVERITY_OPTIONS: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const STATUS_OPTIONS: AlertStatus[] = ['active', 'firing', 'resolved', 'silenced'];

const AlertList: React.FC = () => {
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { alerts, pagination, loading, error, refetch } = useAlerts({
    severity: severityFilter || undefined,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
    page,
    limit: 20,
  });

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setPage(1);
    },
    []
  );

  const handleSeverityChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSeverityFilter(e.target.value as Severity | '');
      setPage(1);
    },
    []
  );

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(e.target.value as AlertStatus | '');
      setPage(1);
    },
    []
  );

  return (
    <div className="alert-list-page">
      <div className="page-header">
        <h1>Alerts</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/alerts/new')}
        >
          Create Alert
        </button>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search alerts..."
          value={searchQuery}
          onChange={handleSearch}
        />
        <select
          className="filter-select"
          value={severityFilter}
          onChange={handleSeverityChange}
        >
          <option value="">All Severities</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={handleStatusChange}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      {loading && <LoadingSpinner />}

      {error && (
        <div className="error-banner">
          Failed to load alerts: {error.message}
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="empty-state">
          <h3>No alerts found</h3>
          <p>Try adjusting your filters or create a new alert.</p>
        </div>
      )}

      <div className="alert-cards-grid">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertList;
// feat: add notification channel groups
// chore: add renovate bot config

// Filter alerts by severity with multi-select dropdown
