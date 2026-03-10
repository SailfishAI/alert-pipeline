import crypto from 'crypto';
import { Webhook, WebhookAuthentication } from '../models/Webhook';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { decrypt } from '../utils/encryption';
import { IncomingHttpHeaders } from 'http';

interface ProcessedEvent {
  metric: string;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
  source: string;
}

interface PrometheusAlert {
  status: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  value?: string;
}

interface DatadogEvent {
  id: string;
  title: string;
  text: string;
  priority: string;
  tags: string[];
  alert_type: string;
  date_happened?: number;
}

class WebhookProcessor {
  async validateAuthentication(
    webhook: Webhook,
    headers: IncomingHttpHeaders,
    body: unknown
  ): Promise<boolean> {
    const auth = webhook.authentication;
    if (!auth || auth.type === 'none') return true;

    switch (auth.type) {
      case 'bearer':
        return this.validateBearerToken(headers, auth);
      case 'basic':
        return this.validateBasicAuth(headers, auth);
      case 'hmac':
        return this.validateHmac(headers, body, auth);
      default:
        logger.warn('Unknown authentication type', { type: auth.type, webhookId: webhook.id });
        return false;
    }
  }

  async process(webhook: Webhook, body: unknown): Promise<ProcessedEvent[]> {
    let events: ProcessedEvent[];

    switch (webhook.source) {
      case 'prometheus':
        events = this.processPrometheus(body);
        break;
      case 'datadog':
        events = this.processDatadog(body);
        break;
      case 'cloudwatch':
        events = this.processCloudWatch(body);
        break;
      case 'grafana':
        events = this.processGrafana(body);
        break;
      case 'custom':
        events = this.processCustom(body, webhook.transformTemplate);
        break;
      default:
        throw new Error(`Unsupported webhook source: ${webhook.source}`);
    }

    for (const event of events) {
      await redisClient.publish('metrics:incoming', JSON.stringify(event));
    }

    return events;
  }

  private processPrometheus(body: unknown): ProcessedEvent[] {
    const payload = body as { alerts?: PrometheusAlert[] };
    if (!payload.alerts || !Array.isArray(payload.alerts)) {
      throw new Error('Invalid Prometheus payload: missing alerts array');
    }

    return payload.alerts.map((alert) => ({
      metric: alert.labels?.alertname || 'unknown',
      value: alert.value ? parseFloat(alert.value) : alert.status === 'firing' ? 1 : 0,
      labels: {
        ...alert.labels,
        status: alert.status,
      },
      timestamp: alert.startsAt || new Date().toISOString(),
      source: 'prometheus',
    }));
  }

  private processDatadog(body: unknown): ProcessedEvent[] {
    const payload = body as DatadogEvent | DatadogEvent[];
    const events = Array.isArray(payload) ? payload : [payload];

    return events.map((event) => {
      const tagLabels: Record<string, string> = {};
      if (event.tags) {
        event.tags.forEach((tag) => {
          const [key, value] = tag.split(':');
          if (key && value) tagLabels[key] = value;
        });
      }

      return {
        metric: event.title || 'datadog_event',
        value: event.alert_type === 'error' ? 1 : 0,
        labels: {
          ...tagLabels,
          priority: event.priority,
          alert_type: event.alert_type,
        },
        timestamp: event.date_happened
          ? new Date(event.date_happened * 1000).toISOString()
          : new Date().toISOString(),
        source: 'datadog',
      };
    });
  }

  private processCloudWatch(body: unknown): ProcessedEvent[] {
    const payload = body as any;

    if (payload.Type === 'Notification') {
      const message = typeof payload.Message === 'string'
        ? JSON.parse(payload.Message)
        : payload.Message;

      return [{
        metric: message.AlarmName || 'cloudwatch_alarm',
        value: message.NewStateValue === 'ALARM' ? 1 : 0,
        labels: {
          region: message.Region || 'unknown',
          namespace: message.Trigger?.Namespace || 'unknown',
          metricName: message.Trigger?.MetricName || 'unknown',
          state: message.NewStateValue,
          previousState: message.OldStateValue,
        },
        timestamp: message.StateChangeTime || new Date().toISOString(),
        source: 'cloudwatch',
      }];
    }

    return [{
      metric: payload.AlarmName || 'cloudwatch_event',
      value: 1,
      labels: { raw: 'true' },
      timestamp: new Date().toISOString(),
      source: 'cloudwatch',
    }];
  }

  private processGrafana(body: unknown): ProcessedEvent[] {
    const payload = body as any;
    const alerts = payload.alerts || [payload];

    return alerts.map((alert: any) => ({
      metric: alert.labels?.alertname || alert.ruleName || 'grafana_alert',
      value: alert.state === 'alerting' ? 1 : 0,
      labels: {
        ...alert.labels,
        state: alert.state,
        ruleUrl: alert.ruleUrl || '',
        dashboardUrl: alert.dashboardUrl || '',
      },
      timestamp: alert.startsAt || new Date().toISOString(),
      source: 'grafana',
    }));
  }

  private processCustom(body: unknown, template: string | null): ProcessedEvent[] {
    if (!template) {
      const payload = body as any;
      return [{
        metric: payload.metric || payload.name || 'custom_event',
        value: typeof payload.value === 'number' ? payload.value : 1,
        labels: payload.labels || payload.tags || {},
        timestamp: payload.timestamp || new Date().toISOString(),
        source: 'custom',
      }];
    }

    try {
      const transform = new Function('body', `return (${template})(body);`);
      const result = transform(body);
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      logger.error('Custom transform template failed', { error, template });
      throw new Error('Transform template execution failed');
    }
  }

  private validateBearerToken(headers: IncomingHttpHeaders, auth: WebhookAuthentication): boolean {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

    const token = authHeader.slice(7);
    const expectedToken = auth.secret ? decrypt(auth.secret) : '';
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  }

  private validateBasicAuth(headers: IncomingHttpHeaders, auth: WebhookAuthentication): boolean {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) return false;

    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [username, password] = decoded.split(':');

    const expectedPassword = auth.password ? decrypt(auth.password) : '';
    return username === auth.username &&
      crypto.timingSafeEqual(Buffer.from(password || ''), Buffer.from(expectedPassword));
  }

  private validateHmac(
    headers: IncomingHttpHeaders,
    body: unknown,
    auth: WebhookAuthentication
  ): boolean {
    const signature = (headers['x-hub-signature-256'] || headers['x-signature']) as string;
    if (!signature) return false;

    const secret = auth.secret ? decrypt(auth.secret) : '';
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const computed = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(bodyStr)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
  }
}

export { WebhookProcessor, ProcessedEvent };
// Fix email template rendering
