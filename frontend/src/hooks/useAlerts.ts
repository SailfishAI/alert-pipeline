import { useQuery } from '@apollo/client';
import { GET_ALERTS } from '../graphql/queries';
import { Alert, Severity, AlertStatus, Pagination } from '../types';

interface UseAlertsParams {
  severity?: Severity;
  status?: AlertStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface AlertsQueryResult {
  alerts: {
    data: Alert[];
    pagination: Pagination;
  };
}

interface UseAlertsReturn {
  alerts: Alert[];
  pagination: Pagination | null;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useAlerts(params: UseAlertsParams = {}): UseAlertsReturn {
  const {
    severity,
    status,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = params;

  const { data, loading, error, refetch } = useQuery<AlertsQueryResult>(GET_ALERTS, {
    variables: {
      page,
      limit,
      severity,
      status,
      search,
      sortBy,
      sortOrder,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,
  });

  return {
    alerts: data?.alerts.data || [],
    pagination: data?.alerts.pagination || null,
    loading,
    error: error as Error | undefined,
    refetch,
  };
}
// feat: add alert suppression rules
