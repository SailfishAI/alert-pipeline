import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface WebhookAuthentication {
  type: 'none' | 'bearer' | 'basic' | 'hmac';
  secret?: string;
  username?: string;
  password?: string;
}

interface WebhookAttributes {
  id: string;
  externalId: string;
  name: string;
  source: 'prometheus' | 'datadog' | 'cloudwatch' | 'grafana' | 'custom';
  description: string | null;
  authentication: WebhookAuthentication | null;
  transformTemplate: string | null;
  enabled: boolean;
  lastReceivedAt: Date | null;
  totalReceived: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type WebhookCreationAttributes = Optional<
  WebhookAttributes,
  'id' | 'description' | 'authentication' | 'transformTemplate' | 'lastReceivedAt' | 'totalReceived' | 'createdAt' | 'updatedAt'
>;

class Webhook extends Model<WebhookAttributes, WebhookCreationAttributes> implements WebhookAttributes {
  declare id: string;
  declare externalId: string;
  declare name: string;
  declare source: 'prometheus' | 'datadog' | 'cloudwatch' | 'grafana' | 'custom';
  declare description: string | null;
  declare authentication: WebhookAuthentication | null;
  declare transformTemplate: string | null;
  declare enabled: boolean;
  declare lastReceivedAt: Date | null;
  declare totalReceived: number;
  declare createdBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  isActive(): boolean {
    return this.enabled && this.lastReceivedAt !== null;
  }

  getIngestPath(): string {
    return `/api/webhooks/ingest/${this.externalId}`;
  }
}

Webhook.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    externalId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    source: {
      type: DataTypes.ENUM('prometheus', 'datadog', 'cloudwatch', 'grafana', 'custom'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    authentication: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    transformTemplate: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastReceivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalReceived: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'webhooks',
    timestamps: true,
    indexes: [
      { fields: ['externalId'], unique: true },
      { fields: ['source'] },
      { fields: ['enabled'] },
    ],
  }
);

export { Webhook, WebhookAttributes, WebhookCreationAttributes, WebhookAuthentication };
// Fix pagination in alert list
