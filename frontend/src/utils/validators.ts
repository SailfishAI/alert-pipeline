export function validateWebhookUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validateEmailList(emailsStr: string): { valid: boolean; invalid: string[] } {
  const emails = emailsStr.split(',').map((e) => e.trim()).filter(Boolean);
  const invalid = emails.filter((e) => !validateEmail(e));
  return {
    valid: invalid.length === 0 && emails.length > 0,
    invalid,
  };
}

interface AlertFormData {
  name: string;
  metric: string;
  threshold: string;
  severity: string;
  duration?: string;
}

export function validateAlertForm(data: AlertFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Alert name is required';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Alert name must be 255 characters or less';
  }

  if (!data.metric || data.metric.trim().length === 0) {
    errors.metric = 'Metric name is required';
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(data.metric.trim())) {
    errors.metric = 'Invalid metric name. Use letters, numbers, underscores, and dots.';
  }

  if (!data.threshold || data.threshold.trim().length === 0) {
    errors.threshold = 'Threshold value is required';
  } else {
    const num = parseFloat(data.threshold);
    if (isNaN(num)) {
      errors.threshold = 'Threshold must be a valid number';
    }
  }

  if (data.duration) {
    const dur = parseInt(data.duration, 10);
    if (isNaN(dur) || dur < 0) {
      errors.duration = 'Duration must be a non-negative number';
    }
  }

  return errors;
}

export function validatePagerDutyRoutingKey(key: string): boolean {
  return /^[a-zA-Z0-9]{32}$/.test(key);
}

export function validateSlackWebhookUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'hooks.slack.com' && parsed.pathname.startsWith('/services/');
  } catch {
    return false;
  }
}

export function validateJsonString(str: string): { valid: boolean; error?: string } {
  if (!str || str.trim() === '') {
    return { valid: true };
  }
  try {
    JSON.parse(str);
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: `Invalid JSON: ${(e as Error).message}`,
    };
  }
}

export function validatePort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function validateCronExpression(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  return parts.length === 5 || parts.length === 6;
}
