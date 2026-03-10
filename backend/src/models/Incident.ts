import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface TimelineEntry {
  type: 'comment' | 'status_change' | 'action' | 'escalation';
  content: string;
  createdAt: string;
  createdBy: string;
  visibility: 'public' | 'internal';
}

interface IncidentAttributes {
  id: string;
  alertId: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'triggered' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';
  summary: string | null;
  rootCause: string | null;
  assignee: string | null;
  timeline: TimelineEntry[];
  triggeredAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  ttaSeconds: number | null;
  ttrSeconds: number | null;
  labels: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

type IncidentCreationAttributes = Optional<
  IncidentAttributes,
  | 'id'
  | 'summary'
  | 'rootCause'
  | 'assignee'
  | 'timeline'
  | 'acknowledgedAt'
  | 'resolvedAt'
  | 'closedAt'
  | 'ttaSeconds'
  | 'ttrSeconds'
  | 'labels'
  | 'createdAt'
  | 'updatedAt'
>;

class Incident extends Model<IncidentAttributes, IncidentCreationAttributes> implements IncidentAttributes {
  declare id: string;
  declare alertId: string;
  declare title: string;
  declare severity: 'critical' | 'high' | 'medium' | 'low';
  declare status: 'triggered' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';
  declare summary: string | null;
  declare rootCause: string | null;
  declare assignee: string | null;
  declare timeline: TimelineEntry[];
  declare triggeredAt: Date;
  declare acknowledgedAt: Date | null;
  declare resolvedAt: Date | null;
  declare closedAt: Date | null;
  declare ttaSeconds: number | null;
  declare ttrSeconds: number | null;
  declare labels: Record<string, string>;
  declare createdAt: Date;
  declare updatedAt: Date;

  getDuration(): number | null {
    if (!this.resolvedAt) return null;
    return Math.floor((this.resolvedAt.getTime() - this.triggeredAt.getTime()) / 1000);
  }

  isOpen(): boolean {
    return !['resolved', 'closed'].includes(this.status);
  }
}

Incident.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    alertId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'alerts', key: 'id' },
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('critical', 'high', 'medium', 'low'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('triggered', 'acknowledged', 'investigating', 'resolved', 'closed'),
      allowNull: false,
      defaultValue: 'triggered',
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rootCause: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assignee: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    timeline: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    triggeredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    acknowledgedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ttaSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ttrSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    labels: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'incidents',
    timestamps: true,
    indexes: [
      { fields: ['alertId'] },
      { fields: ['status'] },
      { fields: ['severity'] },
      { fields: ['triggeredAt'] },
      { fields: ['assignee'] },
    ],
  }
);

export { Incident, IncidentAttributes, IncidentCreationAttributes, TimelineEntry };

// Auto-escalate severity if incident duration exceeds threshold
