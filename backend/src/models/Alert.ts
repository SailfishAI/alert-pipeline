import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
  duration?: number;
}

interface AlertAttributes {
  id: string;
  name: string;
  description: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'active' | 'firing' | 'resolved' | 'silenced';
  condition: AlertCondition;
  labels: Record<string, string>;
  notificationChannelIds: string[];
  enabled: boolean;
  lastFiredAt: Date | null;
  lastResolvedAt: Date | null;
  silencedUntil: Date | null;
  fireCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type AlertCreationAttributes = Optional<
  AlertAttributes,
  'id' | 'description' | 'labels' | 'notificationChannelIds' | 'lastFiredAt' | 'lastResolvedAt' | 'silencedUntil' | 'fireCount' | 'createdAt' | 'updatedAt'
>;

class Alert extends Model<AlertAttributes, AlertCreationAttributes> implements AlertAttributes {
  declare id: string;
  declare name: string;
  declare description: string | null;
  declare severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  declare status: 'active' | 'firing' | 'resolved' | 'silenced';
  declare condition: AlertCondition;
  declare labels: Record<string, string>;
  declare notificationChannelIds: string[];
  declare enabled: boolean;
  declare lastFiredAt: Date | null;
  declare lastResolvedAt: Date | null;
  declare silencedUntil: Date | null;
  declare fireCount: number;
  declare createdBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  isSilenced(): boolean {
    if (this.status !== 'silenced' || !this.silencedUntil) return false;
    return new Date() < this.silencedUntil;
  }

  shouldNotify(): boolean {
    return this.enabled && !this.isSilenced() && this.notificationChannelIds.length > 0;
  }
}

Alert.init(
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
    severity: {
      type: DataTypes.ENUM('critical', 'high', 'medium', 'low', 'info'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'firing', 'resolved', 'silenced'),
      allowNull: false,
      defaultValue: 'active',
    },
    condition: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    labels: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    notificationChannelIds: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastFiredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastResolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    silencedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fireCount: {
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
    tableName: 'alerts',
    timestamps: true,
    indexes: [
      { fields: ['severity'] },
      { fields: ['status'] },
      { fields: ['enabled'] },
      { fields: ['createdBy'] },
    ],
  }
);

export { Alert, AlertAttributes, AlertCreationAttributes, AlertCondition };
// Add Slack notification channel
