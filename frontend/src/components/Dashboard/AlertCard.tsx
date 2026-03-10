import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../../types';
import { formatRelativeTime, formatSeverity } from '../../utils/formatters';
import classnames from 'classnames';

interface AlertCardProps {
  alert: Alert;
  compact?: boolean;
}

const severityIcons: Record<string, string> = {
  critical: '\u26A0',
  high: '\u2757',
  medium: '\u26A1',
  low: '\u2139',
  info: '\u24D8',
};

const statusColors: Record<string, string> = {
  active: '#4CAF50',
  firing: '#F44336',
  resolved: '#9E9E9E',
  silenced: '#FF9800',
};

const AlertCard: React.FC<AlertCardProps> = ({ alert, compact = false }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/alerts/${alert.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const cardClassName = classnames('alert-card', {
    'alert-card--compact': compact,
    'alert-card--firing': alert.status === 'firing',
    [`alert-card--${alert.severity}`]: true,
  });

  return (
    <div
      className={cardClassName}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Alert: ${alert.name}, Severity: ${alert.severity}, Status: ${alert.status}`}
    >
      <div className="alert-card-header">
        <span className="alert-card-severity" title={formatSeverity(alert.severity)}>
          {severityIcons[alert.severity] || '\u2022'}
        </span>
        <span
          className="alert-card-status"
          style={{ backgroundColor: statusColors[alert.status] || '#999' }}
        >
          {alert.status}
        </span>
      </div>

      <h3 className="alert-card-name">{alert.name}</h3>

      {!compact && alert.description && (
        <p className="alert-card-description">{alert.description}</p>
      )}

      <div className="alert-card-meta">
        <span className="alert-card-metric">
          {alert.condition.metric} {alert.condition.operator} {alert.condition.threshold}
        </span>
        {alert.lastFiredAt && (
          <span className="alert-card-fired">
            Last fired: {formatRelativeTime(alert.lastFiredAt)}
          </span>
        )}
      </div>

      {!compact && alert.labels && Object.keys(alert.labels).length > 0 && (
        <div className="alert-card-labels">
          {Object.entries(alert.labels).slice(0, 4).map(([key, value]) => (
            <span key={key} className="label-badge">
              {key}: {value}
            </span>
          ))}
        </div>
      )}

      <div className="alert-card-footer">
        <span className="alert-card-fires">
          {alert.fireCount} {alert.fireCount === 1 ? 'occurrence' : 'occurrences'}
        </span>
        {alert.updatedAt && (
          <span className="alert-card-updated">
            {formatRelativeTime(alert.updatedAt)}
          </span>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
