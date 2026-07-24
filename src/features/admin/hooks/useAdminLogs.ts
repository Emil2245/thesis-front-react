import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { LogActividadResponse, Page } from "@/api/contract";

export function useAdminLogs(filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.adminLogs(filtros),
    queryFn: () => get<Page<LogActividadResponse>>("/admin/logs", filtros),
  });
}
