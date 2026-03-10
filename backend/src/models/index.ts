import { Alert } from './Alert';
import { Webhook } from './Webhook';
import { NotificationChannel } from './NotificationChannel';
import { Incident } from './Incident';

Alert.hasMany(Incident, { foreignKey: 'alertId', as: 'incidents' });
Incident.belongsTo(Alert, { foreignKey: 'alertId', as: 'alert' });

export { Alert, Webhook, NotificationChannel, Incident };
export { AlertAttributes, AlertCreationAttributes, AlertCondition } from './Alert';
export { WebhookAttributes, WebhookCreationAttributes, WebhookAuthentication } from './Webhook';
export {
  NotificationChannelAttributes,
  NotificationChannelCreationAttributes,
  ChannelConfig,
} from './NotificationChannel';
export { IncidentAttributes, IncidentCreationAttributes, TimelineEntry } from './Incident';
