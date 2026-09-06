import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { get, descargar } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ValidacionPresupuestoResponse } from "@/api/contract";
import { toast } from "sonner";

export function useValidacionExport(presupuestoId: string) {
  return useQuery({
    queryKey: qk.presupuestoValidacion(presupuestoId),
    queryFn: () => get<ValidacionPresupuestoResponse>(`/presupuestos/${presupuestoId}/validacion`),
    enabled: !!presupuestoId,
  });
}

/**
 * El backend expone un único documento (plan 051): la especificación técnica en
 * DOCX. Las opciones de presupuesto PDF/Excel, APUs y cronograma que vivían aquí
 * apuntaban a rutas que no existen; se borraron en vez de redirigirlas, porque
 * un botón «PDF» que descarga un DOCX miente más que la ausencia del botón.
 *
 * `formato` es opcional y su único valor válido es `docx`, así que no se manda.
 * `titulo1`/`titulo2` alimentan la portada y tampoco se mandan: la pantalla no
 * los pide, y una cadena vacía no equivale a omitir el parámetro.
 */
export function useExportar() {
  const descargarEspecificacionesTecnicas = useCallback(async (presupuestoId: string) => {
    try {
      const { blob, nombreArchivo } = await descargar(
        `/documentos/especificaciones-tecnicas/${presupuestoId}`,
      );
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = nombreArchivo ?? "especificaciones-tecnicas.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("Descarga iniciada");
    } catch {
      toast.error("Error al descargar");
    }
  }, []);

  return { descargarEspecificacionesTecnicas };
}
