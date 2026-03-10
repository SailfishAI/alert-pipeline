import { WebhookProcessor, ProcessedEvent } from '../services/webhookProcessor';

jest.mock('../config/redis', () => ({
  redisClient: {
    publish: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../utils/encryption', () => ({
  decrypt: jest.fn((ciphertext: string) => `decrypted:${ciphertext}`),
}));

describe('WebhookProcessor', () => {
  let processor: WebhookProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new WebhookProcessor();
  });

  describe('process - Prometheus', () => {
    it('should parse Prometheus alertmanager webhook payload', async () => {
      const webhook = {
        id: 'wh-1',
        source: 'prometheus',
        authentication: null,
        transformTemplate: null,
      } as any;

      const body = {
        alerts: [
          {
            status: 'firing',
            labels: { alertname: 'HighCPU', instance: 'server-1:9090', severity: 'critical' },
            annotations: { summary: 'CPU is too high' },
            startsAt: '2024-01-15T10:00:00Z',
            endsAt: '0001-01-01T00:00:00Z',
            value: '95.5',
          },
          {
            status: 'resolved',
            labels: { alertname: 'DiskSpace', instance: 'server-2:9090' },
            annotations: {},
            startsAt: '2024-01-15T09:00:00Z',
            endsAt: '2024-01-15T10:00:00Z',
          },
        ],
      };

      const events = await processor.process(webhook, body);

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        metric: 'HighCPU',
        value: 95.5,
        source: 'prometheus',
        labels: expect.objectContaining({
          alertname: 'HighCPU',
          status: 'firing',
        }),
      });
      expect(events[1]).toMatchObject({
        metric: 'DiskSpace',
        value: 0,
        source: 'prometheus',
      });
    });

    it('should throw on invalid Prometheus payload', async () => {
      const webhook = { id: 'wh-2', source: 'prometheus' } as any;

      await expect(processor.process(webhook, { invalid: true })).rejects.toThrow(
        'Invalid Prometheus payload'
      );
    });
  });

  describe('process - Datadog', () => {
    it('should parse Datadog event payload', async () => {
      const webhook = {
        id: 'wh-3',
        source: 'datadog',
        authentication: null,
        transformTemplate: null,
      } as any;

      const body = {
        id: 'evt-123',
        title: 'High latency detected',
        text: 'Latency exceeded 500ms',
        priority: 'high',
        tags: ['environment:production', 'service:api'],
        alert_type: 'error',
        date_happened: 1705312800,
      };

      const events = await processor.process(webhook, body);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        metric: 'High latency detected',
        value: 1,
        source: 'datadog',
        labels: expect.objectContaining({
          environment: 'production',
          service: 'api',
          priority: 'high',
          alert_type: 'error',
        }),
      });
    });

    it('should handle array of Datadog events', async () => {
      const webhook = { id: 'wh-4', source: 'datadog', transformTemplate: null } as any;

      const body = [
        { id: 'e1', title: 'Event 1', text: '', priority: 'low', tags: [], alert_type: 'info' },
        { id: 'e2', title: 'Event 2', text: '', priority: 'high', tags: [], alert_type: 'error' },
      ];

      const events = await processor.process(webhook, body);
      expect(events).toHaveLength(2);
    });
  });

  describe('process - CloudWatch', () => {
    it('should parse CloudWatch SNS notification', async () => {
      const webhook = {
        id: 'wh-5',
        source: 'cloudwatch',
        authentication: null,
        transformTemplate: null,
      } as any;

      const body = {
        Type: 'Notification',
        Message: JSON.stringify({
          AlarmName: 'HighCPUAlarm',
          NewStateValue: 'ALARM',
          OldStateValue: 'OK',
          Region: 'us-east-1',
          StateChangeTime: '2024-01-15T10:00:00Z',
          Trigger: { Namespace: 'AWS/EC2', MetricName: 'CPUUtilization' },
        }),
      };

      const events = await processor.process(webhook, body);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        metric: 'HighCPUAlarm',
        value: 1,
        source: 'cloudwatch',
        labels: expect.objectContaining({
          region: 'us-east-1',
          state: 'ALARM',
          previousState: 'OK',
        }),
      });
    });
  });

  describe('process - Grafana', () => {
    it('should parse Grafana alert webhook', async () => {
      const webhook = {
        id: 'wh-6',
        source: 'grafana',
        authentication: null,
        transformTemplate: null,
      } as any;

      const body = {
        alerts: [
          {
            labels: { alertname: 'MemoryPressure' },
            state: 'alerting',
            startsAt: '2024-01-15T10:00:00Z',
            ruleUrl: 'https://grafana.example.com/alerting/1',
            dashboardUrl: 'https://grafana.example.com/d/abc',
          },
        ],
      };

      const events = await processor.process(webhook, body);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        metric: 'MemoryPressure',
        value: 1,
        source: 'grafana',
      });
    });
  });

  describe('process - Custom', () => {
    it('should parse custom webhook with default mapping', async () => {
      const webhook = {
        id: 'wh-7',
        source: 'custom',
        authentication: null,
        transformTemplate: null,
      } as any;

      const body = {
        metric: 'custom_latency',
        value: 250,
        labels: { region: 'us-west-2' },
        timestamp: '2024-01-15T10:00:00Z',
      };

      const events = await processor.process(webhook, body);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        metric: 'custom_latency',
        value: 250,
        source: 'custom',
      });
    });
  });

  describe('validateAuthentication', () => {
    it('should pass when no authentication is configured', async () => {
      const webhook = { authentication: null } as any;
      const result = await processor.validateAuthentication(webhook, {}, {});
      expect(result).toBe(true);
    });

    it('should pass when authentication type is none', async () => {
      const webhook = { authentication: { type: 'none' } } as any;
      const result = await processor.validateAuthentication(webhook, {}, {});
      expect(result).toBe(true);
    });

    it('should validate bearer token', async () => {
      const webhook = {
        authentication: { type: 'bearer', secret: 'encrypted-token' },
      } as any;

      const validHeaders = { authorization: 'Bearer decrypted:encrypted-token' };
      const result = await processor.validateAuthentication(webhook, validHeaders, {});
      expect(result).toBe(true);

      const invalidHeaders = { authorization: 'Bearer wrong-token' };
      const invalidResult = await processor.validateAuthentication(webhook, invalidHeaders, {});
      expect(invalidResult).toBe(false);
    });

    it('should reject missing authorization header', async () => {
      const webhook = {
        authentication: { type: 'bearer', secret: 'encrypted-token' },
      } as any;

      const result = await processor.validateAuthentication(webhook, {}, {});
      expect(result).toBe(false);
    });
  });
});
