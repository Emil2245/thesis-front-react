import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ParametrosSistemaResponse, ParametrosSistemaEditarRequest } from "@/api/contract";
import { toast } from "sonner";

// El backend expone esta lectura sin rol de admin, en el recurso de
// proyectos (ProyectoResource:91-94), no en el recurso admin (plan 027).
export function useParametrosSistema() {
  return useQuery({
    queryKey: qk.adminParametros(),
    queryFn: () => get<ParametrosSistemaResponse>("/proyectos/parametros-sistema"),
  });
}

// `PUT /proyectos/parametros-sistema` existe (SUPER_ADMIN). No está bajo
// `/admin/`, que es por lo que el análisis del plan 027 no lo encontró y dio
// por deshabilitada una escritura que sí estaba.
export function useActualizarParametros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ParametrosSistemaEditarRequest) =>
      put<ParametrosSistemaResponse>("/proyectos/parametros-sistema", body),
    onSuccess: (data) => {
      qc.setQueryData(qk.adminParametros(), data);
      toast.success("Parámetros actualizados");
    },
    onError: () => toast.error("Error al actualizar parámetros"),
  });
}
