import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
import { MODULOS_SIN_BACKEND } from "@/lib/disponibilidad";
import { AdminValoresPageActiva } from "./AdminValoresPageActiva";

// S-41 sigue degradada: `ValorReferenciaAdminResource`
// (`/admin/valores-referencia`) sí existe en el backend (plan 079) y
// `AdminValoresPageActiva` ya lo consume, pero el gate `admin-valores` sigue
// en `MODULOS_SIN_BACKEND`. Vaciarlo es alcance del plan 081, no de éste
// (mismo patrón que 077/078). Ojo: los *parámetros* de sistema son otra
// pantalla y esos sí están encendidos — ver AdminParametrosPage.
export function AdminValoresPage() {
  if (MODULOS_SIN_BACKEND.has("admin-valores")) {
    return (
      <>
        <EncabezadoPagina titulo="Valores de referencia" />
        <ModuloNoDisponible
          modulo="La tabla de valores de referencia"
          descripcion="El servidor no expone todavía los valores de referencia del sistema."
        />
      </>
    );
  }
  return <AdminValoresPageActiva />;
}
