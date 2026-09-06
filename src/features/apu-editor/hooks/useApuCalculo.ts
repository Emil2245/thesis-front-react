import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ApuCalculoResponse } from "@/api/contract";

export function useApuCalculo(apuId: string, habilitado = true) {
  return useQuery({
    queryKey: qk.apuCalculo(apuId),
    queryFn: () => get<ApuCalculoResponse>(`/apus/${apuId}/calculo`),
    enabled: habilitado,
  });
}
