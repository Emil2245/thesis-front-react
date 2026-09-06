import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";

// S-37 sigue degradada: en origin/main no existe ningún recurso de usuarios de
// admin. `PUT /admin/usuarios/{id}`, `POST /{id}/reactivar` y
// `POST /{id}/desactivar` tampoco: viven solo en la rama test/stuff, que no se
// mergea. Los hooks que apuntaban ahí se borraron (plan 050) en vez de dejarse
// como código que el próximo agente creería funcional.
//
// Para reactivar cuando exista el backend: quita "admin-usuarios" de
// MODULOS_SIN_BACKEND y escribe la pantalla contra el contrato real.
//
// Anotado y no construido: `POST /auth/aceptar-invitacion` sí existe en main,
// pero su flujo arranca en esta pantalla, que no existe.
export function AdminUsuariosPage() {
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
