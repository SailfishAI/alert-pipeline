import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { sequelize } from './config/database';
import { redisClient, redisSubscriber } from './config/redis';
import { alertRoutes } from './routes/alerts';
import { webhookRoutes } from './routes/webhooks';
import { notificationRoutes } from './routes/notifications';
import { incidentRoutes } from './routes/incidents';
import { authMiddleware } from './middleware/auth';
import { createRateLimiter } from './middleware/rateLimit';
import { logger } from './utils/logger';
import { AlertEngine } from './services/alertEngine';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    version: '2.4.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/webhooks', createRateLimiter(100, 60), webhookRoutes);

app.use('/api', authMiddleware);
app.use('/api/alerts', createRateLimiter(200, 60), alertRoutes);
app.use('/api/notifications', createRateLimiter(100, 60), notificationRoutes);
app.use('/api/incidents', createRateLimiter(200, 60), incidentRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal server error',
    requestId: res.getHeader('x-request-id'),
  });
});

async function bootstrap(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database models synchronized');

    await redisClient.ping();
    logger.info('Redis connection established');

    const alertEngine = new AlertEngine();
    alertEngine.start();
    logger.info('Alert engine started');

    redisSubscriber.subscribe('metrics:incoming', (err) => {
      if (err) {
        logger.error('Failed to subscribe to metrics channel', { error: err.message });
        return;
      }
      logger.info('Subscribed to metrics:incoming channel');
    });

    redisSubscriber.on('message', async (_channel: string, message: string) => {
      try {
        const metric = JSON.parse(message);
        await alertEngine.evaluate(metric);
      } catch (error) {
        logger.error('Failed to process incoming metric', { error });
      }
    });

    server.listen(port, () => {
      logger.info(`Alert Pipeline API running on port ${port}`, {
        environment: process.env.NODE_ENV || 'development',
        port,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close();
  await redisClient.quit();
  await redisSubscriber.quit();
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close();
  await redisClient.quit();
  await redisSubscriber.quit();
  await sequelize.close();
  process.exit(0);
});

bootstrap();

export { app, server };
// Fix Redis connection timeout
