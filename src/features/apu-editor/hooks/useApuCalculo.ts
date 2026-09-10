import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { apuCalculoSchema } from "@/api/schemas";
import { qk } from "@/api/queryKeys";

export function useApuCalculo(apuId: string, habilitado = true) {
  return useQuery({
    queryKey: qk.apuCalculo(apuId),
    queryFn: () => getValidado(`/apus/${apuId}/calculo`, apuCalculoSchema),
    enabled: habilitado,
  });
}
