import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";

// S-42 sigue degradada: no hay recurso de logs de actividad en origin/main. El
// hook que llamaba a `/admin/logs` se borró (plan 050).
//
// Para reactivar cuando exista: quita "admin-logs" de MODULOS_SIN_BACKEND.
export function AdminLogsPage() {
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
