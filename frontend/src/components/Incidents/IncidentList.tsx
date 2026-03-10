import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_INCIDENTS } from '../../graphql/queries';
import LoadingSpinner from '../common/LoadingSpinner';
import { Incident, IncidentStatus, Severity } from '../../types';
import { formatRelativeTime, formatDuration, formatSeverity } from '../../utils/formatters';

const STATUS_OPTIONS: IncidentStatus[] = [
  'triggered',
  'acknowledged',
  'investigating',
  'resolved',
  'closed',
];

interface IncidentsQueryResult {
  incidents: {
    data: Incident[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const IncidentList: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [page, setPage] = useState(1);

  const { data, loading, error } = useQuery<IncidentsQueryResult>(GET_INCIDENTS, {
    variables: {
      page,
      limit: 20,
      status: statusFilter || undefined,
      severity: severityFilter || undefined,
    },
    pollInterval: 30000,
  });

  const incidents = data?.incidents.data || [];
  const pagination = data?.incidents.pagination;

  const getStatusClass = (status: IncidentStatus): string => {
    const classes: Record<IncidentStatus, string> = {
      triggered: 'status--triggered',
      acknowledged: 'status--acknowledged',
      investigating: 'status--investigating',
      resolved: 'status--resolved',
      closed: 'status--closed',
    };
    return classes[status] || '';
  };

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <div className="error-banner">Failed to load incidents: {error.message}</div>;

  return (
    <div className="incident-list-page">
      <div className="page-header">
        <h1>Incidents</h1>
      </div>

      <div className="filters-bar">
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as IncidentStatus | ''); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value as Severity | ''); setPage(1); }}
        >
          <option value="">All Severities</option>
          {(['critical', 'high', 'medium', 'low'] as Severity[]).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="incident-table-container">
        <table className="incident-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Severity</th>
              <th>Title</th>
              <th>Alert</th>
              <th>Triggered</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-cell">No incidents found</td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <tr
                  key={incident.id}
                  className="incident-row"
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                >
                  <td>
                    <span className={`status-pill ${getStatusClass(incident.status)}`}>
                      {incident.status}
                    </span>
                  </td>
                  <td>
                    <span className={`severity-badge severity-badge--${incident.severity}`}>
                      {formatSeverity(incident.severity)}
                    </span>
                  </td>
                  <td className="incident-title-cell">{incident.title}</td>
                  <td>{incident.alert?.name || '--'}</td>
                  <td>{formatRelativeTime(incident.triggeredAt)}</td>
                  <td>{incident.ttrSeconds ? formatDuration(incident.ttrSeconds) : 'Ongoing'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
            Page {pagination.page} of {pagination.totalPages}
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

export default IncidentList;
// Add email notification support
