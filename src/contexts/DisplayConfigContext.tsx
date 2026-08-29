import { useDisplayConfig, DisplayConfigCtx, DISPLAY_DEFAULTS } from "@/hooks/useDisplayConfig";

export function DisplayConfigProvider({ children }: { children: React.ReactNode }) {
  const { data } = useDisplayConfig();
  return <DisplayConfigCtx value={data ?? DISPLAY_DEFAULTS}>{children}</DisplayConfigCtx>;
}
