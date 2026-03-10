import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { NotificationChannel } from '../models/NotificationChannel';
import { NotificationDispatcher } from '../services/notificationDispatcher';
import { logger } from '../utils/logger';

const router = Router();
const dispatcher = new NotificationDispatcher();

const ChannelConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    recipients: z.array(z.string().email()).min(1),
    smtpHost: z.string().optional(),
    smtpPort: z.number().optional(),
  }),
  z.object({
    type: z.literal('slack'),
    webhookUrl: z.string().url(),
    channel: z.string().optional(),
    mentionUsers: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal('pagerduty'),
    routingKey: z.string().min(1),
    severity: z.enum(['critical', 'error', 'warning', 'info']).optional(),
  }),
  z.object({
    type: z.literal('webhook'),
    url: z.string().url(),
    method: z.enum(['POST', 'PUT']).default('POST'),
    headers: z.record(z.string()).optional(),
    authentication: z.object({
      type: z.enum(['none', 'bearer', 'basic']),
      token: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    }).optional(),
  }),
]);

const CreateChannelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  config: ChannelConfigSchema,
  enabled: z.boolean().default(true),
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const channels = await NotificationChannel.findAll({
      order: [['createdAt', 'DESC']],
    });

    const sanitized = channels.map((ch) => {
      const json = ch.toJSON();
      if (json.config?.type === 'pagerduty') {
        json.config.routingKey = '***' + json.config.routingKey.slice(-4);
      }
      return json;
    });

    res.json({ data: sanitized });
  } catch (error) {
    logger.error('Failed to list notification channels', { error });
    res.status(500).json({ error: 'Failed to retrieve notification channels' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const channel = await NotificationChannel.findByPk(req.params.id);

    if (!channel) {
      return res.status(404).json({ error: 'Notification channel not found' });
    }

    res.json({ data: channel });
  } catch (error) {
    logger.error('Failed to get notification channel', { error, channelId: req.params.id });
    res.status(500).json({ error: 'Failed to retrieve notification channel' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateChannelSchema.parse(req.body);

    const channel = await NotificationChannel.create({
      ...data,
      createdBy: (req as any).userId,
    });

    logger.info('Notification channel created', {
      channelId: channel.id,
      type: data.config.type,
    });
    res.status(201).json({ data: channel });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid channel data', details: error.errors });
    }
    logger.error('Failed to create notification channel', { error });
    res.status(500).json({ error: 'Failed to create notification channel' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = CreateChannelSchema.partial().parse(req.body);
    const channel = await NotificationChannel.findByPk(req.params.id);

    if (!channel) {
      return res.status(404).json({ error: 'Notification channel not found' });
    }

    await channel.update(data);
    logger.info('Notification channel updated', { channelId: channel.id });
    res.json({ data: channel });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid channel data', details: error.errors });
    }
    logger.error('Failed to update notification channel', { error, channelId: req.params.id });
    res.status(500).json({ error: 'Failed to update notification channel' });
  }
});

router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const channel = await NotificationChannel.findByPk(req.params.id);

    if (!channel) {
      return res.status(404).json({ error: 'Notification channel not found' });
    }

    const result = await dispatcher.sendTest(channel);

    res.json({
      success: result.success,
      message: result.success ? 'Test notification sent' : 'Test notification failed',
      error: result.error,
    });
  } catch (error) {
    logger.error('Failed to send test notification', { error, channelId: req.params.id });
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const channel = await NotificationChannel.findByPk(req.params.id);

    if (!channel) {
      return res.status(404).json({ error: 'Notification channel not found' });
    }

    await channel.destroy();
    logger.info('Notification channel deleted', { channelId: req.params.id });
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete notification channel', { error, channelId: req.params.id });
    res.status(500).json({ error: 'Failed to delete notification channel' });
  }
});

export { router as notificationRoutes };
// feat: add webhook payload templates
// refactor: use connection pooling for notifications
