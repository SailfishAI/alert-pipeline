import { gql } from '@apollo/client';

export const CREATE_ALERT = gql`
  mutation CreateAlert($input: CreateAlertInput!) {
    createAlert(input: $input) {
      id
      name
      severity
      status
      condition {
        metric
        operator
        threshold
        duration
      }
      enabled
      createdAt
    }
  }
`;

export const UPDATE_ALERT = gql`
  mutation UpdateAlert($id: ID!, $input: UpdateAlertInput!) {
    updateAlert(id: $id, input: $input) {
      id
      name
      severity
      status
      condition {
        metric
        operator
        threshold
        duration
      }
      enabled
      updatedAt
    }
  }
`;

export const DELETE_ALERT = gql`
  mutation DeleteAlert($id: ID!) {
    deleteAlert(id: $id) {
      success
    }
  }
`;

export const SILENCE_ALERT = gql`
  mutation SilenceAlert($id: ID!, $duration: Int!) {
    silenceAlert(id: $id, duration: $duration) {
      id
      status
      silencedUntil
    }
  }
`;

export const UPDATE_INCIDENT = gql`
  mutation UpdateIncident($id: ID!, $input: UpdateIncidentInput!) {
    updateIncident(id: $id, input: $input) {
      id
      status
      assignee
      summary
      rootCause
      resolvedAt
      updatedAt
    }
  }
`;

export const ADD_TIMELINE_ENTRY = gql`
  mutation AddTimelineEntry($incidentId: ID!, $input: TimelineEntryInput!) {
    addTimelineEntry(incidentId: $incidentId, input: $input) {
      id
      timeline {
        type
        content
        createdAt
        createdBy
        visibility
      }
    }
  }
`;

export const UPDATE_NOTIFICATION_SETTINGS = gql`
  mutation UpdateNotificationSettings($input: NotificationSettingsInput!) {
    updateNotificationSettings(input: $input) {
      webhookUrl
      authentication
      enableEmailNotifications
      emailRecipients
      enableSlackNotifications
      slackWebhookUrl
      slackChannel
      enablePagerDuty
      pagerDutyRoutingKey
      notifyOnSeverities
      quietHoursEnabled
      quietHoursStart
      quietHoursEnd
      digestEnabled
      digestIntervalMinutes
    }
  }
`;

export const UPDATE_GENERAL_SETTINGS = gql`
  mutation UpdateGeneralSettings($input: GeneralSettingsInput!) {
    updateGeneralSettings(input: $input) {
      organizationName
      defaultSeverity
      alertRetentionDays
      incidentAutoCloseHours
      timezone
      dateFormat
      enableMetricsCollection
      enableAuditLog
    }
  }
`;

export const UPDATE_INTEGRATION_SETTINGS = gql`
  mutation UpdateIntegrationSettings($input: IntegrationSettingsInput!) {
    updateIntegrationSettings(input: $input) {
      slack {
        enabled
        webhookUrl
        defaultChannel
      }
      pagerDuty {
        enabled
        routingKey
      }
      email {
        enabled
        smtpHost
        smtpPort
        fromAddress
      }
    }
  }
`;

export const TEST_INTEGRATION = gql`
  mutation TestIntegration($integration: String!, $config: JSON!) {
    testIntegration(integration: $integration, config: $config) {
      success
      message
    }
  }
`;

export const INVITE_TEAM_MEMBER = gql`
  mutation InviteTeamMember($email: String!, $role: String!) {
    inviteTeamMember(email: $email, role: $role) {
      id
      email
      role
    }
  }
`;

export const REMOVE_TEAM_MEMBER = gql`
  mutation RemoveTeamMember($memberId: ID!) {
    removeTeamMember(memberId: $memberId) {
      success
    }
  }
`;

export const UPDATE_TEAM_MEMBER_ROLE = gql`
  mutation UpdateTeamMemberRole($memberId: ID!, $role: String!) {
    updateTeamMemberRole(memberId: $memberId, role: $role) {
      id
      role
    }
  }
`;
// fix: correct email notification threading
