import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getValidado, patchValidado, postValidado, putValidado, delValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { asDecimal, parsearEntradaDecimal, type Decimal } from "@/lib/decimal";
import { celdaCantidadSchema, celdaRendimientoSchema, precioOverrideSchema } from "../schemas";
import type {
  ApuResponse,
  ApuDetalleResponse,
  SeccionTipo,
  ApuPatchRequest,
  ApuDetallePatchRequest,
  ApuDetalleCrearRequest,
} from "@/api/contract";
import { ApiError } from "@/api/problem";
import { apuSchema, especificacionTecnicaSchema } from "@/api/schemas";

export type EstadoCelda = "estable" | "pendiente" | "error";

export type CampoCelda = "cantidad" | "rendimiento" | "precioOverride";

/** Mensajes por celda, no por fila: la edición de cantidad no debe filtrar su
 *  texto de error a las celdas vecinas. Se limpian individualmente en cuanto la
 *  celda vuelve a "estable". */
export interface MensajesValidacion {
  cantidad?: string;
  rendimiento?: string;
  precioOverride?: string;
}

export interface FilaEditor {
  detalle: ApuDetalleResponse;
  protegida: boolean;
  heredado: boolean;
  /** Estado agregado de la fila (peor celda). Se usa sólo para colorear el fondo
   *  de la fila; los iconos y mensajes accesibles son por celda. */
  estado: EstadoCelda;
  mensajesValidacion: MensajesValidacion;
}

export interface SeccionEditor {
  tipo: SeccionTipo;
  etiqueta: string;
  bloque: "M" | "N" | "O" | "P";
  subtotal: number;
  filas: FilaEditor[];
  muestraRendimiento: boolean;
}

export interface UseApuEditor {
  apu: ApuResponse | undefined;
  /** La ET no viaja en ApuResponse: tiene su propio GET. */
  especificacionTecnica: string | null | undefined;
  secciones: SeccionEditor[];
  cargando: boolean;
  guardando: boolean;
  error: ApiError | null;
  editarCelda(
    detalleId: string,
    campo: "cantidad" | "rendimiento" | "precioOverride",
    valor: string,
  ): Promise<void>;
  restaurarHerencia(detalleId: string): Promise<void>;
  reordenarFila(detalleId: string, nuevoOrden: number): Promise<void>;
  agregarFila(sel: { seccionTipo: SeccionTipo; insumoId: string }): Promise<void>;
  eliminarFila(detalleId: string): Promise<void>;
  editarEncabezado(patchReq: ApuPatchRequest): Promise<void>;
  editarPorcentajeCi(valor: string | null): Promise<void>;
  guardarEspecificacionTecnica(texto: string): Promise<void>;
}

const ORDEN_SECCIONES: readonly SeccionTipo[] = [
  "EQUIPO",
  "MANO_OBRA",
  "MATERIAL",
  "TRANSPORTE",
] as const;

const BLOQUE: Record<SeccionTipo, "M" | "N" | "O" | "P"> = {
  EQUIPO: "M",
  MANO_OBRA: "N",
  MATERIAL: "O",
  TRANSPORTE: "P",
};

const ETIQUETA: Record<SeccionTipo, string> = {
  EQUIPO: "Equipo",
  MANO_OBRA: "Mano de obra",
  MATERIAL: "Materiales",
  TRANSPORTE: "Transporte",
};

export function useApuEditor(apuId: string, presupuestoId?: string): UseApuEditor {
  const qc = useQueryClient();
  // Cada celda tiene su propio ciclo: las claves combinan detalleId + campo,
  // así editar cantidad no afecta a rendimiento/precioOverride de la misma fila.
  // La fila deriva su estado agregando el peor de sus tres celdas; los iconos y
  // mensajes accesibles viven por celda.
  const [estadoCeldas, setEstadoCeldas] = useState<Map<string, EstadoCelda>>(new Map());
  const [mensajesValidacion, setMensajesValidacion] = useState<Map<string, string>>(new Map());

  const { data: apu, isPending: cargando } = useQuery({
    queryKey: qk.apu(apuId),
    queryFn: () => getValidado(`/apus/${apuId}`, apuSchema),
  });

  // La ET se leía a ciegas: el frontend sólo hacía PUT y nunca este GET, así que
  // el panel no podía mostrar lo guardado sin recargar el APU entero.
  const { data: especificacion } = useQuery({
    queryKey: qk.apuEspecificacion(apuId),
    queryFn: () =>
      getValidado(`/apus/${apuId}/especificacion-tecnica`, especificacionTecnicaSchema),
  });

  const secciones = useMemo<SeccionEditor[]>(() => {
    if (!apu) return [];
    const mapa = new Map(apu.secciones.map((s) => [s.tipo, s]));
    return ORDEN_SECCIONES.map((tipo) => {
      const s = mapa.get(tipo);
      return {
        tipo,
        etiqueta: ETIQUETA[tipo],
        bloque: BLOQUE[tipo],
        subtotal: s?.subtotal ?? 0,
        muestraRendimiento: tipo === "EQUIPO" || tipo === "MANO_OBRA",
        filas: (s?.detalles ?? [])
          .toSorted((a, b) => a.orden - b.orden)
          .map((d) => {
            // Estado agregado: una sola celda en "error" basta para colorear la
            // fila, pero los iconos y mensajes accesibles viven por celda en
            // `mensajesValidacion` (ver `actualizarEstado`).
            const estadosPorCelda = (
              ["cantidad", "rendimiento", "precioOverride"] as CampoCelda[]
            ).map((c) => estadoCeldas.get(`${d.id}:${c}`));
            const estadoFila: EstadoCelda = estadosPorCelda.includes("pendiente")
              ? "pendiente"
              : estadosPorCelda.includes("error")
                ? "error"
                : "estable";
            return {
              detalle: d,
              protegida: d.esHerramientaMenor,
              heredado: d.precioHeredado,
              estado: estadoFila,
              mensajesValidacion: {
                cantidad: mensajesValidacion.get(`${d.id}:cantidad`),
                rendimiento: mensajesValidacion.get(`${d.id}:rendimiento`),
                precioOverride: mensajesValidacion.get(`${d.id}:precioOverride`),
              },
            };
          }),
      };
    });
  }, [apu, estadoCeldas, mensajesValidacion]);

  const editMutation = useMutation({
    mutationFn: ({ detalleId, body }: { detalleId: string; body: ApuDetallePatchRequest }) =>
      patchValidado(`/apus/${apuId}/detalles/${detalleId}`, apuSchema, body),
    onSuccess: (response) => {
      qc.setQueryData(qk.apu(apuId), response);
      if (presupuestoId) {
        qc.invalidateQueries({ queryKey: qk.presupuesto(presupuestoId) });
        qc.invalidateQueries({ queryKey: qk.cronograma(presupuestoId) });
      }
    },
  });

  const agregarMutation = useMutation({
    mutationFn: (body: ApuDetalleCrearRequest) =>
      postValidado(`/apus/${apuId}/detalles`, apuSchema, body),
    onSuccess: (response) => {
      qc.setQueryData(qk.apu(apuId), response);
      if (presupuestoId) {
        qc.invalidateQueries({ queryKey: qk.presupuesto(presupuestoId) });
        qc.invalidateQueries({ queryKey: qk.cronograma(presupuestoId) });
      }
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (detalleId: string) =>
      delValidado(`/apus/${apuId}/detalles/${detalleId}`, apuSchema),
    onSuccess: (response) => {
      qc.setQueryData(qk.apu(apuId), response);
      if (presupuestoId) {
        qc.invalidateQueries({ queryKey: qk.presupuesto(presupuestoId) });
        qc.invalidateQueries({ queryKey: qk.cronograma(presupuestoId) });
      }
    },
  });

  const encabezadoMutation = useMutation({
    mutationFn: (body: ApuPatchRequest) => patchValidado(`/apus/${apuId}`, apuSchema, body),
    onSuccess: (response) => {
      qc.setQueryData(qk.apu(apuId), response);
      if (presupuestoId) {
        qc.invalidateQueries({ queryKey: qk.apus(presupuestoId) });
      }
    },
  });

  // El %CI no cabe en ApuPatchRequest: el backend lo descartaba en silencio.
  // Endpoint propio, body un decimal crudo (o null para volver a heredar del
  // proyecto), no un objeto — plan 054 §2. Al no ser un objeto plano, axios no
  // pone el `Content-Type` solo y sin él no serializa el `null`: hay que
  // pedirlo a mano (plan 062 §1).
  const porcentajeCiMutation = useMutation({
    mutationFn: (valor: Decimal | null) =>
      patchValidado(`/apus/${apuId}/porcentaje-indirecto`, apuSchema, valor, {
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (response) => {
      qc.setQueryData(qk.apu(apuId), response);
      if (presupuestoId) {
        qc.invalidateQueries({ queryKey: qk.presupuesto(presupuestoId) });
        qc.invalidateQueries({ queryKey: qk.cronograma(presupuestoId) });
      }
    },
  });

  // Clave por celda, no por fila: editar cantidad no debe tocar el mensaje de
  // rendimiento. Borrar requiere clave explícita para que "estable" en una
  // celda no limpie otra que sigue en error.
  const claveCelda = (detalleId: string, campo: CampoCelda) => `${detalleId}:${campo}`;

  const actualizarEstado = useCallback(
    (detalleId: string, campo: CampoCelda, estado: EstadoCelda, mensaje?: string) => {
      const clave = claveCelda(detalleId, campo);
      setEstadoCeldas((prev) => {
        const next = new Map(prev);
        if (estado === "estable") next.delete(clave);
        else next.set(clave, estado);
        return next;
      });
      setMensajesValidacion((prev) => {
        const next = new Map(prev);
        if (estado === "estable" || mensaje == null) next.delete(clave);
        else next.set(clave, mensaje);
        return next;
      });
    },
    [],
  );

  const editarCelda = useCallback(
    async (
      detalleId: string,
      campo: "cantidad" | "rendimiento" | "precioOverride",
      valor: string,
    ) => {
      const schema =
        campo === "cantidad"
          ? celdaCantidadSchema
          : campo === "rendimiento"
            ? celdaRendimientoSchema
            : precioOverrideSchema;

      const result = schema.safeParse(valor);
      if (!result.success) {
        // El esquema emite issues con `message` legible (ej. "Debe ser mayor que 0").
        // Tomamos el primero: la entrada por celda es única, así que el primer
        // issue es el que el usuario ve, no una cascada.
        actualizarEstado(detalleId, campo, "error", result.error.issues[0]?.message);
        return;
      }

      const apuActual = qc.getQueryData<ApuResponse>(qk.apu(apuId));
      if (!apuActual) return;

      const detalle = apuActual.secciones
        .flatMap((s) => s.detalles)
        .find((d) => d.id === detalleId);
      if (!detalle) return;

      const currentVal =
        campo === "precioOverride" ? detalle.precioEfectivo : (detalle[campo] ?? "");
      const parsedVal =
        campo === "precioOverride" && valor === "" ? null : parsearEntradaDecimal(valor);
      const parsedCurrent =
        campo === "precioOverride" ? null : parsearEntradaDecimal(String(currentVal));

      if (
        parsedVal === parsedCurrent ||
        (campo === "precioOverride" && valor === "" && detalle.precioHeredado)
      ) {
        // El usuario reingresó el mismo valor que ya tenía la fila: no hay PATCH
        // que hacer, pero si la celda quedó en error por una edición anterior
        // inválida, ese mensaje es ahora obsoleto y debe limpiarse. Sólo esta
        // celda — las vecinas mantienen su propio estado.
        actualizarEstado(detalleId, campo, "estable");
        return;
      }

      actualizarEstado(detalleId, campo, "pendiente");

      try {
        const body: ApuDetallePatchRequest = {};
        if (campo === "cantidad") body.cantidad = parsedVal ?? undefined;
        else if (campo === "rendimiento") body.rendimiento = parsedVal ?? undefined;
        else if (campo === "precioOverride")
          body.precioOverride = valor === "" ? null : (parsedVal ?? null);

        await editMutation.mutateAsync({ detalleId, body });
        actualizarEstado(detalleId, campo, "estable");
      } catch (e) {
        // El cliente HTTP normaliza todo error no 2xx a ApiError, que lleva el
        // `mensaje` del backend (`ErrorPayload.mensaje`). Si por alguna razón la
        // cadena se rompe —interceptor caído, error síncrono previo a axios— la
        // celda sigue marcándose como errónea con un mensaje genérico para no
        // dejar al usuario mirando un icono sin pista.
        const mensaje =
          e instanceof ApiError
            ? (e.problem.mensaje ?? e.message)
            : e instanceof Error
              ? e.message
              : "No se pudo guardar el cambio";
        actualizarEstado(detalleId, campo, "error", mensaje);
      }
    },
    [apuId, qc, editMutation, actualizarEstado],
  );

  const restaurarHerencia = useCallback(
    async (detalleId: string) => {
      try {
        await editMutation.mutateAsync({
          detalleId,
          body: { precioOverride: null },
        });
        // El PATCH afecta a la celda `precioOverride`; esa es la única cuyo
        // mensaje y estado hay que limpiar. cantidad/rendimiento siguen vivas.
        actualizarEstado(detalleId, "precioOverride", "estable");
      } catch (e) {
        const mensaje =
          e instanceof ApiError
            ? (e.problem.mensaje ?? e.message)
            : e instanceof Error
              ? e.message
              : "No se pudo guardar el cambio";
        actualizarEstado(detalleId, "precioOverride", "error", mensaje);
      }
    },
    [editMutation, actualizarEstado],
  );

  const reordenarFila = useCallback(
    async (detalleId: string, nuevoOrden: number) => {
      try {
        await editMutation.mutateAsync({ detalleId, body: { orden: nuevoOrden } });
      } catch {
        // handled by react-query
      }
    },
    [editMutation],
  );

  const agregarFila = useCallback(
    async (sel: { seccionTipo: SeccionTipo; insumoId: string }) => {
      try {
        // `cantidad` es @NotNull con mínimo 0.000001: el selector no la pide,
        // así que la fila nace en 1 y el usuario la corrige en su celda.
        // `rendimiento` es @NotNull para EQUIPO/MANO_OBRA (ApuCrudService.
        // rendimientoSegunSeccion) — sin él el backend responde 400 y la fila
        // ni se crea. Mismo patrón que `cantidad`: nace en 1, se corrige después.
        const necesitaRendimiento = sel.seccionTipo === "EQUIPO" || sel.seccionTipo === "MANO_OBRA";
        await agregarMutation.mutateAsync({
          ...sel,
          cantidad: asDecimal("1"),
          ...(necesitaRendimiento ? { rendimiento: asDecimal("1") } : {}),
        });
      } catch {
        // handled by react-query
      }
    },
    [agregarMutation],
  );

  const eliminarFila = useCallback(
    async (detalleId: string) => {
      try {
        await eliminarMutation.mutateAsync(detalleId);
      } catch {
        // handled by react-query
      }
    },
    [eliminarMutation],
  );

  const editarEncabezado = useCallback(
    async (patchReq: ApuPatchRequest) => {
      try {
        await encabezadoMutation.mutateAsync(patchReq);
      } catch {
        // handled by react-query
      }
    },
    [encabezadoMutation],
  );

  const editarPorcentajeCi = useCallback(
    async (valor: string | null) => {
      await porcentajeCiMutation.mutateAsync(valor === null ? null : parsearEntradaDecimal(valor));
    },
    [porcentajeCiMutation],
  );

  const guardarEspecificacionTecnica = useCallback(
    async (texto: string) => {
      const response = await putValidado(`/apus/${apuId}/especificacion-tecnica`, apuSchema, {
        texto,
      });
      qc.setQueryData(qk.apu(apuId), response);
      qc.invalidateQueries({ queryKey: qk.apuEspecificacion(apuId) });
    },
    [apuId, qc],
  );

  return {
    apu,
    especificacionTecnica: especificacion?.contenido,
    secciones,
    cargando,
    guardando:
      editMutation.isPending ||
      agregarMutation.isPending ||
      eliminarMutation.isPending ||
      encabezadoMutation.isPending ||
      porcentajeCiMutation.isPending,
    error: (editMutation.error ??
      agregarMutation.error ??
      eliminarMutation.error ??
      encabezadoMutation.error ??
      porcentajeCiMutation.error) as ApiError | null,
    editarCelda,
    restaurarHerencia,
    reordenarFila,
    agregarFila,
    eliminarFila,
    editarEncabezado,
    editarPorcentajeCi,
    guardarEspecificacionTecnica,
  };
}
