import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ParametrosSistemaResponse, ParametrosSistemaActualizarRequest } from "@/api/contract";
import { toast } from "sonner";

// El backend expone esta lectura sin rol de admin, en el recurso de
// proyectos (ProyectoResource:91-94), no en el recurso admin (plan 027).
export function useParametrosSistema() {
  return useQuery({
    queryKey: qk.adminParametros(),
    queryFn: () => get<ParametrosSistemaResponse>("/proyectos/parametros-sistema"),
  });
}

// El backend no expone ninguna escritura de parámetros de sistema todavía
// (plan 027): esta mutación queda deshabilitada en AdminParametrosPage con
// MOTIVO_SIN_BACKEND hasta que exista.
export function useActualizarParametros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ParametrosSistemaActualizarRequest) =>
      put<ParametrosSistemaResponse>("/proyectos/parametros-sistema", body),
    onSuccess: (data) => {
      qc.setQueryData(qk.adminParametros(), data);
      toast.success("Parámetros actualizados");
    },
    onError: () => toast.error("Error al actualizar parámetros"),
  });
}
