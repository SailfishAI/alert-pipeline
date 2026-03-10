import { gql } from '@apollo/client';

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    dashboardStats {
      totalAlerts
      firingAlerts
      openIncidents
      avgTtaMinutes
      avgTtrMinutes
      alertsBySource {
        source
        count
      }
    }
  }
`;

export const GET_RECENT_ALERTS = gql`
  query GetRecentAlerts {
    recentAlerts {
      id
      name
      description
      severity
      status
      condition {
        metric
        operator
        threshold
        duration
      }
      labels
      enabled
      lastFiredAt
      fireCount
      createdAt
      updatedAt
    }
  }
`;

export const GET_METRICS_TIMESERIES = gql`
  query GetMetricsTimeseries($timeRange: String!) {
    metricsTimeseries(timeRange: $timeRange) {
      alertsOverTime {
        timestamp
        value
      }
      incidentsOverTime {
        timestamp
        value
      }
      notificationsSent {
        timestamp
        value
      }
    }
  }
`;

export const GET_ALERTS = gql`
  query GetAlerts(
    $page: Int
    $limit: Int
    $severity: String
    $status: String
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    alerts(
      page: $page
      limit: $limit
      severity: $severity
      status: $status
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      data {
        id
        name
        description
        severity
        status
        condition {
          metric
          operator
          threshold
          duration
        }
        labels
        enabled
        lastFiredAt
        lastResolvedAt
        fireCount
        createdAt
        updatedAt
      }
      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

export const GET_ALERT = gql`
  query GetAlert($id: ID!) {
    alert(id: $id) {
      id
      name
      description
      severity
      status
      condition {
        metric
        operator
        threshold
        duration
      }
      labels
      notificationChannelIds
      enabled
      lastFiredAt
      lastResolvedAt
      silencedUntil
      fireCount
      createdAt
      updatedAt
      incidents {
        id
        title
        status
        severity
        triggeredAt
      }
    }
  }
`;

export const GET_INCIDENTS = gql`
  query GetIncidents($page: Int, $limit: Int, $status: String, $severity: String) {
    incidents(page: $page, limit: $limit, status: $status, severity: $severity) {
      data {
        id
        title
        severity
        status
        triggeredAt
        acknowledgedAt
        resolvedAt
        ttrSeconds
        alert {
          id
          name
        }
      }
      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

export const GET_INCIDENT = gql`
  query GetIncident($id: ID!) {
    incident(id: $id) {
      id
      alertId
      title
      severity
      status
      summary
      rootCause
      assignee
      timeline {
        type
        content
        createdAt
        createdBy
        visibility
      }
      triggeredAt
      acknowledgedAt
      resolvedAt
      closedAt
      ttaSeconds
      ttrSeconds
      labels
      alert {
        id
        name
        severity
        condition {
          metric
          operator
          threshold
        }
      }
    }
  }
`;

export const GET_NOTIFICATION_SETTINGS = gql`
  query GetNotificationSettings {
    notificationSettings {
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

export const GET_GENERAL_SETTINGS = gql`
  query GetGeneralSettings {
    generalSettings {
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

export const GET_INTEGRATION_SETTINGS = gql`
  query GetIntegrationSettings {
    integrationSettings {
      slack {
        enabled
        webhookUrl
        defaultChannel
        mentionOnCritical
        mentionUsers
      }
      pagerDuty {
        enabled
        routingKey
        autoResolve
        escalationPolicy
      }
      email {
        enabled
        smtpHost
        smtpPort
        smtpUser
        fromAddress
        useTls
      }
    }
  }
`;

export const GET_TEAM_MEMBERS = gql`
  query GetTeamMembers {
    teamMembers {
      id
      email
      name
      role
      lastActiveAt
      createdAt
    }
  }
`;
// feat: add service catalog integration
// refactor: use React.lazy for settings tabs

// Added fetchPolicy: 'cache-and-network' for real-time data
