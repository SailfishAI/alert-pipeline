import { AlertEngine, MetricEvent, EvaluationResult } from '../services/alertEngine';

jest.mock('../models/Alert', () => {
  const mockAlert = {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
  };
  return { Alert: mockAlert };
});

jest.mock('../models/Incident', () => {
  const mockIncident = {
    create: jest.fn(),
    findOne: jest.fn(),
  };
  return { Incident: mockIncident };
});

jest.mock('../models/NotificationChannel', () => ({
  NotificationChannel: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../config/redis', () => ({
  redisClient: {
    publish: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../services/notificationDispatcher', () => ({
  NotificationDispatcher: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ success: true, channelId: 'test' }),
  })),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

const { Alert } = require('../models/Alert');
const { Incident } = require('../models/Incident');

describe('AlertEngine', () => {
  let engine: AlertEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new AlertEngine();
  });

  afterEach(() => {
    engine.stop();
  });

  describe('evaluate', () => {
    it('should evaluate a metric against matching alert rules', async () => {
      const mockAlert = {
        id: 'alert-1',
        name: 'High CPU',
        severity: 'critical',
        status: 'active',
        condition: { metric: 'cpu_usage', operator: 'gt', threshold: 80 },
        labels: {},
        notificationChannelIds: [],
        fireCount: 0,
        enabled: true,
        shouldNotify: jest.fn().mockReturnValue(false),
        update: jest.fn().mockResolvedValue(undefined),
      };

      Alert.findAll.mockResolvedValue([mockAlert]);
      Incident.create.mockResolvedValue({ id: 'incident-1' });

      const metric: MetricEvent = {
        name: 'cpu_usage',
        value: 95,
        labels: { host: 'server-1' },
        timestamp: new Date().toISOString(),
      };

      const results = await engine.evaluate(metric);

      expect(results).toHaveLength(1);
      expect(results[0].fired).toBe(true);
      expect(results[0].alertId).toBe('alert-1');
      expect(results[0].currentValue).toBe(95);
    });

    it('should not fire when metric is below threshold', async () => {
      const mockAlert = {
        id: 'alert-2',
        name: 'High Memory',
        severity: 'high',
        status: 'active',
        condition: { metric: 'memory_usage', operator: 'gt', threshold: 90 },
        labels: {},
        notificationChannelIds: [],
        fireCount: 0,
        enabled: true,
        update: jest.fn(),
      };

      Alert.findAll.mockResolvedValue([mockAlert]);

      const metric: MetricEvent = {
        name: 'memory_usage',
        value: 45,
        labels: {},
        timestamp: new Date().toISOString(),
      };

      const results = await engine.evaluate(metric);

      expect(results).toHaveLength(1);
      expect(results[0].fired).toBe(false);
    });

    it('should resolve a firing alert when condition clears', async () => {
      const mockAlert = {
        id: 'alert-3',
        name: 'Disk Full',
        severity: 'medium',
        status: 'firing',
        condition: { metric: 'disk_usage', operator: 'gte', threshold: 95 },
        labels: {},
        notificationChannelIds: [],
        fireCount: 3,
        enabled: true,
        update: jest.fn().mockResolvedValue(undefined),
      };

      Alert.findAll.mockResolvedValue([mockAlert]);
      Incident.findOne.mockResolvedValue({
        id: 'incident-2',
        triggeredAt: new Date(Date.now() - 3600000),
        timeline: [],
        update: jest.fn().mockResolvedValue(undefined),
      });

      const metric: MetricEvent = {
        name: 'disk_usage',
        value: 80,
        labels: {},
        timestamp: new Date().toISOString(),
      };

      const results = await engine.evaluate(metric);

      expect(results[0].fired).toBe(false);
      expect(mockAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'resolved' })
      );
    });

    it('should handle all comparison operators correctly', async () => {
      const operators = [
        { operator: 'gt', value: 81, threshold: 80, expected: true },
        { operator: 'gt', value: 80, threshold: 80, expected: false },
        { operator: 'gte', value: 80, threshold: 80, expected: true },
        { operator: 'lt', value: 79, threshold: 80, expected: true },
        { operator: 'lt', value: 80, threshold: 80, expected: false },
        { operator: 'lte', value: 80, threshold: 80, expected: true },
        { operator: 'eq', value: 80, threshold: 80, expected: true },
        { operator: 'eq', value: 81, threshold: 80, expected: false },
        { operator: 'neq', value: 81, threshold: 80, expected: true },
        { operator: 'neq', value: 80, threshold: 80, expected: false },
      ];

      for (const testCase of operators) {
        const mockAlert = {
          id: `alert-op-${testCase.operator}-${testCase.value}`,
          name: 'Test',
          severity: 'low',
          status: 'active',
          condition: {
            metric: 'test_metric',
            operator: testCase.operator,
            threshold: testCase.threshold,
          },
          labels: {},
          notificationChannelIds: [],
          fireCount: 0,
          enabled: true,
          shouldNotify: jest.fn().mockReturnValue(false),
          update: jest.fn().mockResolvedValue(undefined),
        };

        Alert.findAll.mockResolvedValue([mockAlert]);
        Incident.create.mockResolvedValue({ id: 'incident-op' });

        const metric: MetricEvent = {
          name: 'test_metric',
          value: testCase.value,
          labels: {},
          timestamp: new Date().toISOString(),
        };

        const results = await engine.evaluate(metric);

        expect(results[0].fired).toBe(testCase.expected);
      }
    });

    it('should return empty results when no alerts match the metric', async () => {
      Alert.findAll.mockResolvedValue([]);

      const metric: MetricEvent = {
        name: 'unknown_metric',
        value: 100,
        labels: {},
        timestamp: new Date().toISOString(),
      };

      const results = await engine.evaluate(metric);
      expect(results).toHaveLength(0);
    });
  });

  describe('start/stop', () => {
    it('should start the evaluation cron job', () => {
      const cron = require('node-cron');
      engine.start();
      expect(cron.schedule).toHaveBeenCalled();
    });

    it('should stop the evaluation cron job', () => {
      engine.start();
      engine.stop();
    });
  });
});
