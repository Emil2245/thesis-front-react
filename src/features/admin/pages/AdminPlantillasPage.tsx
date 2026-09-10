import { AdminPlantillasPageActiva } from "./AdminPlantillasPageActiva";

// El gate `admin-plantillas` se retiró en el plan 081: `PlantillaApuAdminResource`
// (`/admin/plantillas-apu`) existe en el backend (plan 078) y esta página
// delega directo en `AdminPlantillasPageActiva`.
export function AdminPlantillasPage() {
  return <AdminPlantillasPageActiva />;
}
