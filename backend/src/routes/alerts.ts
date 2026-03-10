import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Alert } from '../models/Alert';
import { Incident } from '../models/Incident';
import { logger } from '../utils/logger';

const router = Router();

const CreateAlertSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  condition: z.object({
    metric: z.string(),
    operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']),
    threshold: z.number(),
    duration: z.number().min(0).optional(),
  }),
  labels: z.record(z.string()).optional(),
  notificationChannelIds: z.array(z.string().uuid()).optional(),
  enabled: z.boolean().default(true),
});

const UpdateAlertSchema = CreateAlertSchema.partial();

const ListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
  status: z.enum(['active', 'firing', 'resolved', 'silenced']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'severity', 'name']).default('createdAt'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = ListQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const where: Record<string, unknown> = {};
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;

    const { rows: alerts, count: total } = await Alert.findAndCountAll({
      where,
      limit: query.limit,
      offset,
      order: [[query.sortBy, query.sortOrder]],
    });

    res.json({
      data: alerts,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    logger.error('Failed to list alerts', { error });
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const alert = await Alert.findByPk(req.params.id, {
      include: [{ model: Incident, as: 'incidents', limit: 10, order: [['createdAt', 'DESC']] }],
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ data: alert });
  } catch (error) {
    logger.error('Failed to get alert', { error, alertId: req.params.id });
    res.status(500).json({ error: 'Failed to retrieve alert' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateAlertSchema.parse(req.body);

    const alert = await Alert.create({
      ...data,
      status: 'active',
      createdBy: (req as any).userId,
    });

    logger.info('Alert created', { alertId: alert.id, name: alert.name });
    res.status(201).json({ data: alert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid alert data', details: error.errors });
    }
    logger.error('Failed to create alert', { error });
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = UpdateAlertSchema.parse(req.body);
    const alert = await Alert.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.update(data);
    logger.info('Alert updated', { alertId: alert.id });
    res.json({ data: alert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid alert data', details: error.errors });
    }
    logger.error('Failed to update alert', { error, alertId: req.params.id });
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const alert = await Alert.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.destroy();
    logger.info('Alert deleted', { alertId: req.params.id });
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete alert', { error, alertId: req.params.id });
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

router.post('/:id/silence', async (req: Request, res: Response) => {
  try {
    const { duration } = z.object({ duration: z.number().min(60).max(86400) }).parse(req.body);
    const alert = await Alert.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const silencedUntil = new Date(Date.now() + duration * 1000);
    await alert.update({ status: 'silenced', silencedUntil });

    logger.info('Alert silenced', { alertId: alert.id, silencedUntil });
    res.json({ data: alert });
  } catch (error) {
    logger.error('Failed to silence alert', { error, alertId: req.params.id });
    res.status(500).json({ error: 'Failed to silence alert' });
  }
});

export { router as alertRoutes };
// Fix notification rate limiting
