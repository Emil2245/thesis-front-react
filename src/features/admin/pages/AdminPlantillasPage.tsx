import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";

// S-40 sigue degradada: no hay recurso de plantillas de sistema bajo /admin en
// origin/main. El hook que llamaba a `/admin/plantillas` se borró (plan 050).
//
// Para reactivar cuando exista: quita "admin-plantillas" de MODULOS_SIN_BACKEND.
export function AdminPlantillasPage() {
  return (
    <>
      <EncabezadoPagina titulo="Plantillas del sistema" />
      <ModuloNoDisponible
        modulo="La gestión de plantillas del sistema"
        descripcion="El servidor no expone todavía las plantillas de sistema."
      />
    </>
  );
}
