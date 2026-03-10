import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../components/Dashboard/Dashboard';
import { GET_DASHBOARD_STATS, GET_RECENT_ALERTS } from '../graphql/queries';

const mockStats = {
  dashboardStats: {
    totalAlerts: 42,
    firingAlerts: 3,
    openIncidents: 5,
    avgTtaMinutes: 12,
    avgTtrMinutes: 45,
    alertsBySource: [
      { source: 'prometheus', count: 20 },
      { source: 'datadog', count: 15 },
      { source: 'custom', count: 7 },
    ],
  },
};

const mockAlerts = {
  recentAlerts: [
    {
      id: 'alert-1',
      name: 'High CPU Usage',
      description: 'CPU usage exceeded threshold',
      severity: 'critical',
      status: 'firing',
      condition: {
        metric: 'cpu_usage',
        operator: 'gt',
        threshold: 90,
        duration: 300,
      },
      labels: { host: 'server-1', env: 'production' },
      enabled: true,
      lastFiredAt: new Date().toISOString(),
      fireCount: 12,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'alert-2',
      name: 'Disk Space Low',
      description: null,
      severity: 'medium',
      status: 'active',
      condition: {
        metric: 'disk_usage',
        operator: 'gte',
        threshold: 85,
        duration: null,
      },
      labels: {},
      enabled: true,
      lastFiredAt: null,
      fireCount: 0,
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z',
    },
  ],
};

const mocks = [
  {
    request: { query: GET_DASHBOARD_STATS },
    result: { data: mockStats },
  },
  {
    request: { query: GET_RECENT_ALERTS },
    result: { data: mockAlerts },
  },
];

function renderDashboard(customMocks = mocks) {
  return render(
    <MockedProvider mocks={customMocks} addTypename={false}>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </MockedProvider>
  );
}

describe('Dashboard', () => {
  it('renders dashboard header', async () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays stats cards after loading', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12m')).toBeInTheDocument();
    expect(screen.getByText('45m')).toBeInTheDocument();
  });

  it('displays recent alert cards', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
    });

    expect(screen.getByText('Disk Space Low')).toBeInTheDocument();
  });

  it('shows severity breakdown section', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Severity Breakdown')).toBeInTheDocument();
    });
  });

  it('shows empty state when no alerts', async () => {
    const emptyMocks = [
      {
        request: { query: GET_DASHBOARD_STATS },
        result: { data: mockStats },
      },
      {
        request: { query: GET_RECENT_ALERTS },
        result: { data: { recentAlerts: [] } },
      },
    ];

    renderDashboard(emptyMocks);

    await waitFor(() => {
      expect(screen.getByText('No recent alerts')).toBeInTheDocument();
    });
  });

  it('renders stat labels', () => {
    renderDashboard();

    expect(screen.getByText('Total Alerts')).toBeInTheDocument();
    expect(screen.getByText('Currently Firing')).toBeInTheDocument();
    expect(screen.getByText('Open Incidents')).toBeInTheDocument();
    expect(screen.getByText('Avg. Time to Acknowledge')).toBeInTheDocument();
    expect(screen.getByText('Avg. Time to Resolve')).toBeInTheDocument();
  });
});
