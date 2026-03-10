import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Incident } from '../models/Incident';
import { Alert } from '../models/Alert';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

const router = Router();

const ListIncidentsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['triggered', 'acknowledged', 'investigating', 'resolved', 'closed']).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const UpdateIncidentSchema = z.object({
  status: z.enum(['acknowledged', 'investigating', 'resolved', 'closed']).optional(),
  assignee: z.string().uuid().optional(),
  summary: z.string().max(2000).optional(),
  rootCause: z.string().max(2000).optional(),
});

const TimelineEntrySchema = z.object({
  type: z.enum(['comment', 'status_change', 'action', 'escalation']),
  content: z.string().min(1).max(2000),
  visibility: z.enum(['public', 'internal']).default('internal'),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = ListIncidentsSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.from || query.to) {
      where.triggeredAt = {};
      if (query.from) (where.triggeredAt as any)[Op.gte] = query.from;
      if (query.to) (where.triggeredAt as any)[Op.lte] = query.to;
    }

    const { rows: incidents, count: total } = await Incident.findAndCountAll({
      where,
      limit: query.limit,
      offset,
      order: [['triggeredAt', 'DESC']],
      include: [{ model: Alert, as: 'alert', attributes: ['id', 'name', 'severity'] }],
    });

    res.json({
      data: incidents,
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
    logger.error('Failed to list incidents', { error });
    res.status(500).json({ error: 'Failed to retrieve incidents' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      include: [{ model: Alert, as: 'alert' }],
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ data: incident });
  } catch (error) {
    logger.error('Failed to get incident', { error, incidentId: req.params.id });
    res.status(500).json({ error: 'Failed to retrieve incident' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = UpdateIncidentSchema.parse(req.body);
    const incident = await Incident.findByPk(req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const previousStatus = incident.status;
    await incident.update({
      ...data,
      resolvedAt: data.status === 'resolved' ? new Date() : incident.resolvedAt,
    });

    if (data.status && data.status !== previousStatus) {
      const timeline = incident.timeline || [];
      timeline.push({
        type: 'status_change',
        content: `Status changed from ${previousStatus} to ${data.status}`,
        createdAt: new Date().toISOString(),
        createdBy: (req as any).userId,
        visibility: 'public',
      });
      await incident.update({ timeline });
    }

    logger.info('Incident updated', { incidentId: incident.id, status: data.status });
    res.json({ data: incident });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid incident data', details: error.errors });
    }
    logger.error('Failed to update incident', { error, incidentId: req.params.id });
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

router.post('/:id/timeline', async (req: Request, res: Response) => {
  try {
    const entry = TimelineEntrySchema.parse(req.body);
    const incident = await Incident.findByPk(req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const timeline = incident.timeline || [];
    timeline.push({
      ...entry,
      createdAt: new Date().toISOString(),
      createdBy: (req as any).userId,
    });

    await incident.update({ timeline });

    logger.info('Timeline entry added', { incidentId: incident.id, type: entry.type });
    res.status(201).json({ data: incident });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid timeline entry', details: error.errors });
    }
    logger.error('Failed to add timeline entry', { error, incidentId: req.params.id });
    res.status(500).json({ error: 'Failed to add timeline entry' });
  }
});

router.get('/:id/timeline', async (req: Request, res: Response) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      attributes: ['id', 'timeline'],
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const visibility = (req as any).isAdmin ? undefined : 'public';
    const timeline = (incident.timeline || []).filter(
      (entry: any) => !visibility || entry.visibility === visibility
    );

    res.json({ data: timeline });
  } catch (error) {
    logger.error('Failed to get incident timeline', { error, incidentId: req.params.id });
    res.status(500).json({ error: 'Failed to retrieve timeline' });
  }
});

export { router as incidentRoutes };
// fix: resolve dashboard refresh race condition
