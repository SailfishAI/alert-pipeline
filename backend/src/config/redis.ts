import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const commonOptions: Redis.RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | void {
    if (times > 10) {
      logger.error('Redis retry limit reached, giving up');
      return undefined;
    }
    const delay = Math.min(times * 200, 5000);
    logger.warn('Redis connection retry', { attempt: times, delay });
    return delay;
  },
  reconnectOnError(err: Error): boolean {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some(e => err.message.includes(e));
  },
  enableReadyCheck: true,
  lazyConnect: false,
};

const redisClient = new Redis(REDIS_URL, {
  ...commonOptions,
  connectionName: 'alert-pipeline:main',
  db: 0,
});

const redisSubscriber = new Redis(REDIS_URL, {
  ...commonOptions,
  connectionName: 'alert-pipeline:subscriber',
  db: 0,
});

const redisCacheClient = new Redis(REDIS_URL, {
  ...commonOptions,
  connectionName: 'alert-pipeline:cache',
  db: 1,
});

redisClient.on('connect', () => logger.info('Redis main client connected'));
redisClient.on('error', (err) => logger.error('Redis main client error', { error: err.message }));
redisClient.on('close', () => logger.warn('Redis main client disconnected'));

redisSubscriber.on('connect', () => logger.info('Redis subscriber connected'));
redisSubscriber.on('error', (err) => logger.error('Redis subscriber error', { error: err.message }));

redisCacheClient.on('connect', () => logger.info('Redis cache client connected'));
redisCacheClient.on('error', (err) => logger.error('Redis cache client error', { error: err.message }));

async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redisCacheClient.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function setCache(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
  try {
    await redisCacheClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.warn('Cache set failed', { key, error });
  }
}

async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redisCacheClient.keys(pattern);
    if (keys.length > 0) {
      await redisCacheClient.del(...keys);
    }
  } catch (error) {
    logger.warn('Cache invalidation failed', { pattern, error });
  }
}

export {
  redisClient,
  redisSubscriber,
  redisCacheClient,
  getCache,
  setCache,
  invalidateCache,
};
// feat: add alert routing rules
