import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
import { MODULOS_SIN_BACKEND } from "@/lib/disponibilidad";
import { AdminUsuariosPageActiva } from "./AdminUsuariosPageActiva";

// S-37 sigue degradada: `UsuarioAdminResource` (`/admin/usuarios`) sí existe
// en el backend (plan 077) y `AdminUsuariosPageActiva` ya lo consume, pero el
// gate `admin-usuarios` sigue en `MODULOS_SIN_BACKEND`. Vaciarlo es alcance
// del plan 081, no de éste (§1/§14 del plan 077).
export function AdminUsuariosPage() {
  if (MODULOS_SIN_BACKEND.has("admin-usuarios")) {
    return (
      <>
        <EncabezadoPagina titulo="Usuarios" />
        <ModuloNoDisponible
          modulo="La administración de usuarios"
          descripcion="El servidor no expone todavía la administración de usuarios."
        />
      </>
    );
  }
  return <AdminUsuariosPageActiva />;
}
