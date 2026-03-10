import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { CREATE_ALERT } from '../../graphql/mutations';
import { Severity, AlertConditionOperator } from '../../types';
import { validateAlertForm } from '../../utils/validators';

interface AlertFormState {
  name: string;
  description: string;
  severity: Severity;
  metric: string;
  operator: AlertConditionOperator;
  threshold: string;
  duration: string;
  enabled: boolean;
  labels: Array<{ key: string; value: string }>;
}

const OPERATOR_LABELS: Record<AlertConditionOperator, string> = {
  gt: 'Greater than (>)',
  gte: 'Greater than or equal (>=)',
  lt: 'Less than (<)',
  lte: 'Less than or equal (<=)',
  eq: 'Equal to (=)',
  neq: 'Not equal to (!=)',
};

const CreateAlert: React.FC = () => {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<AlertFormState>({
    name: '',
    description: '',
    severity: 'medium',
    metric: '',
    operator: 'gt',
    threshold: '',
    duration: '',
    enabled: true,
    labels: [{ key: '', value: '' }],
  });

  const [createAlert, { loading }] = useMutation(CREATE_ALERT, {
    onCompleted: (data) => {
      navigate(`/alerts/${data.createAlert.id}`);
    },
    onError: (err) => {
      setErrors({ submit: err.message });
    },
  });

  const updateField = useCallback(
    <K extends keyof AlertFormState>(field: K, value: AlertFormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const addLabel = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      labels: [...prev.labels, { key: '', value: '' }],
    }));
  }, []);

  const removeLabel = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      labels: prev.labels.filter((_, i) => i !== index),
    }));
  }, []);

  const updateLabel = useCallback((index: number, field: 'key' | 'value', value: string) => {
    setForm((prev) => ({
      ...prev,
      labels: prev.labels.map((label, i) =>
        i === index ? { ...label, [field]: value } : label
      ),
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateAlertForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const labels: Record<string, string> = {};
    form.labels.forEach(({ key, value }) => {
      if (key.trim() && value.trim()) {
        labels[key.trim()] = value.trim();
      }
    });

    await createAlert({
      variables: {
        input: {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          severity: form.severity,
          condition: {
            metric: form.metric.trim(),
            operator: form.operator,
            threshold: parseFloat(form.threshold),
            duration: form.duration ? parseInt(form.duration, 10) : undefined,
          },
          labels,
          enabled: form.enabled,
        },
      },
    });
  };

  return (
    <div className="create-alert-page">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/alerts')}>
          Back to Alerts
        </button>
        <h1>Create Alert</h1>
      </div>

      <form className="alert-form" onSubmit={handleSubmit}>
        {errors.submit && <div className="error-banner">{errors.submit}</div>}

        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g. High CPU Usage"
            className={errors.name ? 'input-error' : ''}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Optional description of this alert rule"
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="severity">Severity *</label>
            <select
              id="severity"
              value={form.severity}
              onChange={(e) => updateField('severity', e.target.value as Severity)}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="enabled">
              <input
                id="enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => updateField('enabled', e.target.checked)}
              />
              {' '}Enabled
            </label>
          </div>
        </div>

        <fieldset className="form-fieldset">
          <legend>Condition</legend>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="metric">Metric *</label>
              <input
                id="metric"
                type="text"
                value={form.metric}
                onChange={(e) => updateField('metric', e.target.value)}
                placeholder="e.g. cpu_usage_percent"
                className={errors.metric ? 'input-error' : ''}
              />
              {errors.metric && <span className="field-error">{errors.metric}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="operator">Operator</label>
              <select
                id="operator"
                value={form.operator}
                onChange={(e) => updateField('operator', e.target.value as AlertConditionOperator)}
              >
                {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
                  <option key={op} value={op}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="threshold">Threshold *</label>
              <input
                id="threshold"
                type="number"
                step="any"
                value={form.threshold}
                onChange={(e) => updateField('threshold', e.target.value)}
                className={errors.threshold ? 'input-error' : ''}
              />
              {errors.threshold && <span className="field-error">{errors.threshold}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="duration">Duration (seconds)</label>
              <input
                id="duration"
                type="number"
                min="0"
                value={form.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="form-fieldset">
          <legend>Labels</legend>
          {form.labels.map((label, index) => (
            <div key={index} className="form-row label-row">
              <input
                type="text"
                value={label.key}
                onChange={(e) => updateLabel(index, 'key', e.target.value)}
                placeholder="Key"
              />
              <input
                type="text"
                value={label.value}
                onChange={(e) => updateLabel(index, 'value', e.target.value)}
                placeholder="Value"
              />
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => removeLabel(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-small" onClick={addLabel}>
            Add Label
          </button>
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/alerts')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAlert;

// Preview matches before creating alert rule
