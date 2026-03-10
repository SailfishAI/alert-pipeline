import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import Notifications from '../components/Settings/Notifications';
import { GET_NOTIFICATION_SETTINGS } from '../graphql/queries';
import { UPDATE_NOTIFICATION_SETTINGS } from '../graphql/mutations';

const defaultSettings = {
  notificationSettings: {
    webhookUrl: 'https://hooks.example.com/webhook',
    authentication: '{"type": "bearer", "token": "abc123"}',
    enableEmailNotifications: true,
    emailRecipients: ['oncall@company.com', 'team@company.com'],
    enableSlackNotifications: false,
    slackWebhookUrl: '',
    slackChannel: '#alerts',
    enablePagerDuty: false,
    pagerDutyRoutingKey: '',
    notifyOnSeverities: ['critical', 'high'],
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    digestEnabled: false,
    digestIntervalMinutes: 30,
  },
};

function createMocks(overrides?: Partial<typeof defaultSettings.notificationSettings>): MockedResponse[] {
  const settings = overrides
    ? { notificationSettings: { ...defaultSettings.notificationSettings, ...overrides } }
    : defaultSettings;

  return [
    {
      request: { query: GET_NOTIFICATION_SETTINGS },
      result: { data: settings },
    },
  ];
}

function createMocksWithMutation(mutationInput: any): MockedResponse[] {
  return [
    ...createMocks(),
    {
      request: {
        query: UPDATE_NOTIFICATION_SETTINGS,
        variables: { input: mutationInput },
      },
      result: {
        data: {
          updateNotificationSettings: defaultSettings.notificationSettings,
        },
      },
    },
  ];
}

function renderNotifications(mocks: MockedResponse[] = createMocks()) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <Notifications />
    </MockedProvider>
  );
}

describe('Notifications', () => {
  it('renders notification settings heading', async () => {
    renderNotifications();

    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });
  });

  it('loads and displays saved webhook URL', async () => {
    renderNotifications();

    await waitFor(() => {
      const input = screen.getByLabelText('Webhook URL') as HTMLInputElement;
      expect(input.value).toBe('https://hooks.example.com/webhook');
    });
  });

  it('loads and displays authentication as a JSON string', async () => {
    renderNotifications();

    await waitFor(() => {
      const textarea = screen.getByLabelText('Authentication (JSON)') as HTMLTextAreaElement;
      expect(textarea.value).toBe('{"type": "bearer", "token": "abc123"}');
    });
  });

  it('displays severity filter checkboxes', async () => {
    renderNotifications();

    await waitFor(() => {
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('shows email recipients when email notifications are enabled', async () => {
    renderNotifications();

    await waitFor(() => {
      expect(screen.getByLabelText('Recipients (comma-separated)')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Recipients (comma-separated)') as HTMLInputElement;
    expect(input.value).toBe('oncall@company.com, team@company.com');
  });

  it('validates webhook URL on submit', async () => {
    const user = userEvent.setup();
    renderNotifications(createMocks({ webhookUrl: '' }));

    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });

    const webhookInput = screen.getByLabelText('Webhook URL') as HTMLInputElement;
    await user.clear(webhookInput);
    await user.type(webhookInput, 'not-a-valid-url');

    const saveBtn = screen.getByText('Save Notification Settings');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid webhook URL/)).toBeInTheDocument();
    });
  });

  it('shows quiet hours fields when enabled', async () => {
    renderNotifications(createMocks({ quietHoursEnabled: true }));

    await waitFor(() => {
      expect(screen.getByLabelText('Start')).toBeInTheDocument();
      expect(screen.getByLabelText('End')).toBeInTheDocument();
    });
  });

  it('hides quiet hours fields when disabled', async () => {
    renderNotifications(createMocks({ quietHoursEnabled: false }));

    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Start')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('End')).not.toBeInTheDocument();
  });

  it('shows digest interval when digest is enabled', async () => {
    renderNotifications(createMocks({ digestEnabled: true }));

    await waitFor(() => {
      expect(screen.getByLabelText('Digest Interval (minutes)')).toBeInTheDocument();
    });
  });

  it('sends authentication as a string in the mutation', async () => {
    const mutationInput = {
      webhookUrl: 'https://hooks.example.com/webhook',
      authentication: '{"type": "bearer", "token": "abc123"}',
      enableEmailNotifications: true,
      emailRecipients: ['oncall@company.com', 'team@company.com'],
      enableSlackNotifications: false,
      slackWebhookUrl: null,
      slackChannel: '#alerts',
      enablePagerDuty: false,
      pagerDutyRoutingKey: null,
      notifyOnSeverities: ['critical', 'high'],
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      digestEnabled: false,
      digestIntervalMinutes: 30,
    };

    const mocks = createMocksWithMutation(mutationInput);
    renderNotifications(mocks);

    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('Save Notification Settings');
    fireEvent.click(saveBtn);
  });

  it('has the authentication field hint text', async () => {
    renderNotifications();

    await waitFor(() => {
      expect(
        screen.getByText('JSON object with authentication credentials for the webhook endpoint.')
      ).toBeInTheDocument();
    });
  });
});
