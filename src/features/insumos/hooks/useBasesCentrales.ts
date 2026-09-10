import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { baseCentralSchema } from "@/api/schemas";
import { qk } from "@/api/queryKeys";
import { z } from "zod";

export function useBasesCentrales() {
  return useQuery({
    queryKey: qk.basesCentrales(),
    queryFn: () => getValidado("/bases-centrales", z.array(baseCentralSchema)),
  });
}
