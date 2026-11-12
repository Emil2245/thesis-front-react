import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { FormatoExportCronograma } from "@/api/contract";
import {
  cronogramaExportPreflightSchema,
  documentoPreflightSchema,
  validacionPresupuestoSchema,
} from "@/api/schemas";
import { ApiError } from "@/api/problem";
import { toast } from "sonner";
import {
  CronogramaBloqueadoError,
  generarClaveExportacion,
  navegarDescarga,
  solicitarExportacion,
} from "@/api/exportaciones";

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

export type OpcionesPresupuesto =
  | { formato: "xlsx"; orientacion?: never; layout?: never }
  | { formato: "pdf"; orientacion?: "vertical" | "horizontal"; layout?: never };

export type OpcionesApus =
  | { formato: "xlsx"; layout?: "pestanas" | "apilado"; orientacion?: never }
  | { formato: "pdf"; layout?: never; orientacion?: never };

/** Copia las opciones compatibles antes del primer await; no inserta defaults. */
const parametrosDocumento = (
  documento: "presupuesto" | "apus",
  opciones: OpcionesPresupuesto | OpcionesApus,
): Record<string, string> => {
  if (!opciones || (opciones.formato !== "xlsx" && opciones.formato !== "pdf")) {
    throw new TypeError("Formato de documento inválido");
  }
  const opcion =
    documento === "presupuesto" && opciones.formato === "pdf"
      ? "orientacion"
      : documento === "apus" && opciones.formato === "xlsx"
        ? "layout"
        : undefined;
  if (Object.keys(opciones).some((key) => key !== "formato" && key !== opcion)) {
    throw new TypeError("Opción incompatible con el documento y formato");
  }
  const params: Record<string, string> = { formato: opciones.formato };
  const valor = opcion === "orientacion" ? opciones.orientacion : opciones.layout;
  if (opcion && valor !== undefined) {
    const valores = opcion === "orientacion" ? ["vertical", "horizontal"] : ["pestanas", "apilado"];
    if (!valores.includes(valor)) throw new TypeError("Opción de documento inválida");
    params[opcion] = valor;
  }
  return params;
};
/** Contrato público UuidV7.parse: versión 7 y variante RFC 4122, sin validar dominio. */
const esUuidV7 = (id: unknown): id is string =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export type ContextoPreflightDocumento = { presupuestoId?: string | null } & (
  | { documento: "presupuesto"; opciones: OpcionesPresupuesto }
  | { documento: "apus"; opciones: OpcionesApus }
);

/** Cada render conserva su contexto, incluso si la descarga termina tras cambiar selección. */
export function usePreflightDocumento(contexto: ContextoPreflightDocumento) {
  const cliente = useQueryClient();
  const { presupuestoId, documento } = contexto;
  const { formato: formatoParam, ...opciones } = parametrosDocumento(documento, contexto.opciones);
  const formato = formatoParam === "pdf" ? "pdf" : "xlsx";
  const queryKey = qk.documentos.preflight(presupuestoId, documento, formato, opciones);
  const efectivas = queryKey[5];
  const params = Object.freeze({ formato, ...efectivas });
  const valido = esUuidV7(presupuestoId);
  const query = useQuery({
    queryKey,
    enabled: valido,
    placeholderData: undefined,
    queryFn: async () => {
      // También protege llamadas manuales a refetch sobre un contexto deshabilitado.
      if (!valido) throw new TypeError("UUID de presupuesto inválido");
      const respuesta = await getValidado(
        `/documentos/${documento}/${presupuestoId}/preflight`,
        documentoPreflightSchema,
        params,
      );
      if (
        respuesta.presupuestoId !== presupuestoId ||
        respuesta.documento !== documento ||
        respuesta.formato !== formato ||
        Object.keys(respuesta.opciones).length !== Object.keys(efectivas).length ||
        Object.entries(respuesta.opciones).some(([key, value]) => efectivas[key] !== value)
      ) {
        throw new TypeError("El preflight no corresponde al contexto solicitado");
      }
      return respuesta;
    },
  });
  // No observer.refetch: ese observer puede estar siguiendo otra selección al resolver el 409.
  const invalidar = (): Promise<void> => cliente.invalidateQueries({ queryKey, exact: true });
  return { ...query, data: valido ? query.data : undefined, invalidar };
}

/**
 * ¿Es un error que **el backend** describió, o uno que se inventó el cliente?
 * Cuando el cuerpo no era `{codigo, mensaje}`, `client.ts` sintetiza un
 * `Problem` con `codigo: "sin-respuesta"` y un `mensaje` que viene de axios
 * **en inglés**. Enseñarlo llevaría «Request failed with status code 500» a una
 * UI que es es-EC, así que ahí se usa texto propio (el `catch` del cronograma).
 */
const esErrorDeContrato = (e: unknown): e is ApiError =>
  e instanceof ApiError && e.problem.codigo !== "sin-respuesta";

export function useExportar() {
  const cliente = useQueryClient();
  const [descargando, setDescargando] = useState(false);
  const descargaEnCurso = useRef(false);
  const claves = useRef(new Map<string, string>());

  const exportarPrivado = useCallback(
    async (
      documento: "presupuesto" | "apus" | "especificaciones-tecnicas" | "cronograma",
      presupuestoId: string,
      opciones: Record<string, string | undefined>,
    ) => {
      if (!esUuidV7(presupuestoId) || descargaEnCurso.current) return;
      const body = Object.fromEntries(
        Object.entries(opciones).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      );
      const identidad = JSON.stringify([documento, presupuestoId, body]);
      let clave = claves.current.get(identidad);
      if (!clave) {
        clave = generarClaveExportacion();
        claves.current.set(identidad, clave);
      }
      descargaEnCurso.current = true;
      setDescargando(true);
      try {
        const respuesta = await solicitarExportacion(
          `/documentos/${documento}/${presupuestoId}/exportaciones`,
          body,
          clave,
        );
        navegarDescarga(respuesta.downloadUrl);
        return respuesta;
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.problem.codigo === "idempotencia-conflicto" ||
            error.problem.codigo === "exportacion-expirada")
        ) {
          claves.current.delete(identidad);
        }
        throw error;
      } finally {
        descargaEnCurso.current = false;
        setDescargando(false);
      }
    },
    [],
  );

  const descargarCronograma = useCallback(
    async (presupuestoId: string, formato: FormatoExportCronograma, papel?: "a4" | "a3") => {
      try {
        const respuesta = await exportarPrivado("cronograma", presupuestoId, {
          formato,
          ...(formato === "pdf" && papel !== undefined ? { papel } : {}),
        });
        respuesta?.warnings.forEach((warning) => {
          if ("detalle" in warning) toast.warning(warning.detalle, { duration: Infinity });
        });
      } catch (e) {
        // El 409 `export-bloqueado` trae el recuento de bloqueos en `mensaje`:
        // decírselo al usuario es más útil que un genérico, y significa además
        // que el preflight que la pantalla enseña ya no vale.
        toast.error(
          e instanceof CronogramaBloqueadoError
            ? e.detalle.mensaje
            : esErrorDeContrato(e)
              ? e.problem.mensaje
              : "Error al descargar",
        );
        if (e instanceof CronogramaBloqueadoError) {
          await cliente.invalidateQueries({
            queryKey: qk.cronogramaExportPreflight(presupuestoId, formato),
            exact: true,
          });
        }
      }
    },
    [cliente, exportarPrivado],
  );

  return {
    exportarPrivado,
    descargarCronograma,
    descargando,
  };
}
