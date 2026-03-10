import winston from 'winston';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

const sensitiveFields = ['password', 'secret', 'token', 'authorization', 'cookie', 'apiKey'];

function redactSensitiveData(info: winston.Logform.TransformableInfo): winston.Logform.TransformableInfo {
  const cleaned = { ...info };

  for (const key of Object.keys(cleaned)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      cleaned[key] = '[REDACTED]';
    }
    if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
      cleaned[key] = redactObject(cleaned[key]);
    }
  }

  return cleaned;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const transports: winston.transport[] = [];

if (NODE_ENV === 'production') {
  transports.push(
    new winston.transports.Console({ format: jsonFormat }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: jsonFormat,
      maxsize: 50 * 1024 * 1024,
      maxFiles: 10,
    })
  );
} else {
  transports.push(
    new winston.transports.Console({ format: consoleFormat })
  );
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'alert-pipeline' },
  format: winston.format((info) => redactSensitiveData(info))(),
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

function createChildLogger(context: Record<string, unknown>): winston.Logger {
  return logger.child(context);
}

export { logger, createChildLogger };
// Add audit log for settings changes
