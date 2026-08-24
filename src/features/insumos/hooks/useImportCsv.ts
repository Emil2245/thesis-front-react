import { useMutation } from "@tanstack/react-query";
import { post } from "@/api/request";
import type { ImportResultadoResponse } from "@/api/contract";

export function useImportarCsv(proyectoId: number) {
  return useMutation({
    mutationFn: ({ formData }: { formData: FormData }) =>
      post<ImportResultadoResponse>(`/proyectos/${proyectoId}/insumos/importar`, formData),
  });
}
