import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

interface RateLimitInfo {
  ip: string;
  path: string;
  remaining: number;
  resetTime: Date;
}

function createRateLimiter(maxRequests: number, windowSeconds: number) {
  return rateLimit({
    windowMs: windowSeconds * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      const userId = (req as any).userId;
      if (userId) return `user:${userId}`;
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip || req.socket.remoteAddress || 'unknown';
      return `ip:${ip}`;
    },
    handler: (req: Request, res: Response): void => {
      const info: RateLimitInfo = {
        ip: req.ip || 'unknown',
        path: req.path,
        remaining: 0,
        resetTime: new Date(Date.now() + windowSeconds * 1000),
      };

      logger.warn('Rate limit exceeded', info);

      res.status(429).json({
        error: 'Too many requests',
        retryAfter: windowSeconds,
        message: `Rate limit of ${maxRequests} requests per ${windowSeconds}s exceeded`,
      });
    },
    skip: (req: Request): boolean => {
      if (req.path === '/health') return true;
      if ((req as any).isAdmin && process.env.NODE_ENV === 'development') return true;
      return false;
    },
  });
}

function createStrictRateLimiter(maxRequests: number, windowSeconds: number) {
  return createRateLimiter(maxRequests, windowSeconds);
}

function createWebhookRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      return `webhook:${req.params.webhookId || req.ip}`;
    },
    handler: (_req: Request, res: Response): void => {
      res.status(429).json({
        error: 'Webhook rate limit exceeded',
        retryAfter: 60,
      });
    },
  });
}

export { createRateLimiter, createStrictRateLimiter, createWebhookRateLimiter };
// refactor: extract webhook auth into middleware
