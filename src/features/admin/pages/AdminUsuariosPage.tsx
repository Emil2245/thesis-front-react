import { AdminUsuariosPageActiva } from "./AdminUsuariosPageActiva";

// El gate `admin-usuarios` se retiró en el plan 081: `UsuarioAdminResource`
// (`/admin/usuarios`) existe en el backend (plan 077) y esta página delega
// directo en `AdminUsuariosPageActiva`.
export function AdminUsuariosPage() {
  return <AdminUsuariosPageActiva />;
}
