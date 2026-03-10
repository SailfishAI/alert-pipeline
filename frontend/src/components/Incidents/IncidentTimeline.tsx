import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { GET_INCIDENT } from '../../graphql/queries';
import { UPDATE_INCIDENT, ADD_TIMELINE_ENTRY } from '../../graphql/mutations';
import LoadingSpinner from '../common/LoadingSpinner';
import { Incident, IncidentStatus, TimelineEntry } from '../../types';
import { formatDate, formatRelativeTime, formatDuration, formatSeverity } from '../../utils/formatters';

const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  triggered: ['acknowledged'],
  acknowledged: ['investigating', 'resolved'],
  investigating: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

const IncidentTimeline: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');

  const { data, loading, error, refetch } = useQuery<{ incident: Incident }>(GET_INCIDENT, {
    variables: { id },
    skip: !id,
    pollInterval: 15000,
  });

  const [updateIncident, { loading: updating }] = useMutation(UPDATE_INCIDENT, {
    onCompleted: () => refetch(),
  });

  const [addTimelineEntry, { loading: addingEntry }] = useMutation(ADD_TIMELINE_ENTRY, {
    onCompleted: () => {
      setCommentText('');
      refetch();
    },
  });

  const incident = data?.incident;

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    await updateIncident({
      variables: { id, input: { status: newStatus } },
    });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    await addTimelineEntry({
      variables: {
        incidentId: id,
        input: {
          type: 'comment',
          content: commentText.trim(),
          visibility: 'internal',
        },
      },
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-banner">Failed to load incident: {error.message}</div>;
  if (!incident) return <div className="error-banner">Incident not found</div>;

  const allowedTransitions = STATUS_TRANSITIONS[incident.status] || [];

  const getTimelineIcon = (type: TimelineEntry['type']): string => {
    const icons: Record<string, string> = {
      comment: '\uD83D\uDCAC',
      status_change: '\u27A1',
      action: '\u2699',
      escalation: '\u26A0',
    };
    return icons[type] || '\u2022';
  };

  return (
    <div className="incident-timeline-page">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/incidents')}>
          Back to Incidents
        </button>
        <h1>{incident.title}</h1>
      </div>

      <div className="incident-detail-grid">
        <div className="incident-sidebar">
          <div className="detail-section">
            <h2>Details</h2>
            <dl className="detail-list">
              <dt>Status</dt>
              <dd className={`status-pill status--${incident.status}`}>{incident.status}</dd>
              <dt>Severity</dt>
              <dd>{formatSeverity(incident.severity)}</dd>
              <dt>Triggered</dt>
              <dd>{formatDate(incident.triggeredAt)}</dd>
              {incident.acknowledgedAt && (
                <>
                  <dt>Acknowledged</dt>
                  <dd>{formatRelativeTime(incident.acknowledgedAt)}</dd>
                </>
              )}
              {incident.resolvedAt && (
                <>
                  <dt>Resolved</dt>
                  <dd>{formatDate(incident.resolvedAt)}</dd>
                </>
              )}
              {incident.ttrSeconds && (
                <>
                  <dt>Time to Resolve</dt>
                  <dd>{formatDuration(incident.ttrSeconds)}</dd>
                </>
              )}
            </dl>
          </div>

          {allowedTransitions.length > 0 && (
            <div className="detail-section">
              <h2>Actions</h2>
              <div className="action-buttons">
                {allowedTransitions.map((status) => (
                  <button
                    key={status}
                    className={`btn btn-action btn-action--${status}`}
                    onClick={() => handleStatusChange(status)}
                    disabled={updating}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {incident.summary && (
            <div className="detail-section">
              <h2>Summary</h2>
              <p>{incident.summary}</p>
            </div>
          )}

          {incident.rootCause && (
            <div className="detail-section">
              <h2>Root Cause</h2>
              <p>{incident.rootCause}</p>
            </div>
          )}
        </div>

        <div className="timeline-main">
          <h2>Timeline</h2>

          <form className="timeline-comment-form" onSubmit={handleAddComment}>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={addingEntry || !commentText.trim()}
            >
              {addingEntry ? 'Adding...' : 'Add Comment'}
            </button>
          </form>

          <div className="timeline-entries">
            {(!incident.timeline || incident.timeline.length === 0) ? (
              <div className="empty-state">No timeline entries yet</div>
            ) : (
              [...incident.timeline].reverse().map((entry, index) => (
                <div key={index} className={`timeline-entry timeline-entry--${entry.type}`}>
                  <div className="timeline-icon">{getTimelineIcon(entry.type)}</div>
                  <div className="timeline-content">
                    <p>{entry.content}</p>
                    <span className="timeline-meta">
                      {entry.createdBy} &middot; {formatRelativeTime(entry.createdAt)}
                      {entry.visibility === 'internal' && (
                        <span className="visibility-badge">Internal</span>
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentTimeline;
