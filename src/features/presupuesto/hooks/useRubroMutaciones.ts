import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, patch, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { PresupuestoResponse } from "@/api/contract";
import { toast } from "sonner";

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
      post<PresupuestoResponse>(`/presupuestos/${presupuestoId}/capitulos/${capituloId}/rubros`, {
        apuId,
        cantidad,
      }),
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
      patch<PresupuestoResponse>(
        `/presupuestos/${presupuestoId}/capitulos/${capituloId}/rubros/${rubroId}`,
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
      del<PresupuestoResponse>(
        `/presupuestos/${presupuestoId}/capitulos/${capituloId}/rubros/${rubroId}`,
      ),
    onSuccess: (data) => {
      onSuccess(data);
      toast.success("Rubro eliminado");
    },
    onError: () => toast.error("Error al eliminar rubro"),
  });

  return { agregar, actualizarCantidad, eliminar };
}
