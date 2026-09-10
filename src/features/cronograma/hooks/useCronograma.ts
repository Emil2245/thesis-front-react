import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getValidado, postValidado, putValidado, patchValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type {
  CronogramaResponse,
  CronogramaCrearRequest,
  CronogramaConfigurarRequest,
  ActividadProgramarRequest,
  PerdidaAvanceResponse,
} from "@/api/contract";
import { ApiError, type ProblemType } from "@/api/problem";
import { cronogramaSchema } from "@/api/schemas";
import { toast } from "sonner";

/**
 * Los tres 409 del módulo —ya existe, requiere confirmación y segmento
 * solapado— se distinguen por `codigo` y nunca por `status`: un `catch` por
 * `status === 409` los mezcla. Ahora `codigo` es el campo real del cuerpo y los
 * tres están en `PROBLEM_TYPES`, así que basta con `is()`; sobraba el lector a
 * medida que hacía falta cuando `Problem` fingía ser RFC 7807.
 */
const es = (err: unknown, codigo: ProblemType): boolean =>
  err instanceof ApiError && err.is(codigo);

/** 404 = «este presupuesto todavía no tiene cronograma», que es un estado de
 * la página, no un fallo. Cualquier otro error sí sube. */
export function useCronograma(presupuestoId: string) {
  return useQuery({
    queryKey: qk.cronograma(presupuestoId),
    queryFn: async (): Promise<CronogramaResponse | null> => {
      try {
        return await getValidado(`/presupuestos/${presupuestoId}/cronograma`, cronogramaSchema);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!presupuestoId,
  });
}

export function useCrearCronograma(presupuestoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CronogramaCrearRequest) =>
      postValidado(`/presupuestos/${presupuestoId}/cronograma`, cronogramaSchema, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma creado");
    },
    onError: (err) => {
      // La relación presupuesto↔cronograma es 1:1: si ya existe, lo que hay que
      // hacer es recargar el que hay, no enseñar un error.
      if (es(err, "cronograma-ya-existe")) {
        qc.invalidateQueries({ queryKey: qk.cronograma(presupuestoId) });
        toast.info("Este presupuesto ya tenía cronograma; se recargó el existente");
      } else {
        toast.error("Error al crear cronograma");
      }
    },
  });
}

export function useConfigurarCronograma(
  cronogramaId: string,
  presupuestoId: string,
  on409?: (perdidas: PerdidaAvanceResponse[]) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CronogramaConfigurarRequest) =>
      putValidado(`/cronogramas/${cronogramaId}/configuracion`, cronogramaSchema, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma actualizado");
    },
    onError: (err) => {
      // El payload trae `perdidas[]` —actividad, período y valor—, que es lo
      // único que el usuario puede mirar antes de confirmar la pérdida.
      if (es(err, "configuracion-cronograma-requiere-confirmacion") && on409) {
        const perdidas = (err as ApiError).problem.perdidas;
        on409(Array.isArray(perdidas) ? (perdidas as PerdidaAvanceResponse[]) : []);
      } else {
        toast.error("Error al configurar cronograma");
      }
    },
  });
}

/** El PATCH es una unión discriminada por `operacion`, no un «guardar avances». */
export function useProgramarActividad(cronogramaId: string, presupuestoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actividadId, body }: { actividadId: string; body: ActividadProgramarRequest }) =>
      patchValidado(
        `/cronogramas/${cronogramaId}/actividades/${actividadId}`,
        cronogramaSchema,
        body,
      ),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Actividad programada");
    },
    onError: (err) => {
      toast.error(
        es(err, "segmento-solapado")
          ? "El destino se solapa con otro segmento de la actividad"
          : "Error al programar la actividad",
      );
    },
  });
}

export function useRevisarCronograma(cronogramaId: string, presupuestoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postValidado(`/cronogramas/${cronogramaId}/revisado`, cronogramaSchema),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma revisado");
    },
    onError: () => toast.error("Error al revisar cronograma"),
  });
}
