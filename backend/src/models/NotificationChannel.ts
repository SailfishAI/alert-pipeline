import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface EmailConfig {
  type: 'email';
  recipients: string[];
  smtpHost?: string;
  smtpPort?: number;
}

interface SlackConfig {
  type: 'slack';
  webhookUrl: string;
  channel?: string;
  mentionUsers?: string[];
}

interface PagerDutyConfig {
  type: 'pagerduty';
  routingKey: string;
  severity?: 'critical' | 'error' | 'warning' | 'info';
}

interface WebhookChannelConfig {
  type: 'webhook';
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  authentication?: {
    type: 'none' | 'bearer' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
}

type ChannelConfig = EmailConfig | SlackConfig | PagerDutyConfig | WebhookChannelConfig;

interface NotificationChannelAttributes {
  id: string;
  name: string;
  description: string | null;
  config: ChannelConfig;
  enabled: boolean;
  lastSentAt: Date | null;
  totalSent: number;
  failureCount: number;
  lastError: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type NotificationChannelCreationAttributes = Optional<
  NotificationChannelAttributes,
  'id' | 'description' | 'lastSentAt' | 'totalSent' | 'failureCount' | 'lastError' | 'createdAt' | 'updatedAt'
>;

class NotificationChannel
  extends Model<NotificationChannelAttributes, NotificationChannelCreationAttributes>
  implements NotificationChannelAttributes
{
  declare id: string;
  declare name: string;
  declare description: string | null;
  declare config: ChannelConfig;
  declare enabled: boolean;
  declare lastSentAt: Date | null;
  declare totalSent: number;
  declare failureCount: number;
  declare lastError: string | null;
  declare createdBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  isHealthy(): boolean {
    return this.enabled && this.failureCount < 5;
  }

  getChannelType(): string {
    return this.config.type;
  }
}

NotificationChannel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalSent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failureCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'notification_channels',
    timestamps: true,
    indexes: [
      { fields: ['enabled'] },
      { fields: ['createdBy'] },
    ],
  }
);

export {
  NotificationChannel,
  NotificationChannelAttributes,
  NotificationChannelCreationAttributes,
  ChannelConfig,
  EmailConfig,
  SlackConfig,
  PagerDutyConfig,
  WebhookChannelConfig,
};
// feat: add custom dashboard widgets API
// refactor: extract common table component
