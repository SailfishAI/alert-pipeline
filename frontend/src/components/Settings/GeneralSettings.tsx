import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_GENERAL_SETTINGS } from '../../graphql/queries';
import { UPDATE_GENERAL_SETTINGS } from '../../graphql/mutations';
import LoadingSpinner from '../common/LoadingSpinner';

interface GeneralSettingsData {
  organizationName: string;
  defaultSeverity: string;
  alertRetentionDays: number;
  incidentAutoCloseHours: number;
  timezone: string;
  dateFormat: string;
  enableMetricsCollection: boolean;
  enableAuditLog: boolean;
}

const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const GeneralSettings: React.FC = () => {
  const [form, setForm] = useState<GeneralSettingsData>({
    organizationName: '',
    defaultSeverity: 'medium',
    alertRetentionDays: 90,
    incidentAutoCloseHours: 72,
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    enableMetricsCollection: true,
    enableAuditLog: true,
  });
  const [saved, setSaved] = useState(false);

  const { data, loading } = useQuery<{ generalSettings: GeneralSettingsData }>(
    GET_GENERAL_SETTINGS
  );

  const [updateSettings, { loading: saving }] = useMutation(UPDATE_GENERAL_SETTINGS, {
    onCompleted: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  useEffect(() => {
    if (data?.generalSettings) {
      setForm(data.generalSettings);
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({ variables: { input: form } });
  };

  const updateField = <K extends keyof GeneralSettingsData>(
    field: K,
    value: GeneralSettingsData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="general-settings">
      <h2>General Settings</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="orgName">Organization Name</label>
          <input
            id="orgName"
            type="text"
            value={form.organizationName}
            onChange={(e) => updateField('organizationName', e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="defaultSeverity">Default Alert Severity</label>
            <select
              id="defaultSeverity"
              value={form.defaultSeverity}
              onChange={(e) => updateField('defaultSeverity', e.target.value)}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="timezone">Timezone</label>
            <select
              id="timezone"
              value={form.timezone}
              onChange={(e) => updateField('timezone', e.target.value)}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="retention">Alert Retention (days)</label>
            <input
              id="retention"
              type="number"
              min={1}
              max={365}
              value={form.alertRetentionDays}
              onChange={(e) => updateField('alertRetentionDays', parseInt(e.target.value, 10))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="autoClose">Incident Auto-Close (hours)</label>
            <input
              id="autoClose"
              type="number"
              min={1}
              max={720}
              value={form.incidentAutoCloseHours}
              onChange={(e) => updateField('incidentAutoCloseHours', parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={form.enableMetricsCollection}
              onChange={(e) => updateField('enableMetricsCollection', e.target.checked)}
            />
            {' '}Enable metrics collection
          </label>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={form.enableAuditLog}
              onChange={(e) => updateField('enableAuditLog', e.target.checked)}
            />
            {' '}Enable audit logging
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="save-indicator">Settings saved</span>}
        </div>
      </form>
    </div>
  );
};

export default GeneralSettings;
// fix: handle large payloads in webhook processor
// fix: correct webhook retry count display

// Allow users to set display timezone for all timestamps
