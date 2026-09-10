import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { descargar, getValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { FormatoExportCronograma } from "@/api/contract";
import { cronogramaExportPreflightSchema, validacionPresupuestoSchema } from "@/api/schemas";
import { ApiError } from "@/api/problem";
import { toast } from "sonner";

export function useValidacionExport(presupuestoId: string) {
  return useQuery({
    queryKey: qk.presupuestoValidacion(presupuestoId),
    queryFn: () =>
      getValidado(`/presupuestos/${presupuestoId}/validacion`, validacionPresupuestoSchema),
    enabled: !!presupuestoId,
  });
}

/**
 * `GET /documentos/cronograma/{id}/preflight?formato=` — decide si la descarga
 * va a salir antes de pedirla, y con qué bloqueos si no.
 *
 * `getValidado`, no `get<T>`: la pantalla desreferencia `bloqueos` y `warnings`
 * sin guarda, así que la forma se comprueba en la frontera.
 */
export function usePreflightCronograma(presupuestoId: string, formato: FormatoExportCronograma) {
  return useQuery({
    queryKey: qk.cronogramaExportPreflight(presupuestoId, formato),
    queryFn: () =>
      getValidado(
        `/documentos/cronograma/${presupuestoId}/preflight`,
        cronogramaExportPreflightSchema,
        { formato },
      ),
    enabled: !!presupuestoId,
  });
}

/** jsdom aparte, esto es la única forma de guardar un Blob desde el navegador. */
const guardar = (blob: Blob, nombreArchivo: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  toast.success("Descarga iniciada");
};

/** MSPDI viaja como XML: `.mspdi` no lo produce ningún camino del backend. */
const extensionDe = (formato: FormatoExportCronograma) => (formato === "mspdi" ? "xml" : formato);

/**
 * El backend expone dos documentos: la especificación técnica en DOCX (plan
 * 051) y el cronograma valorizado en XLSX, PDF y MSPDI (plan 031 del backend).
 * El presupuesto y los APUs siguen sin existir en ninguna ruta, así que no hay
 * botón para ellos: uno apagado prometería que llega pronto.
 *
 * `formato` de la ET es opcional y su único valor válido es `docx`, así que no
 * se manda. El del cronograma es obligatorio y uno de tres.
 */
/**
 * ¿Es un error que **el backend** describió, o uno que se inventó el cliente?
 * Cuando el cuerpo no era `{codigo, mensaje}`, `client.ts` sintetiza un
 * `Problem` con `codigo: "sin-respuesta"` y un `mensaje` que viene de axios
 * **en inglés**. Enseñarlo llevaría «Request failed with status code 500» a una
 * UI que es es-EC, así que ahí se usa texto propio. Los dos `catch` de abajo lo
 * comparten y cada uno formatea a su manera.
 */
const esErrorDeContrato = (e: unknown): e is ApiError =>
  e instanceof ApiError && e.problem.codigo !== "sin-respuesta";

export function useExportar() {
  const cliente = useQueryClient();

  const descargarEspecificacionesTecnicas = useCallback(async (presupuestoId: string) => {
    try {
      // Sin `formato`: es opcional en `DocumentoResource` (sólo valida si
      // llega) y su único valor admitido es `docx`. Mandarlo era contradecir el
      // comentario de arriba y el propio contrato.
      const { blob, nombreArchivo } = await descargar(
        `/documentos/especificaciones-tecnicas/${presupuestoId}`,
      );
      guardar(blob, nombreArchivo ?? "especificaciones-tecnicas.docx");
    } catch (e) {
      toast.error(
        esErrorDeContrato(e) ? `${e.problem.codigo}: ${e.problem.mensaje}` : "Error al descargar",
      );
    }
  }, []);

  const descargarCronograma = useCallback(
    async (presupuestoId: string, formato: FormatoExportCronograma) => {
      try {
        const { blob, nombreArchivo } = await descargar(`/documentos/cronograma/${presupuestoId}`, {
          formato,
        });
        guardar(blob, nombreArchivo ?? `cronograma.${extensionDe(formato)}`);
      } catch (e) {
        // El 409 `export-bloqueado` trae el recuento de bloqueos en `mensaje`:
        // decírselo al usuario es más útil que un genérico, y significa además
        // que el preflight que la pantalla enseña ya no vale.
        toast.error(esErrorDeContrato(e) ? e.problem.mensaje : "Error al descargar");
        if (e instanceof ApiError && e.status === 409) {
          await cliente.invalidateQueries({
            queryKey: qk.cronogramaExportPreflight(presupuestoId, formato),
          });
        }
      }
    },
    [cliente],
  );

  return { descargarEspecificacionesTecnicas, descargarCronograma };
}
