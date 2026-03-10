import { Sequelize, Options } from 'sequelize';
import { logger } from '../utils/logger';

const defaultConfig: Options = {
  dialect: 'postgres',
  logging: (msg: string) => logger.debug(msg),
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
    evict: 1000,
  },
  define: {
    timestamps: true,
    underscored: false,
  },
  retry: {
    max: 3,
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
    ],
  },
};

function buildConfig(): Options {
  const env = process.env.NODE_ENV || 'development';

  const envConfigs: Record<string, Partial<Options>> = {
    development: {
      logging: (msg: string) => logger.debug(msg),
    },
    test: {
      logging: false,
      pool: { max: 5, min: 1, acquire: 30000, idle: 10000 },
    },
    production: {
      logging: false,
      pool: { max: 50, min: 10, acquire: 60000, idle: 10000 },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        },
        statement_timeout: 30000,
        idle_in_transaction_session_timeout: 60000,
      },
    },
  };

  return { ...defaultConfig, ...envConfigs[env] };
}

const databaseUrl = process.env.DATABASE_URL || 'postgres://alertpipeline:devpassword@localhost:5432/alertpipeline';
const config = buildConfig();
const sequelize = new Sequelize(databaseUrl, config);

async function testConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error });
    return false;
  }
}

async function gracefulShutdown(): Promise<void> {
  try {
    await sequelize.close();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', { error });
  }
}

export { sequelize, testConnection, gracefulShutdown, buildConfig };
// chore: add prettier configuration
