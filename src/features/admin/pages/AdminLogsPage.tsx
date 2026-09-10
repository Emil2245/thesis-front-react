import { AdminLogsPageActiva } from "./AdminLogsPageActiva";

// El gate `admin-logs` se retiró en el plan 081: `LogActividadResource`
// (`/admin/logs`) existe en el backend (plan 080) y esta página delega
// directo en `AdminLogsPageActiva`.
export function AdminLogsPage() {
  return <AdminLogsPageActiva />;
}
