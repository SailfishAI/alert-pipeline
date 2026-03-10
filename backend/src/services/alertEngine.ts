import * as cron from 'node-cron';
import { Alert, AlertCondition } from '../models/Alert';
import { Incident } from '../models/Incident';
import { NotificationChannel } from '../models/NotificationChannel';
import { NotificationDispatcher } from './notificationDispatcher';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

interface MetricEvent {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
  source?: string;
}

interface EvaluationResult {
  alertId: string;
  fired: boolean;
  currentValue: number;
  threshold: number;
  operator: string;
}

class AlertEngine {
  private dispatcher: NotificationDispatcher;
  private evaluationInterval: cron.ScheduledTask | null = null;
  private metricsBuffer: Map<string, MetricEvent[]> = new Map();
  private readonly bufferRetentionMs = 300_000;

  constructor() {
    this.dispatcher = new NotificationDispatcher();
  }

  start(): void {
    this.evaluationInterval = cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.evaluateAll();
      } catch (error) {
        logger.error('Alert evaluation cycle failed', { error });
      }
    });

    cron.schedule('*/5 * * * *', () => {
      this.pruneMetricsBuffer();
    });

    logger.info('Alert engine started with 30s evaluation interval');
  }

  stop(): void {
    if (this.evaluationInterval) {
      this.evaluationInterval.stop();
      this.evaluationInterval = null;
    }
    logger.info('Alert engine stopped');
  }

  async evaluate(metric: MetricEvent): Promise<EvaluationResult[]> {
    this.bufferMetric(metric);

    const alerts = await Alert.findAll({
      where: {
        enabled: true,
        status: { [Op.notIn]: ['silenced'] },
        'condition.metric': metric.name,
      },
    });

    const results: EvaluationResult[] = [];

    for (const alert of alerts) {
      const result = this.evaluateCondition(alert.condition, metric.value);
      results.push({
        alertId: alert.id,
        fired: result,
        currentValue: metric.value,
        threshold: alert.condition.threshold,
        operator: alert.condition.operator,
      });

      if (result) {
        await this.handleAlertFired(alert, metric);
      } else if (alert.status === 'firing') {
        await this.handleAlertResolved(alert);
      }
    }

    return results;
  }

  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'neq': return value !== condition.threshold;
      default: return false;
    }
  }

  private async handleAlertFired(alert: Alert, metric: MetricEvent): Promise<void> {
    if (alert.condition.duration && alert.condition.duration > 0) {
      const isSustained = await this.checkSustainedCondition(alert, metric.name);
      if (!isSustained) return;
    }

    const wasAlreadyFiring = alert.status === 'firing';

    await alert.update({
      status: 'firing',
      lastFiredAt: new Date(),
      fireCount: alert.fireCount + 1,
    });

    if (!wasAlreadyFiring) {
      const incident = await Incident.create({
        alertId: alert.id,
        title: `${alert.name} - ${alert.severity} alert triggered`,
        severity: alert.severity === 'info' ? 'low' : (alert.severity as any),
        status: 'triggered',
        triggeredAt: new Date(),
        timeline: [{
          type: 'status_change',
          content: `Alert fired: ${metric.name} = ${metric.value} (threshold: ${alert.condition.operator} ${alert.condition.threshold})`,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          visibility: 'public',
        }],
        labels: { ...alert.labels, ...metric.labels },
      });

      logger.info('Incident created from alert', {
        alertId: alert.id,
        incidentId: incident.id,
        metric: metric.name,
        value: metric.value,
      });

      if (alert.shouldNotify()) {
        await this.dispatchNotifications(alert, incident);
      }
    }

    await redisClient.publish('alerts:fired', JSON.stringify({
      alertId: alert.id,
      metric: metric.name,
      value: metric.value,
      timestamp: new Date().toISOString(),
    }));
  }

  private async handleAlertResolved(alert: Alert): Promise<void> {
    await alert.update({
      status: 'resolved',
      lastResolvedAt: new Date(),
    });

    const openIncident = await Incident.findOne({
      where: {
        alertId: alert.id,
        status: { [Op.notIn]: ['resolved', 'closed'] },
      },
      order: [['triggeredAt', 'DESC']],
    });

    if (openIncident) {
      const resolvedAt = new Date();
      const ttrSeconds = Math.floor((resolvedAt.getTime() - openIncident.triggeredAt.getTime()) / 1000);
      const timeline = openIncident.timeline || [];
      timeline.push({
        type: 'status_change',
        content: 'Alert condition resolved automatically',
        createdAt: resolvedAt.toISOString(),
        createdBy: 'system',
        visibility: 'public',
      });

      await openIncident.update({
        status: 'resolved',
        resolvedAt,
        ttrSeconds,
        timeline,
      });

      logger.info('Incident auto-resolved', {
        incidentId: openIncident.id,
        ttrSeconds,
      });
    }

    await redisClient.publish('alerts:resolved', JSON.stringify({
      alertId: alert.id,
      timestamp: new Date().toISOString(),
    }));
  }

  private async dispatchNotifications(alert: Alert, incident: Incident): Promise<void> {
    const channels = await NotificationChannel.findAll({
      where: {
        id: alert.notificationChannelIds,
        enabled: true,
      },
    });

    for (const channel of channels) {
      try {
        await this.dispatcher.send(channel, {
          alertName: alert.name,
          severity: alert.severity,
          incidentId: incident.id,
          title: incident.title,
          triggeredAt: incident.triggeredAt.toISOString(),
          labels: alert.labels,
        });
      } catch (error) {
        logger.error('Failed to dispatch notification', {
          channelId: channel.id,
          alertId: alert.id,
          error,
        });
      }
    }
  }

  private async evaluateAll(): Promise<void> {
    const silencedAlerts = await Alert.findAll({
      where: {
        status: 'silenced',
        silencedUntil: { [Op.lt]: new Date() },
      },
    });

    for (const alert of silencedAlerts) {
      await alert.update({ status: 'active', silencedUntil: null });
      logger.info('Alert silence expired', { alertId: alert.id });
    }
  }

  private async checkSustainedCondition(alert: Alert, metricName: string): Promise<boolean> {
    const buffer = this.metricsBuffer.get(metricName) || [];
    const durationMs = (alert.condition.duration || 0) * 1000;
    const cutoff = Date.now() - durationMs;
    const relevantMetrics = buffer.filter(m => new Date(m.timestamp).getTime() >= cutoff);

    if (relevantMetrics.length === 0) return false;

    return relevantMetrics.every(m => this.evaluateCondition(alert.condition, m.value));
  }

  private bufferMetric(metric: MetricEvent): void {
    const key = metric.name;
    const buffer = this.metricsBuffer.get(key) || [];
    buffer.push(metric);
    this.metricsBuffer.set(key, buffer);
  }

  private pruneMetricsBuffer(): void {
    const cutoff = Date.now() - this.bufferRetentionMs;
    for (const [key, buffer] of this.metricsBuffer.entries()) {
      const pruned = buffer.filter(m => new Date(m.timestamp).getTime() >= cutoff);
      if (pruned.length === 0) {
        this.metricsBuffer.delete(key);
      } else {
        this.metricsBuffer.set(key, pruned);
      }
    }
  }
}

export { AlertEngine, MetricEvent, EvaluationResult };
// Add alert dependency mapping
