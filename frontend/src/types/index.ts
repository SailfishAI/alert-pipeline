export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertStatus = 'active' | 'firing' | 'resolved' | 'silenced';

export type IncidentStatus = 'triggered' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';

export type AlertConditionOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';

export interface AlertCondition {
  metric: string;
  operator: AlertConditionOperator;
  threshold: number;
  duration?: number;
}

export interface Alert {
  id: string;
  name: string;
  description: string | null;
  severity: Severity;
  status: AlertStatus;
  condition: AlertCondition;
  labels: Record<string, string>;
  notificationChannelIds: string[];
  enabled: boolean;
  lastFiredAt: string | null;
  lastResolvedAt: string | null;
  silencedUntil: string | null;
  fireCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  incidents?: Incident[];
}

export interface TimelineEntry {
  type: 'comment' | 'status_change' | 'action' | 'escalation';
  content: string;
  createdAt: string;
  createdBy: string;
  visibility: 'public' | 'internal';
}

export interface Incident {
  id: string;
  alertId: string;
  title: string;
  severity: Exclude<Severity, 'info'>;
  status: IncidentStatus;
  summary: string | null;
  rootCause: string | null;
  assignee: string | null;
  timeline: TimelineEntry[];
  triggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  ttaSeconds: number | null;
  ttrSeconds: number | null;
  labels: Record<string, string>;
  alert?: Pick<Alert, 'id' | 'name' | 'severity'>;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description: string | null;
  config: {
    type: 'email' | 'slack' | 'pagerduty' | 'webhook';
    [key: string]: unknown;
  };
  enabled: boolean;
  lastSentAt: string | null;
  totalSent: number;
  failureCount: number;
  lastError: string | null;
}

export interface Webhook {
  id: string;
  externalId: string;
  name: string;
  source: 'prometheus' | 'datadog' | 'cloudwatch' | 'grafana' | 'custom';
  description: string | null;
  enabled: boolean;
  lastReceivedAt: string | null;
  totalReceived: number;
  ingestUrl?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  totalAlerts: number;
  firingAlerts: number;
  openIncidents: number;
  avgTtaMinutes: number | null;
  avgTtrMinutes: number | null;
  alertsBySource: Array<{ source: string; count: number }>;
}

export interface NotificationSettings {
  webhookUrl: string | null;
  authentication: string;
  enableEmailNotifications: boolean;
  emailRecipients: string[];
  enableSlackNotifications: boolean;
  slackWebhookUrl: string | null;
  slackChannel: string;
  enablePagerDuty: boolean;
  pagerDutyRoutingKey: string | null;
  notifyOnSeverities: string[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  digestEnabled: boolean;
  digestIntervalMinutes: number;
}
// refactor: split routes into versioned modules
// fix: resolve metric label collision
