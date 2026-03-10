import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALERT } from '../../graphql/queries';
import { DELETE_ALERT, SILENCE_ALERT } from '../../graphql/mutations';
import LoadingSpinner from '../common/LoadingSpinner';
import { Alert } from '../../types';
import { formatRelativeTime, formatSeverity, formatDate } from '../../utils/formatters';

const AlertDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [silenceDuration, setSilenceDuration] = useState(3600);
  const [showSilenceModal, setShowSilenceModal] = useState(false);

  const { data, loading, error } = useQuery<{ alert: Alert }>(GET_ALERT, {
    variables: { id },
    skip: !id,
  });

  const [deleteAlert, { loading: deleting }] = useMutation(DELETE_ALERT, {
    onCompleted: () => navigate('/alerts'),
  });

  const [silenceAlert, { loading: silencing }] = useMutation(SILENCE_ALERT);

  const alert = data?.alert;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    await deleteAlert({ variables: { id } });
  };

  const handleSilence = async () => {
    await silenceAlert({ variables: { id, duration: silenceDuration } });
    setShowSilenceModal(false);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-banner">Failed to load alert: {error.message}</div>;
  if (!alert) return <div className="error-banner">Alert not found</div>;

  return (
    <div className="alert-detail">
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost" onClick={() => navigate('/alerts')}>
            Back to Alerts
          </button>
          <h1>{alert.name}</h1>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/alerts/${id}/edit`)}
          >
            Edit
          </button>
          <button
            className="btn btn-warning"
            onClick={() => setShowSilenceModal(true)}
            disabled={alert.status === 'silenced'}
          >
            Silence
          </button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h2>Overview</h2>
          <dl className="detail-list">
            <dt>Status</dt>
            <dd className={`status-badge status-badge--${alert.status}`}>{alert.status}</dd>
            <dt>Severity</dt>
            <dd className={`severity-badge severity-badge--${alert.severity}`}>
              {formatSeverity(alert.severity)}
            </dd>
            <dt>Enabled</dt>
            <dd>{alert.enabled ? 'Yes' : 'No'}</dd>
            <dt>Created</dt>
            <dd>{formatDate(alert.createdAt)}</dd>
            <dt>Last Updated</dt>
            <dd>{formatRelativeTime(alert.updatedAt)}</dd>
          </dl>
        </div>

        <div className="detail-section">
          <h2>Condition</h2>
          <dl className="detail-list">
            <dt>Metric</dt>
            <dd><code>{alert.condition.metric}</code></dd>
            <dt>Operator</dt>
            <dd>{alert.condition.operator}</dd>
            <dt>Threshold</dt>
            <dd>{alert.condition.threshold}</dd>
            {alert.condition.duration && (
              <>
                <dt>Duration</dt>
                <dd>{alert.condition.duration}s</dd>
              </>
            )}
          </dl>
        </div>

        <div className="detail-section">
          <h2>Statistics</h2>
          <dl className="detail-list">
            <dt>Fire Count</dt>
            <dd>{alert.fireCount}</dd>
            <dt>Last Fired</dt>
            <dd>{alert.lastFiredAt ? formatRelativeTime(alert.lastFiredAt) : 'Never'}</dd>
            <dt>Last Resolved</dt>
            <dd>{alert.lastResolvedAt ? formatRelativeTime(alert.lastResolvedAt) : 'N/A'}</dd>
          </dl>
        </div>

        {alert.labels && Object.keys(alert.labels).length > 0 && (
          <div className="detail-section">
            <h2>Labels</h2>
            <div className="labels-grid">
              {Object.entries(alert.labels).map(([key, value]) => (
                <span key={key} className="label-badge">
                  <strong>{key}:</strong> {value}
                </span>
              ))}
            </div>
          </div>
        )}

        {alert.description && (
          <div className="detail-section detail-section--full">
            <h2>Description</h2>
            <p>{alert.description}</p>
          </div>
        )}
      </div>

      {showSilenceModal && (
        <div className="modal-overlay" onClick={() => setShowSilenceModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Silence Alert</h2>
            <div className="form-group">
              <label htmlFor="silence-duration">Duration</label>
              <select
                id="silence-duration"
                value={silenceDuration}
                onChange={(e) => setSilenceDuration(Number(e.target.value))}
              >
                <option value={1800}>30 minutes</option>
                <option value={3600}>1 hour</option>
                <option value={14400}>4 hours</option>
                <option value={28800}>8 hours</option>
                <option value={86400}>24 hours</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSilenceModal(false)}>
                Cancel
              </button>
              <button className="btn btn-warning" onClick={handleSilence} disabled={silencing}>
                {silencing ? 'Silencing...' : 'Silence'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertDetail;
// fix: resolve memory leak in WebSocket handler
// feat: add alert tagging via API
