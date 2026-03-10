import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_NOTIFICATION_SETTINGS } from '../../graphql/queries';
import { UPDATE_NOTIFICATION_SETTINGS } from '../../graphql/mutations';
import LoadingSpinner from '../common/LoadingSpinner';
import { validateWebhookUrl } from '../../utils/validators';

interface NotificationSettingsForm {
  webhookUrl: string;
  authentication: string;
  enableEmailNotifications: boolean;
  emailRecipients: string;
  enableSlackNotifications: boolean;
  slackWebhookUrl: string;
  slackChannel: string;
  enablePagerDuty: boolean;
  pagerDutyRoutingKey: string;
  notifyOnSeverities: string[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  digestEnabled: boolean;
  digestIntervalMinutes: number;
}

interface NotificationSettingsData {
  notificationSettings: {
    webhookUrl: string;
    authentication: string;
    enableEmailNotifications: boolean;
    emailRecipients: string[];
    enableSlackNotifications: boolean;
    slackWebhookUrl: string;
    slackChannel: string;
    enablePagerDuty: boolean;
    pagerDutyRoutingKey: string;
    notifyOnSeverities: string[];
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    digestEnabled: boolean;
    digestIntervalMinutes: number;
  };
}

const SEVERITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'info'];

const Notifications: React.FC = () => {
  const [form, setForm] = useState<NotificationSettingsForm>({
    webhookUrl: '',
    authentication: '{}',
    enableEmailNotifications: false,
    emailRecipients: '',
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const { data, loading } = useQuery<NotificationSettingsData>(GET_NOTIFICATION_SETTINGS);

  const [updateSettings, { loading: saving, error: saveError }] = useMutation(
    UPDATE_NOTIFICATION_SETTINGS,
    {
      onCompleted: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
    }
  );

  useEffect(() => {
    if (data?.notificationSettings) {
      const settings = data.notificationSettings;
      setForm({
        webhookUrl: settings.webhookUrl || '',
        authentication: settings.authentication || '{}',
        enableEmailNotifications: settings.enableEmailNotifications,
        emailRecipients: (settings.emailRecipients || []).join(', '),
        enableSlackNotifications: settings.enableSlackNotifications,
        slackWebhookUrl: settings.slackWebhookUrl || '',
        slackChannel: settings.slackChannel || '#alerts',
        enablePagerDuty: settings.enablePagerDuty,
        pagerDutyRoutingKey: settings.pagerDutyRoutingKey || '',
        notifyOnSeverities: settings.notifyOnSeverities || ['critical', 'high'],
        quietHoursEnabled: settings.quietHoursEnabled,
        quietHoursStart: settings.quietHoursStart || '22:00',
        quietHoursEnd: settings.quietHoursEnd || '08:00',
        digestEnabled: settings.digestEnabled,
        digestIntervalMinutes: settings.digestIntervalMinutes || 30,
      });
    }
  }, [data]);

  const updateField = useCallback(<K extends keyof NotificationSettingsForm>(
    field: K,
    value: NotificationSettingsForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setSaved(false);
  }, []);

  const handleSeverityToggle = useCallback((severity: string) => {
    setForm((prev) => {
      const current = prev.notifyOnSeverities;
      const updated = current.includes(severity)
        ? current.filter((s) => s !== severity)
        : [...current, severity];
      return { ...prev, notifyOnSeverities: updated };
    });
    setSaved(false);
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (form.webhookUrl && !validateWebhookUrl(form.webhookUrl)) {
      newErrors.webhookUrl = 'Invalid webhook URL. Must be a valid HTTPS URL.';
    }

    if (form.enableEmailNotifications && !form.emailRecipients.trim()) {
      newErrors.emailRecipients = 'At least one email recipient is required.';
    }

    if (form.enableSlackNotifications && !form.slackWebhookUrl) {
      newErrors.slackWebhookUrl = 'Slack webhook URL is required when Slack notifications are enabled.';
    }

    if (form.enablePagerDuty && !form.pagerDutyRoutingKey) {
      newErrors.pagerDutyRoutingKey = 'PagerDuty routing key is required when PagerDuty is enabled.';
    }

    if (form.notifyOnSeverities.length === 0) {
      newErrors.notifyOnSeverities = 'At least one severity level must be selected.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const emailRecipients = form.emailRecipients
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);

    await updateSettings({
      variables: {
        input: {
          webhookUrl: form.webhookUrl || null,
          authentication: form.authentication,
          enableEmailNotifications: form.enableEmailNotifications,
          emailRecipients,
          enableSlackNotifications: form.enableSlackNotifications,
          slackWebhookUrl: form.slackWebhookUrl || null,
          slackChannel: form.slackChannel,
          enablePagerDuty: form.enablePagerDuty,
          pagerDutyRoutingKey: form.pagerDutyRoutingKey || null,
          notifyOnSeverities: form.notifyOnSeverities,
          quietHoursEnabled: form.quietHoursEnabled,
          quietHoursStart: form.quietHoursStart,
          quietHoursEnd: form.quietHoursEnd,
          digestEnabled: form.digestEnabled,
          digestIntervalMinutes: form.digestIntervalMinutes,
        },
      },
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="notification-settings">
      <h2>Notification Settings</h2>

      {saveError && (
        <div className="error-banner">Failed to save: {saveError.message}</div>
      )}

      <form onSubmit={handleSubmit}>
        <section className="settings-section">
          <h3>Webhook Configuration</h3>
          <div className="form-group">
            <label htmlFor="webhookUrl">Webhook URL</label>
            <input
              id="webhookUrl"
              type="url"
              value={form.webhookUrl}
              onChange={(e) => updateField('webhookUrl', e.target.value)}
              placeholder="https://your-service.com/webhook"
              className={errors.webhookUrl ? 'input-error' : ''}
            />
            {errors.webhookUrl && <span className="field-error">{errors.webhookUrl}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="authentication">Authentication (JSON)</label>
            <textarea
              id="authentication"
              value={form.authentication}
              onChange={(e) => updateField('authentication', e.target.value)}
              placeholder='{"type": "bearer", "token": "your-token"}'
              rows={3}
              className={errors.authentication ? 'input-error' : ''}
            />
            <span className="field-hint">
              JSON object with authentication credentials for the webhook endpoint.
            </span>
            {errors.authentication && (
              <span className="field-error">{errors.authentication}</span>
            )}
          </div>
        </section>

        <section className="settings-section">
          <h3>Severity Filters</h3>
          <div className="severity-toggles">
            {SEVERITY_OPTIONS.map((severity) => (
              <label key={severity} className="toggle-label">
                <input
                  type="checkbox"
                  checked={form.notifyOnSeverities.includes(severity)}
                  onChange={() => handleSeverityToggle(severity)}
                />
                {' '}{severity.charAt(0).toUpperCase() + severity.slice(1)}
              </label>
            ))}
          </div>
          {errors.notifyOnSeverities && (
            <span className="field-error">{errors.notifyOnSeverities}</span>
          )}
        </section>

        <section className="settings-section">
          <h3>Email Notifications</h3>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={form.enableEmailNotifications}
                onChange={(e) => updateField('enableEmailNotifications', e.target.checked)}
              />
              {' '}Enable email notifications
            </label>
          </div>
          {form.enableEmailNotifications && (
            <div className="form-group">
              <label htmlFor="emailRecipients">Recipients (comma-separated)</label>
              <input
                id="emailRecipients"
                type="text"
                value={form.emailRecipients}
                onChange={(e) => updateField('emailRecipients', e.target.value)}
                placeholder="oncall@company.com, team@company.com"
                className={errors.emailRecipients ? 'input-error' : ''}
              />
              {errors.emailRecipients && (
                <span className="field-error">{errors.emailRecipients}</span>
              )}
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3>Quiet Hours</h3>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={form.quietHoursEnabled}
                onChange={(e) => updateField('quietHoursEnabled', e.target.checked)}
              />
              {' '}Enable quiet hours (suppress non-critical notifications)
            </label>
          </div>
          {form.quietHoursEnabled && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quietStart">Start</label>
                <input
                  id="quietStart"
                  type="time"
                  value={form.quietHoursStart}
                  onChange={(e) => updateField('quietHoursStart', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="quietEnd">End</label>
                <input
                  id="quietEnd"
                  type="time"
                  value={form.quietHoursEnd}
                  onChange={(e) => updateField('quietHoursEnd', e.target.value)}
                />
              </div>
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3>Digest</h3>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={form.digestEnabled}
                onChange={(e) => updateField('digestEnabled', e.target.checked)}
              />
              {' '}Enable notification digest (batch non-critical alerts)
            </label>
          </div>
          {form.digestEnabled && (
            <div className="form-group">
              <label htmlFor="digestInterval">Digest Interval (minutes)</label>
              <input
                id="digestInterval"
                type="number"
                min={5}
                max={1440}
                value={form.digestIntervalMinutes}
                onChange={(e) =>
                  updateField('digestIntervalMinutes', parseInt(e.target.value, 10))
                }
              />
            </div>
          )}
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Notification Settings'}
          </button>
          {saved && <span className="save-indicator">Settings saved successfully</span>}
        </div>
      </form>
    </div>
  );
};

export default Notifications;
