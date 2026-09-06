import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post } from "@/api/request";
import type { ImportResultadoResponse } from "@/api/contract";
import type { DestinoInsumos } from "../destino";

export function useImportarCsv(destino: DestinoInsumos) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formData }: { formData: FormData }) =>
      post<ImportResultadoResponse>(destino.rutaImport, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: destino.clave });
    },
  });
}
