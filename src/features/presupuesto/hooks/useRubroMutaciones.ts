import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postValidado, patchValidado, delValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { AgregarPlantillasRequest, PresupuestoResponse } from "@/api/contract";
import { toast } from "sonner";
import { agregarPlantillasResponseSchema, presupuestoSchema } from "@/api/schemas";

export function useAgregarDesdePlantillas(presupuestoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: AgregarPlantillasRequest) =>
      postValidado(
        `/presupuestos/${presupuestoId}/rubros/desde-plantillas`,
        agregarPlantillasResponseSchema,
        body,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.presupuesto(presupuestoId), data.presupuesto);
      queryClient.invalidateQueries({ queryKey: qk.apus(presupuestoId) });
      queryClient.invalidateQueries({ queryKey: qk.presupuestoValidacion(presupuestoId) });
      queryClient.invalidateQueries({ queryKey: qk.cronograma(presupuestoId) });
    },
  });
}

export function useRubroMutaciones(presupuestoId: string) {
  const queryClient = useQueryClient();

  const onSuccess = (data: PresupuestoResponse) => {
    queryClient.setQueryData(qk.presupuesto(presupuestoId), data);
    queryClient.invalidateQueries({ queryKey: qk.presupuestoValidacion(presupuestoId) });
  };

  const agregar = useMutation({
    mutationFn: ({
      capituloId,
      apuId,
      cantidad,
    }: {
      capituloId: string;
      apuId: string;
      cantidad: string;
    }) =>
      postValidado(
        `/presupuestos/${presupuestoId}/capitulos/${capituloId}/rubros`,
        presupuestoSchema,
        { apuId, cantidad },
      ),
    onSuccess: (data) => {
      onSuccess(data);
      toast.success("Rubro agregado");
    },
    onError: () => toast.error("Error al agregar rubro"),
  });

  const actualizarCantidad = useMutation({
    mutationFn: ({
      capituloId,
      rubroId,
      cantidad,
    }: {
      capituloId: string;
      rubroId: string;
      cantidad: string;
    }) =>
      patchValidado(
        `/presupuestos/${presupuestoId}/capitulos/${capituloId}/rubros/${rubroId}`,
        presupuestoSchema,
        { cantidad },
      ),
    onSuccess: (data) => {
      onSuccess(data);
      toast.success("Cantidad actualizada");
    },
    onError: () => toast.error("Error al actualizar cantidad"),
  });

  const eliminar = useMutation({
    mutationFn: ({ capituloId, rubroId }: { capituloId: string; rubroId: string }) =>
      delValidado(
        `/presupuestos/${presupuestoId}/capitulos/${capituloId}/rubros/${rubroId}`,
        presupuestoSchema,
      ),
    onSuccess: (data) => {
      onSuccess(data);
      toast.success("Rubro eliminado");
    },
    onError: () => toast.error("Error al eliminar rubro"),
  });

  return { agregar, actualizarCantidad, eliminar };
}
