import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";

// S-41 (valores de referencia) sigue degradada: no hay recurso
// `/admin/valores-referencia` en origin/main. El hook se borró (plan 050).
// Ojo: los *parámetros* de sistema son otra pantalla y esos sí existen, en el
// recurso de proyectos — ver AdminParametrosPage.
//
// Para reactivar cuando exista: quita "admin-valores" de MODULOS_SIN_BACKEND.
export function AdminValoresPage() {
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
