import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { DisplayConfigResponse } from "@/api/contract";
import { displayConfigSchema } from "@/api/schemas";

export const DISPLAY_DEFAULTS: DisplayConfigResponse = {
  precisionDinero: 2,
  precisionPorcentaje: 4,
};

export const DisplayConfigCtx = createContext<DisplayConfigResponse>(DISPLAY_DEFAULTS);

export function useDisplayConfig() {
  return useQuery({
    queryKey: qk.displayConfig(),
    queryFn: () => getValidado("/config/display", displayConfigSchema),
    staleTime: Infinity,
    placeholderData: DISPLAY_DEFAULTS,
  });
}

export function useDisplayPrecision() {
  return useContext(DisplayConfigCtx);
}
