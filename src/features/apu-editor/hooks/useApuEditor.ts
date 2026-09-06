import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch, post, put, del } from "@/api/request";
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
  EspecificacionTecnicaResponse,
} from "@/api/contract";
import type { ApiError } from "@/api/problem";

export type EstadoCelda = "estable" | "pendiente" | "error";

export interface FilaEditor {
  detalle: ApuDetalleResponse;
  protegida: boolean;
  heredado: boolean;
  estado: EstadoCelda;
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
  const [estadoCeldas, setEstadoCeldas] = useState<Map<string, EstadoCelda>>(new Map());

  const { data: apu, isPending: cargando } = useQuery({
    queryKey: qk.apu(apuId),
    queryFn: () => get<ApuResponse>(`/apus/${apuId}`),
  });

  // La ET se leía a ciegas: el frontend sólo hacía PUT y nunca este GET, así que
  // el panel no podía mostrar lo guardado sin recargar el APU entero.
  const { data: especificacion } = useQuery({
    queryKey: qk.apuEspecificacion(apuId),
    queryFn: () => get<EspecificacionTecnicaResponse>(`/apus/${apuId}/especificacion-tecnica`),
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
          .map((d) => ({
            detalle: d,
            protegida: d.esHerramientaMenor,
            heredado: d.precioHeredado,
            estado: estadoCeldas.get(d.id) ?? "estable",
          })),
      };
    });
  }, [apu, estadoCeldas]);

  const editMutation = useMutation({
    mutationFn: ({ detalleId, body }: { detalleId: string; body: ApuDetallePatchRequest }) =>
      patch<ApuResponse>(`/apus/${apuId}/detalles/${detalleId}`, body),
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
      post<ApuResponse>(`/apus/${apuId}/detalles`, body),
    onSuccess: (response) => {
      qc.setQueryData(qk.apu(apuId), response);
      if (presupuestoId) {
        qc.invalidateQueries({ queryKey: qk.presupuesto(presupuestoId) });
        qc.invalidateQueries({ queryKey: qk.cronograma(presupuestoId) });
      }
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (detalleId: string) => del<ApuResponse>(`/apus/${apuId}/detalles/${detalleId}`),
    onSuccess: (response) => {
      qc.setQueryData(qk.apu(apuId), response);
      if (presupuestoId) {
        qc.invalidateQueries({ queryKey: qk.presupuesto(presupuestoId) });
        qc.invalidateQueries({ queryKey: qk.cronograma(presupuestoId) });
      }
    },
  });

  const encabezadoMutation = useMutation({
    mutationFn: (body: ApuPatchRequest) => patch<ApuResponse>(`/apus/${apuId}`, body),
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
      patch<ApuResponse>(`/apus/${apuId}/porcentaje-indirecto`, valor, {
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

  const actualizarEstado = useCallback((detalleId: string, estado: EstadoCelda) => {
    setEstadoCeldas((prev) => {
      const next = new Map(prev);
      if (estado === "estable") next.delete(detalleId);
      else next.set(detalleId, estado);
      return next;
    });
  }, []);

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
        actualizarEstado(detalleId, "error");
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
        return;
      }

      actualizarEstado(detalleId, "pendiente");

      try {
        const body: ApuDetallePatchRequest = {};
        if (campo === "cantidad") body.cantidad = parsedVal ?? undefined;
        else if (campo === "rendimiento") body.rendimiento = parsedVal ?? undefined;
        else if (campo === "precioOverride")
          body.precioOverride = valor === "" ? null : (parsedVal ?? null);

        await editMutation.mutateAsync({ detalleId, body });
        actualizarEstado(detalleId, "estable");
      } catch {
        actualizarEstado(detalleId, "error");
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
      } catch {
        // reverted by onError
      }
    },
    [editMutation],
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
        // `rendimiento` se omite; mandarlo a 0 sería otro 400.
        await agregarMutation.mutateAsync({ ...sel, cantidad: asDecimal("1") });
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
      await put(`/apus/${apuId}/especificacion-tecnica`, { texto });
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
