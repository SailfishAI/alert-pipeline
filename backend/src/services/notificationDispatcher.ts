import axios, { AxiosError } from 'axios';
import { NotificationChannel, ChannelConfig } from '../models/NotificationChannel';
import { logger } from '../utils/logger';

interface AlertPayload {
  alertName: string;
  severity: string;
  incidentId: string;
  title: string;
  triggeredAt: string;
  labels: Record<string, string>;
}

interface DispatchResult {
  success: boolean;
  channelId: string;
  error?: string;
  responseTime?: number;
}

class NotificationDispatcher {
  private readonly retryAttempts = 3;
  private readonly retryDelayMs = 1000;
  private readonly timeoutMs = 10000;

  async send(channel: NotificationChannel, payload: AlertPayload): Promise<DispatchResult> {
    const startTime = Date.now();

    try {
      const result = await this.dispatch(channel.config, payload);
      const responseTime = Date.now() - startTime;

      await channel.update({
        lastSentAt: new Date(),
        totalSent: channel.totalSent + 1,
        failureCount: 0,
        lastError: null,
      });

      logger.info('Notification dispatched', {
        channelId: channel.id,
        type: channel.config.type,
        responseTime,
      });

      return { success: true, channelId: channel.id, responseTime };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await channel.update({
        failureCount: channel.failureCount + 1,
        lastError: errorMessage,
      });

      logger.error('Notification dispatch failed', {
        channelId: channel.id,
        type: channel.config.type,
        error: errorMessage,
        failureCount: channel.failureCount + 1,
      });

      return { success: false, channelId: channel.id, error: errorMessage };
    }
  }

  async sendTest(channel: NotificationChannel): Promise<DispatchResult> {
    const testPayload: AlertPayload = {
      alertName: 'Test Alert',
      severity: 'info',
      incidentId: 'test-00000000',
      title: 'Test notification from Alert Pipeline',
      triggeredAt: new Date().toISOString(),
      labels: { source: 'test', environment: 'test' },
    };

    return this.send(channel, testPayload);
  }

  private async dispatch(config: ChannelConfig, payload: AlertPayload): Promise<void> {
    switch (config.type) {
      case 'email':
        await this.sendEmail(config, payload);
        break;
      case 'slack':
        await this.sendSlack(config, payload);
        break;
      case 'pagerduty':
        await this.sendPagerDuty(config, payload);
        break;
      case 'webhook':
        await this.sendWebhook(config, payload);
        break;
      default:
        throw new Error(`Unsupported notification channel type: ${(config as any).type}`);
    }
  }

  private async sendEmail(
    config: Extract<ChannelConfig, { type: 'email' }>,
    payload: AlertPayload
  ): Promise<void> {
    logger.info('Sending email notification', {
      recipients: config.recipients,
      alert: payload.alertName,
    });
    await this.retryWithBackoff(async () => {
      // SMTP transport would be configured here in production
      // For now, log the intended send
      logger.debug('Email dispatch', {
        to: config.recipients,
        subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
      });
    });
  }

  private async sendSlack(
    config: Extract<ChannelConfig, { type: 'slack' }>,
    payload: AlertPayload
  ): Promise<void> {
    const severityColors: Record<string, string> = {
      critical: '#FF0000',
      high: '#FF6600',
      medium: '#FFaa00',
      low: '#0066FF',
      info: '#999999',
    };

    const mentions = config.mentionUsers?.map(u => `<@${u}>`).join(' ') || '';

    const slackPayload = {
      channel: config.channel,
      attachments: [{
        color: severityColors[payload.severity] || '#999999',
        title: payload.title,
        text: `Alert *${payload.alertName}* triggered at ${payload.triggeredAt}`,
        fields: [
          { title: 'Severity', value: payload.severity.toUpperCase(), short: true },
          { title: 'Incident', value: payload.incidentId, short: true },
          ...Object.entries(payload.labels).map(([k, v]) => ({
            title: k,
            value: v,
            short: true,
          })),
        ],
        footer: mentions ? `CC: ${mentions}` : 'Alert Pipeline',
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    await this.retryWithBackoff(async () => {
      await axios.post(config.webhookUrl, slackPayload, {
        timeout: this.timeoutMs,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  }

  private async sendPagerDuty(
    config: Extract<ChannelConfig, { type: 'pagerduty' }>,
    payload: AlertPayload
  ): Promise<void> {
    const pdPayload = {
      routing_key: config.routingKey,
      event_action: 'trigger',
      dedup_key: payload.incidentId,
      payload: {
        summary: payload.title,
        severity: config.severity || this.mapSeverityToPD(payload.severity),
        source: 'alert-pipeline',
        component: payload.alertName,
        custom_details: payload.labels,
        timestamp: payload.triggeredAt,
      },
    };

    await this.retryWithBackoff(async () => {
      await axios.post('https://events.pagerduty.com/v2/enqueue', pdPayload, {
        timeout: this.timeoutMs,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  }

  private async sendWebhook(
    config: Extract<ChannelConfig, { type: 'webhook' }>,
    payload: AlertPayload
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (config.authentication) {
      switch (config.authentication.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${config.authentication.token}`;
          break;
        case 'basic': {
          const encoded = Buffer.from(
            `${config.authentication.username}:${config.authentication.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
          break;
        }
      }
    }

    await this.retryWithBackoff(async () => {
      await axios({
        method: config.method,
        url: config.url,
        data: payload,
        headers,
        timeout: this.timeoutMs,
      });
    });
  }

  private mapSeverityToPD(severity: string): string {
    const mapping: Record<string, string> = {
      critical: 'critical',
      high: 'error',
      medium: 'warning',
      low: 'info',
      info: 'info',
    };
    return mapping[severity] || 'info';
  }

  private async retryWithBackoff(fn: () => Promise<void>): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await fn();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof AxiosError && error.response) {
          const status = error.response.status;
          if (status >= 400 && status < 500 && status !== 429) {
            throw lastError;
          }
        }

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          logger.warn('Retrying notification dispatch', { attempt, delay });
        }
      }
    }

    throw lastError;
  }
}

export { NotificationDispatcher, AlertPayload, DispatchResult };
// Improve incident search functionality
