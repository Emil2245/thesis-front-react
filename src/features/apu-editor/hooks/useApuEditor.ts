import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch, post, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { parsearEntradaDecimal } from "@/lib/decimal";
import { celdaCantidadSchema, celdaRendimientoSchema, precioOverrideSchema } from "../schemas";
import type {
  ApuResponse,
  ApuDetalleResponse,
  SeccionTipo,
  ApuPatchRequest,
  ApuDetallePatchRequest,
  ApuDetalleCrearRequest,
  DescuentoRubroRequest,
} from "@/api/contract";
import type { ApiError } from "@/api/problem";

export type EstadoCelda = "estable" | "pendiente" | "error";

export interface FilaEditor {
  detalle: ApuDetalleResponse;
  protegida: boolean;
  heredado: boolean;
  esAuxiliar: boolean;
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
  secciones: SeccionEditor[];
  cargando: boolean;
  guardando: boolean;
  error: ApiError | null;
  editarCelda(
    detalleId: number,
    campo: "cantidad" | "rendimiento" | "precioOverride",
    valor: string,
  ): Promise<void>;
  restaurarHerencia(detalleId: number): Promise<void>;
  reordenarFila(detalleId: number, nuevoOrden: number): Promise<void>;
  agregarFila(sel: { insumoId?: number; apuAuxiliarId?: number }): Promise<void>;
  eliminarFila(detalleId: number): Promise<void>;
  editarEncabezado(patchReq: ApuPatchRequest): Promise<void>;
  editarPorcentajeCi(valor: string | null): Promise<void>;
  aplicarDescuento(porcentaje: string): Promise<void>;
  alternarAuxiliar(esAuxiliar: boolean): Promise<void>;
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

export function useApuEditor(apuId: number, presupuestoId?: number): UseApuEditor {
  const qc = useQueryClient();
  const [estadoCeldas, setEstadoCeldas] = useState<Map<number, EstadoCelda>>(new Map());

  const { data: apu, isPending: cargando } = useQuery({
    queryKey: qk.apu(apuId),
    queryFn: () => get<ApuResponse>(`/apus/${apuId}`),
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
            esAuxiliar: d.apuAuxiliarId != null,
            estado: estadoCeldas.get(d.id) ?? "estable",
          })),
      };
    });
  }, [apu, estadoCeldas]);

  const editMutation = useMutation({
    mutationFn: ({ detalleId, body }: { detalleId: number; body: ApuDetallePatchRequest }) =>
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
    mutationFn: (detalleId: number) => del<ApuResponse>(`/apus/${apuId}/detalles/${detalleId}`),
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

  const descuentoMutation = useMutation({
    mutationFn: (body: DescuentoRubroRequest) =>
      post<ApuResponse>(`/apus/${apuId}/descuento`, body),
    onSuccess: (response) => {
      qc.setQueryData(qk.apu(apuId), response);
      if (presupuestoId) {
        qc.invalidateQueries({ queryKey: qk.presupuesto(presupuestoId) });
        qc.invalidateQueries({ queryKey: qk.cronograma(presupuestoId) });
      }
    },
  });

  const actualizarEstado = useCallback((detalleId: number, estado: EstadoCelda) => {
    setEstadoCeldas((prev) => {
      const next = new Map(prev);
      if (estado === "estable") next.delete(detalleId);
      else next.set(detalleId, estado);
      return next;
    });
  }, []);

  const editarCelda = useCallback(
    async (
      detalleId: number,
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
    async (detalleId: number) => {
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
    async (detalleId: number, nuevoOrden: number) => {
      try {
        await editMutation.mutateAsync({ detalleId, body: { orden: nuevoOrden } });
      } catch {
        // handled by react-query
      }
    },
    [editMutation],
  );

  const agregarFila = useCallback(
    async (sel: { insumoId?: number; apuAuxiliarId?: number }) => {
      try {
        await agregarMutation.mutateAsync(sel);
      } catch {
        // handled by react-query
      }
    },
    [agregarMutation],
  );

  const eliminarFila = useCallback(
    async (detalleId: number) => {
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
      await encabezadoMutation.mutateAsync({
        porcentajeIndirecto: valor === null ? null : parsearEntradaDecimal(valor),
      });
    },
    [encabezadoMutation],
  );

  const aplicarDescuento = useCallback(
    async (porcentaje: string) => {
      await descuentoMutation.mutateAsync({
        porcentaje: parsearEntradaDecimal(porcentaje)!,
      });
    },
    [descuentoMutation],
  );

  const alternarAuxiliar = useCallback(
    async (esAuxiliar: boolean) => {
      await encabezadoMutation.mutateAsync({ esAuxiliar });
    },
    [encabezadoMutation],
  );

  return {
    apu,
    secciones,
    cargando,
    guardando:
      editMutation.isPending ||
      agregarMutation.isPending ||
      eliminarMutation.isPending ||
      encabezadoMutation.isPending ||
      descuentoMutation.isPending,
    error: (editMutation.error ??
      agregarMutation.error ??
      eliminarMutation.error ??
      encabezadoMutation.error) as ApiError | null,
    editarCelda,
    restaurarHerencia,
    reordenarFila,
    agregarFila,
    eliminarFila,
    editarEncabezado,
    editarPorcentajeCi,
    aplicarDescuento,
    alternarAuxiliar,
  };
}
