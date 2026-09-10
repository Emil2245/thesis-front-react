import { AdminValoresPageActiva } from "./AdminValoresPageActiva";

// El gate `admin-valores` se retiró en el plan 081: `ValorReferenciaAdminResource`
// (`/admin/valores-referencia`) existe en el backend (plan 079) y esta página
// delega directo en `AdminValoresPageActiva`. Los *parámetros* de sistema son
// otra pantalla — ver AdminParametrosPage.
export function AdminValoresPage() {
  return <AdminValoresPageActiva />;
}
