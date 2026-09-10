import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postValidado, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { toast } from "sonner";
import { notificarError } from "@/lib/manejoErrores";
import { versionSchema } from "@/api/schemas";

export function useVersionMutaciones(proyectoId: string) {
  const queryClient = useQueryClient();

  const invalidateVersiones = () => {
    queryClient.invalidateQueries({ queryKey: qk.versiones(proyectoId) });
  };

  const crear = useMutation({
    mutationFn: ({ origenId, notas }: { origenId: string; notas?: string }) =>
      postValidado(`/proyectos/${proyectoId}/presupuestos`, versionSchema, {
        origenId,
        notas,
      }),
    onSuccess: () => {
      invalidateVersiones();
      toast.success("Versión creada");
    },
    onError: () => toast.error("Error al crear versión"),
  });

  const marcarVigente = useMutation({
    mutationFn: (versionId: string) =>
      postValidado(`/presupuestos/${versionId}/vigente`, versionSchema),
    onSuccess: () => {
      invalidateVersiones();
      toast.success("Versión vigente actualizada");
    },
    onError: () => toast.error("Error al cambiar versión vigente"),
  });

  const eliminar = useMutation({
    mutationFn: (versionId: string) => del(`/presupuestos/${versionId}`),
    onSuccess: () => {
      invalidateVersiones();
      toast.success("Versión eliminada");
    },
    // `version-vigente-protegida` explica que hay que marcar otra versión como
    // vigente primero. Tirar `mensaje` y pintar un genérico dejaba al usuario
    // sin saber qué hacer.
    onError: (err) => notificarError(err, "Error al eliminar versión"),
  });

  return { crear, marcarVigente, eliminar };
}
