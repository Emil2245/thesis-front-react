import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
import { MODULOS_SIN_BACKEND } from "@/lib/disponibilidad";
import { AdminPlantillasPageActiva } from "./AdminPlantillasPageActiva";

// S-40 sigue degradada: `PlantillaApuAdminResource` (`/admin/plantillas-apu`)
// sí existe en el backend (plan 078) y `AdminPlantillasPageActiva` ya lo
// consume, pero el gate `admin-plantillas` sigue en `MODULOS_SIN_BACKEND`.
// Vaciarlo es alcance del plan 081, no de éste (mismo patrón que 077/§1).
export function AdminPlantillasPage() {
  if (MODULOS_SIN_BACKEND.has("admin-plantillas")) {
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
  return <AdminPlantillasPageActiva />;
}
