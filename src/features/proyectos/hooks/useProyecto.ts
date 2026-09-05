import { useMutation } from "@tanstack/react-query";
import { put } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import type { ProyectoDetalleResponse } from "@/api/contract";

export function useSubirLogo(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("logo", file);
      return put<ProyectoDetalleResponse>(`/proyectos/${proyectoId}/logo`, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proyecto(proyectoId) });
    },
  });
}
