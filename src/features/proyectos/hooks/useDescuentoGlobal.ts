import { useMutation } from "@tanstack/react-query";
import { get, post } from "@/api/request";
import type { DescuentoGlobalPreviewResponse, DescuentoGlobalRequest } from "@/api/contract";

export function usePreviewDescuento(presupuestoId: string | null) {
  return useMutation({
    mutationFn: (porcentaje: number) =>
      get<DescuentoGlobalPreviewResponse>(
        `/presupuestos/${presupuestoId}/descuento-global/preview`,
        { porcentaje },
      ),
  });
}

export function useAplicarDescuento() {
  return useMutation({
    mutationFn: ({ presupuestoId, ...body }: DescuentoGlobalRequest & { presupuestoId: string }) =>
      post(`/presupuestos/${presupuestoId}/descuento-global`, body),
  });
}
