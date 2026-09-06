import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put, patch, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { PresupuestoResponse, CapituloMoverRequest } from "@/api/contract";
import { toast } from "sonner";

export function useCapituloMutaciones(presupuestoId: string) {
  const queryClient = useQueryClient();

  const onSuccess = (data: PresupuestoResponse) => {
    queryClient.setQueryData(qk.presupuesto(presupuestoId), data);
  };

  const crear = useMutation({
    mutationFn: (body: { descripcion: string; parentId?: string }) =>
      post<PresupuestoResponse>(`/presupuestos/${presupuestoId}/capitulos`, body),
    onSuccess: (data) => {
      onSuccess(data);
      toast.success("Capítulo creado");
    },
    onError: () => toast.error("Error al crear capítulo"),
  });

  const editar = useMutation({
    mutationFn: ({ capituloId, descripcion }: { capituloId: string; descripcion: string }) =>
      put<PresupuestoResponse>(`/presupuestos/${presupuestoId}/capitulos/${capituloId}`, {
        descripcion,
      }),
    onSuccess: (data) => {
      onSuccess(data);
      toast.success("Capítulo editado");
    },
    onError: () => toast.error("Error al editar capítulo"),
  });

  const mover = useMutation({
    mutationFn: ({ capituloId, body }: { capituloId: string; body: CapituloMoverRequest }) =>
      patch<PresupuestoResponse>(
        `/presupuestos/${presupuestoId}/capitulos/${capituloId}/mover`,
        body,
      ),
    onSuccess: (data) => {
      onSuccess(data);
      toast.success("Capítulo movido");
    },
    onError: () => toast.error("Error al mover capítulo"),
  });

  const eliminar = useMutation({
    mutationFn: (capituloId: string) =>
      del<PresupuestoResponse>(`/presupuestos/${presupuestoId}/capitulos/${capituloId}`),
    onSuccess: (data) => {
      onSuccess(data);
      toast.success("Capítulo eliminado");
    },
    onError: () => toast.error("Error al eliminar capítulo"),
  });

  return { crear, editar, mover, eliminar };
}
