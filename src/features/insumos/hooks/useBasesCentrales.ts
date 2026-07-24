import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { BaseInsumosResponse } from "@/api/contract";

export function useBasesCentrales() {
  return useQuery({
    queryKey: qk.basesCentrales(),
    queryFn: () => get<BaseInsumosResponse[]>("/bases-centrales"),
  });
}
