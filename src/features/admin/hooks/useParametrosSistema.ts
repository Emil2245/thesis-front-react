import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ParametrosSistemaResponse, ParametrosSistemaActualizarRequest } from "@/api/contract";
import { toast } from "sonner";

export function useParametrosSistema() {
  return useQuery({
    queryKey: qk.adminParametros(),
    queryFn: () => get<ParametrosSistemaResponse>("/admin/parametros-sistema"),
  });
}

export function useActualizarParametros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ParametrosSistemaActualizarRequest) =>
      put<ParametrosSistemaResponse>("/admin/parametros-sistema", body),
    onSuccess: (data) => {
      qc.setQueryData(qk.adminParametros(), data);
      toast.success("Parámetros actualizados");
    },
    onError: () => toast.error("Error al actualizar parámetros"),
  });
}
