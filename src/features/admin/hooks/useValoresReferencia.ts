import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ValorReferenciaResponse, ValorReferenciaRequest } from "@/api/contract";
import { toast } from "sonner";

export function useValoresReferencia() {
  return useQuery({
    queryKey: qk.adminValores(),
    queryFn: () => get<ValorReferenciaResponse[]>("/admin/valores-referencia"),
  });
}

export function useActualizarValor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clave, body }: { clave: string; body: ValorReferenciaRequest }) =>
      put<ValorReferenciaResponse>(`/admin/valores-referencia/${clave}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminValores() });
      toast.success("Valor actualizado");
    },
    onError: () => toast.error("Error al actualizar valor"),
  });
}
