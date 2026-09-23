import { useParams } from "react-router-dom";
import { useSesionStore } from "@/features/auth/sesion";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TablaInsumos } from "../components/TablaInsumos";

/**
 * Sólo el catálogo del proyecto. Las bases de sistema y las personales se
 * consultan en la sección global `/insumos`; para traerlas al proyecto está
 * «Copiar base» dentro de la tabla.
 */
export function InsumosPage() {
  const { id } = useParams();
  const proyectoId = id ?? "";
  const cargando = useSesionStore((s) => s.cargando);

  if (cargando) return <CargandoTabla />;

  return (
    <>
      <EncabezadoPagina titulo="Insumos del proyecto" />
      <TablaInsumos proyectoId={proyectoId} />
    </>
  );
}
