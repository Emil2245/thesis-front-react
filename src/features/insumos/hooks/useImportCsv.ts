import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postValidado } from "@/api/request";
import { importResultadoSchema } from "@/api/schemas";
import type { DestinoInsumos } from "../destino";

export function useImportarCsv(destino: DestinoInsumos) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formData }: { formData: FormData }) =>
      postValidado(destino.rutaImport, importResultadoSchema, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: destino.clave });
    },
  });
}
