import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { ApiError } from "@/api/problem";
import { qk } from "@/api/queryKeys";
import type { PresupuestoVersionResponse } from "@/api/contract";

export function useProyectoActivoId(): number | null {
  const { id } = useParams();
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function useVersiones(proyectoId: number | null) {
  return useQuery({
    queryKey: qk.versiones(proyectoId ?? 0),
    queryFn: async () => {
      try {
        return await get<PresupuestoVersionResponse[]>(`/proyectos/${proyectoId}/presupuestos`);
      } catch (e) {
        // El backend aún no expone esta ruta para proyectos sin presupuestos.
        if (e instanceof ApiError && e.status === 404) return [];
        throw e;
      }
    },
    enabled: proyectoId != null,
  });
}

export function useVersionActiva() {
  const proyectoId = useProyectoActivoId();
  const [params, setParams] = useSearchParams();
  const { data: versiones, isPending } = useVersiones(proyectoId);

  const pedida = Number(params.get("v"));
  const encontrada = versiones?.find((x) => x.id === pedida);
  const vigente = versiones?.find((x) => x.vigente) ?? versiones?.[0] ?? null;
  const activa = encontrada ?? vigente;

  const cambiar = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("v", String(id));
    setParams(next, { replace: false });
  };

  if (encontrada == null && vigente != null && params.has("v")) {
    cambiar(vigente.id);
  }

  return {
    versiones: versiones ?? [],
    activa,
    presupuestoId: activa?.id ?? null,
    cambiar,
    isPending,
  };
}

export type { PresupuestoVersionResponse };
