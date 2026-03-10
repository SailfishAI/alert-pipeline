import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_INTEGRATION_SETTINGS } from '../../graphql/queries';
import { UPDATE_INTEGRATION_SETTINGS, TEST_INTEGRATION } from '../../graphql/mutations';
import LoadingSpinner from '../common/LoadingSpinner';

interface IntegrationConfig {
  slack: {
    enabled: boolean;
    webhookUrl: string;
    defaultChannel: string;
    mentionOnCritical: boolean;
    mentionUsers: string;
  };
  pagerDuty: {
    enabled: boolean;
    routingKey: string;
    autoResolve: boolean;
    escalationPolicy: string;
  };
  email: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromAddress: string;
    useTls: boolean;
  };
}

const IntegrationSettings: React.FC = () => {
  const [config, setConfig] = useState<IntegrationConfig>({
    slack: {
      enabled: false,
      webhookUrl: '',
      defaultChannel: '#alerts',
      mentionOnCritical: true,
      mentionUsers: '',
    },
    pagerDuty: {
      enabled: false,
      routingKey: '',
      autoResolve: true,
      escalationPolicy: '',
    },
    email: {
      enabled: false,
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromAddress: '',
      useTls: true,
    },
  });

  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [saved, setSaved] = useState(false);

  const { data, loading } = useQuery<{ integrationSettings: IntegrationConfig }>(
    GET_INTEGRATION_SETTINGS
  );

  const [updateIntegrations, { loading: saving }] = useMutation(UPDATE_INTEGRATION_SETTINGS, {
    onCompleted: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const [testIntegration, { loading: testing }] = useMutation(TEST_INTEGRATION);

  useEffect(() => {
    if (data?.integrationSettings) {
      setConfig(data.integrationSettings);
    }
  }, [data]);

  const updateSlack = (field: string, value: unknown) => {
    setConfig((prev) => ({
      ...prev,
      slack: { ...prev.slack, [field]: value },
    }));
    setSaved(false);
  };

  const updatePagerDuty = (field: string, value: unknown) => {
    setConfig((prev) => ({
      ...prev,
      pagerDuty: { ...prev.pagerDuty, [field]: value },
    }));
    setSaved(false);
  };

  const updateEmail = (field: string, value: unknown) => {
    setConfig((prev) => ({
      ...prev,
      email: { ...prev.email, [field]: value },
    }));
    setSaved(false);
  };

  const handleTest = async (integration: string) => {
    try {
      const result = await testIntegration({
        variables: { integration, config: (config as any)[integration] },
      });
      setTestResults((prev) => ({
        ...prev,
        [integration]: result.data.testIntegration,
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [integration]: { success: false, message: (error as Error).message },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateIntegrations({ variables: { input: config } });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="integration-settings">
      <h2>Integration Settings</h2>

      <form onSubmit={handleSubmit}>
        <section className="settings-section">
          <div className="section-header">
            <h3>Slack</h3>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.slack.enabled}
                onChange={(e) => updateSlack('enabled', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          {config.slack.enabled && (
            <>
              <div className="form-group">
                <label htmlFor="slackUrl">Webhook URL</label>
                <input
                  id="slackUrl"
                  type="url"
                  value={config.slack.webhookUrl}
                  onChange={(e) => updateSlack('webhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="slackChannel">Default Channel</label>
                  <input
                    id="slackChannel"
                    type="text"
                    value={config.slack.defaultChannel}
                    onChange={(e) => updateSlack('defaultChannel', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="slackMentions">Mention Users (comma-separated)</label>
                  <input
                    id="slackMentions"
                    type="text"
                    value={config.slack.mentionUsers}
                    onChange={(e) => updateSlack('mentionUsers', e.target.value)}
                    placeholder="U123ABC, U456DEF"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.slack.mentionOnCritical}
                    onChange={(e) => updateSlack('mentionOnCritical', e.target.checked)}
                  />
                  {' '}Mention users on critical alerts
                </label>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleTest('slack')}
                disabled={testing}
              >
                Test Slack
              </button>
              {testResults.slack && (
                <span className={`test-result ${testResults.slack.success ? 'test-success' : 'test-failure'}`}>
                  {testResults.slack.message}
                </span>
              )}
            </>
          )}
        </section>

        <section className="settings-section">
          <div className="section-header">
            <h3>PagerDuty</h3>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.pagerDuty.enabled}
                onChange={(e) => updatePagerDuty('enabled', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          {config.pagerDuty.enabled && (
            <>
              <div className="form-group">
                <label htmlFor="pdRoutingKey">Routing Key</label>
                <input
                  id="pdRoutingKey"
                  type="password"
                  value={config.pagerDuty.routingKey}
                  onChange={(e) => updatePagerDuty('routingKey', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.pagerDuty.autoResolve}
                    onChange={(e) => updatePagerDuty('autoResolve', e.target.checked)}
                  />
                  {' '}Auto-resolve incidents when alerts clear
                </label>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleTest('pagerDuty')}
                disabled={testing}
              >
                Test PagerDuty
              </button>
              {testResults.pagerDuty && (
                <span className={`test-result ${testResults.pagerDuty.success ? 'test-success' : 'test-failure'}`}>
                  {testResults.pagerDuty.message}
                </span>
              )}
            </>
          )}
        </section>

        <section className="settings-section">
          <div className="section-header">
            <h3>Email (SMTP)</h3>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.email.enabled}
                onChange={(e) => updateEmail('enabled', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          {config.email.enabled && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="smtpHost">SMTP Host</label>
                  <input
                    id="smtpHost"
                    type="text"
                    value={config.email.smtpHost}
                    onChange={(e) => updateEmail('smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="smtpPort">SMTP Port</label>
                  <input
                    id="smtpPort"
                    type="number"
                    value={config.email.smtpPort}
                    onChange={(e) => updateEmail('smtpPort', parseInt(e.target.value, 10))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="smtpUser">Username</label>
                  <input
                    id="smtpUser"
                    type="text"
                    value={config.email.smtpUser}
                    onChange={(e) => updateEmail('smtpUser', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="smtpPass">Password</label>
                  <input
                    id="smtpPass"
                    type="password"
                    value={config.email.smtpPassword}
                    onChange={(e) => updateEmail('smtpPassword', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="fromAddr">From Address</label>
                <input
                  id="fromAddr"
                  type="email"
                  value={config.email.fromAddress}
                  onChange={(e) => updateEmail('fromAddress', e.target.value)}
                  placeholder="alerts@yourcompany.com"
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.email.useTls}
                    onChange={(e) => updateEmail('useTls', e.target.checked)}
                  />
                  {' '}Use TLS
                </label>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleTest('email')}
                disabled={testing}
              >
                Test Email
              </button>
              {testResults.email && (
                <span className={`test-result ${testResults.email.success ? 'test-success' : 'test-failure'}`}>
                  {testResults.email.message}
                </span>
              )}
            </>
          )}
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Integration Settings'}
          </button>
          {saved && <span className="save-indicator">Settings saved</span>}
        </div>
      </form>
    </div>
  );
};

export default IntegrationSettings;
// feat: add alert rule versioning
