import { useMutation } from "@tanstack/react-query";
import { post } from "@/api/request";
import type { ImportResultadoResponse } from "@/api/contract";

export function useImportarCsv(proyectoId: number) {
  return useMutation({
    mutationFn: ({ formData, soloValidar }: { formData: FormData; soloValidar: boolean }) => {
      const params = new URLSearchParams();
      params.set("soloValidar", String(soloValidar));
      return post<ImportResultadoResponse>(
        `/proyectos/${proyectoId}/insumos/import?${params.toString()}`,
        formData,
      );
    },
  });
}
