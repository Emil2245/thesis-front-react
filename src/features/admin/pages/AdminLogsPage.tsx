import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
import { MODULOS_SIN_BACKEND } from "@/lib/disponibilidad";
import { AdminLogsPageActiva } from "./AdminLogsPageActiva";

// S-42 sigue degradada: `LogActividadResource` (`/admin/logs`) sí existe en
// el backend (plan 080) y `AdminLogsPageActiva` ya lo consume, pero el gate
// `admin-logs` sigue en `MODULOS_SIN_BACKEND`. Vaciarlo es alcance del plan
// 081, no de éste (mismo patrón que 077/078/079).
export function AdminLogsPage() {
  if (MODULOS_SIN_BACKEND.has("admin-logs")) {
    return (
      <>
        <EncabezadoPagina titulo="Registro de actividades" />
        <ModuloNoDisponible
          modulo="El registro de actividades"
          descripcion="El servidor no expone todavía el registro de actividades del sistema."
        />
      </>
    );
  }
  return <AdminLogsPageActiva />;
}
