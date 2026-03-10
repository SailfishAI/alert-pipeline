import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Webhook } from '../models/Webhook';
import { WebhookProcessor } from '../services/webhookProcessor';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { encrypt } from '../utils/encryption';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const webhookProcessor = new WebhookProcessor();

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  source: z.enum(['prometheus', 'datadog', 'cloudwatch', 'grafana', 'custom']),
  description: z.string().max(500).optional(),
  authentication: z.object({
    type: z.enum(['none', 'bearer', 'basic', 'hmac']),
    secret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
  transformTemplate: z.string().optional(),
  enabled: z.boolean().default(true),
});

router.post('/ingest/:webhookId', async (req: Request, res: Response) => {
  try {
    const webhook = await Webhook.findOne({
      where: { externalId: req.params.webhookId, enabled: true },
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found or disabled' });
    }

    const isAuthenticated = await webhookProcessor.validateAuthentication(
      webhook,
      req.headers,
      req.body
    );

    if (!isAuthenticated) {
      logger.warn('Webhook authentication failed', { webhookId: webhook.id });
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const events = await webhookProcessor.process(webhook, req.body);

    logger.info('Webhook processed', {
      webhookId: webhook.id,
      source: webhook.source,
      eventsGenerated: events.length,
    });

    await webhook.update({
      lastReceivedAt: new Date(),
      totalReceived: (webhook.totalReceived || 0) + 1,
    });

    res.status(202).json({
      accepted: true,
      eventsProcessed: events.length,
    });
  } catch (error) {
    logger.error('Webhook ingestion failed', {
      error,
      webhookId: req.params.webhookId,
    });
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const webhooks = await Webhook.findAll({
      attributes: { exclude: ['authentication'] },
      order: [['createdAt', 'DESC']],
    });

    res.json({ data: webhooks });
  } catch (error) {
    logger.error('Failed to list webhooks', { error });
    res.status(500).json({ error: 'Failed to retrieve webhooks' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const webhook = await Webhook.findByPk(req.params.id, {
      attributes: { exclude: ['authentication'] },
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ data: webhook });
  } catch (error) {
    logger.error('Failed to get webhook', { error, webhookId: req.params.id });
    res.status(500).json({ error: 'Failed to retrieve webhook' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateWebhookSchema.parse(req.body);
    const externalId = uuidv4();

    let encryptedAuth = null;
    if (data.authentication && data.authentication.type !== 'none') {
      encryptedAuth = {
        type: data.authentication.type,
        secret: data.authentication.secret ? encrypt(data.authentication.secret) : undefined,
        username: data.authentication.username,
        password: data.authentication.password ? encrypt(data.authentication.password) : undefined,
      };
    }

    const webhook = await Webhook.create({
      ...data,
      externalId,
      authentication: encryptedAuth,
      createdBy: (req as any).userId,
    });

    const ingestUrl = `${req.protocol}://${req.get('host')}/api/webhooks/ingest/${externalId}`;

    logger.info('Webhook created', { webhookId: webhook.id, source: data.source });
    res.status(201).json({
      data: {
        ...webhook.toJSON(),
        authentication: undefined,
        ingestUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid webhook data', details: error.errors });
    }
    logger.error('Failed to create webhook', { error });
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const webhook = await Webhook.findByPk(req.params.id);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await webhook.destroy();
    logger.info('Webhook deleted', { webhookId: req.params.id });
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete webhook', { error, webhookId: req.params.id });
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

export { router as webhookRoutes };
// Add PagerDuty integration
