import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_STATS, GET_RECENT_ALERTS } from '../../graphql/queries';
import AlertCard from './AlertCard';
import MetricsPanel from './MetricsPanel';
import LoadingSpinner from '../common/LoadingSpinner';
import { Alert, DashboardStats } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';

const Dashboard: React.FC = () => {
  const { data: statsData, loading: statsLoading } = useQuery<{ dashboardStats: DashboardStats }>(
    GET_DASHBOARD_STATS,
    { pollInterval: 30000 }
  );

  const { data: alertsData, loading: alertsLoading } = useQuery<{ recentAlerts: Alert[] }>(
    GET_RECENT_ALERTS,
    { pollInterval: 15000 }
  );

  const stats = statsData?.dashboardStats;
  const recentAlerts = alertsData?.recentAlerts || [];

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    recentAlerts.forEach((alert) => {
      if (alert.status === 'firing') {
        counts[alert.severity]++;
      }
    });
    return counts;
  }, [recentAlerts]);

  if (statsLoading && alertsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <span className="last-updated">
          Last updated: {formatRelativeTime(new Date().toISOString())}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--total">
          <span className="stat-label">Total Alerts</span>
          <span className="stat-value">{stats?.totalAlerts ?? '--'}</span>
        </div>
        <div className="stat-card stat-card--firing">
          <span className="stat-label">Currently Firing</span>
          <span className="stat-value">{stats?.firingAlerts ?? '--'}</span>
        </div>
        <div className="stat-card stat-card--incidents">
          <span className="stat-label">Open Incidents</span>
          <span className="stat-value">{stats?.openIncidents ?? '--'}</span>
        </div>
        <div className="stat-card stat-card--mtta">
          <span className="stat-label">Avg. Time to Acknowledge</span>
          <span className="stat-value">{stats?.avgTtaMinutes ? `${stats.avgTtaMinutes}m` : '--'}</span>
        </div>
        <div className="stat-card stat-card--mttr">
          <span className="stat-label">Avg. Time to Resolve</span>
          <span className="stat-value">{stats?.avgTtrMinutes ? `${stats.avgTtrMinutes}m` : '--'}</span>
        </div>
      </div>

      <div className="dashboard-panels">
        <div className="panel severity-breakdown">
          <h2>Severity Breakdown</h2>
          <div className="severity-bars">
            {Object.entries(severityCounts).map(([severity, count]) => (
              <div key={severity} className={`severity-bar severity-bar--${severity}`}>
                <span className="severity-label">{severity}</span>
                <div className="severity-bar-fill" style={{ width: `${Math.min(count * 10, 100)}%` }} />
                <span className="severity-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <MetricsPanel />
      </div>

      <div className="recent-alerts-section">
        <h2>Recent Alerts</h2>
        <div className="alert-cards-grid">
          {recentAlerts.length === 0 ? (
            <div className="empty-state">No recent alerts</div>
          ) : (
            recentAlerts.slice(0, 12).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
