import { useQuery, useMutation } from '@apollo/client';
import { GET_NOTIFICATION_SETTINGS } from '../graphql/queries';
import { UPDATE_NOTIFICATION_SETTINGS } from '../graphql/mutations';
import { useCallback, useState } from 'react';

interface NotificationSettings {
  webhookUrl: string | null;
  authentication: string;
  enableEmailNotifications: boolean;
  emailRecipients: string[];
  enableSlackNotifications: boolean;
  slackWebhookUrl: string | null;
  slackChannel: string;
  enablePagerDuty: boolean;
  pagerDutyRoutingKey: string | null;
  notifyOnSeverities: string[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  digestEnabled: boolean;
  digestIntervalMinutes: number;
}

interface UseNotificationsReturn {
  settings: NotificationSettings | null;
  loading: boolean;
  error: Error | undefined;
  saving: boolean;
  saved: boolean;
  saveError: Error | undefined;
  updateSettings: (input: Partial<NotificationSettings>) => Promise<void>;
  refetch: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [saved, setSaved] = useState(false);

  const { data, loading, error, refetch } = useQuery<{
    notificationSettings: NotificationSettings;
  }>(GET_NOTIFICATION_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });

  const [mutate, { loading: saving, error: saveError }] = useMutation(
    UPDATE_NOTIFICATION_SETTINGS,
    {
      refetchQueries: [{ query: GET_NOTIFICATION_SETTINGS }],
      onCompleted: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
    }
  );

  const updateSettings = useCallback(
    async (input: Partial<NotificationSettings>) => {
      await mutate({ variables: { input } });
    },
    [mutate]
  );

  return {
    settings: data?.notificationSettings || null,
    loading,
    error: error as Error | undefined,
    saving,
    saved,
    saveError: saveError as Error | undefined,
    updateSettings,
    refetch,
  };
}
