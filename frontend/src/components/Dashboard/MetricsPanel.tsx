import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_METRICS_TIMESERIES } from '../../graphql/queries';

type TimeRange = '1h' | '6h' | '24h' | '7d';

interface MetricPoint {
  timestamp: string;
  value: number;
}

interface MetricsData {
  metricsTimeseries: {
    alertsOverTime: MetricPoint[];
    incidentsOverTime: MetricPoint[];
    notificationsSent: MetricPoint[];
  };
}

const timeRangeLabels: Record<TimeRange, string> = {
  '1h': 'Last Hour',
  '6h': 'Last 6 Hours',
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
};

const MetricsPanel: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const { data, loading, error } = useQuery<MetricsData>(GET_METRICS_TIMESERIES, {
    variables: { timeRange },
    pollInterval: 60000,
  });

  const renderMiniChart = (points: MetricPoint[], color: string, label: string) => {
    if (!points || points.length === 0) {
      return (
        <div className="mini-chart mini-chart--empty">
          <span className="mini-chart-label">{label}</span>
          <span className="mini-chart-empty-text">No data</span>
        </div>
      );
    }

    const maxValue = Math.max(...points.map((p) => p.value), 1);
    const total = points.reduce((sum, p) => sum + p.value, 0);
    const barWidth = Math.max(2, Math.floor(200 / points.length));

    return (
      <div className="mini-chart">
        <div className="mini-chart-header">
          <span className="mini-chart-label">{label}</span>
          <span className="mini-chart-total">{total.toLocaleString()}</span>
        </div>
        <div className="mini-chart-bars" style={{ height: 60 }}>
          {points.map((point, index) => {
            const height = (point.value / maxValue) * 60;
            return (
              <div
                key={index}
                className="mini-chart-bar"
                style={{
                  width: barWidth,
                  height: Math.max(1, height),
                  backgroundColor: color,
                }}
                title={`${point.value} at ${new Date(point.timestamp).toLocaleString()}`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="metrics-panel panel">
      <div className="metrics-panel-header">
        <h2>Metrics</h2>
        <div className="time-range-selector">
          {(Object.keys(timeRangeLabels) as TimeRange[]).map((range) => (
            <button
              key={range}
              className={`time-range-btn ${timeRange === range ? 'time-range-btn--active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {timeRangeLabels[range]}
            </button>
          ))}
        </div>
      </div>

      {loading && !data && (
        <div className="metrics-loading">Loading metrics...</div>
      )}

      {error && (
        <div className="metrics-error">Failed to load metrics</div>
      )}

      {data && (
        <div className="metrics-charts">
          {renderMiniChart(data.metricsTimeseries.alertsOverTime, '#F44336', 'Alerts')}
          {renderMiniChart(data.metricsTimeseries.incidentsOverTime, '#FF9800', 'Incidents')}
          {renderMiniChart(data.metricsTimeseries.notificationsSent, '#2196F3', 'Notifications')}
        </div>
      )}
    </div>
  );
};

export default MetricsPanel;

// Fixed off-by-one hour in UTC timezone calculations
