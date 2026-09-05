import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { ApiError } from "@/api/problem";
import { qk } from "@/api/queryKeys";
import type { PresupuestoVersionResponse } from "@/api/contract";

export function useProyectoActivoId(): string | null {
  const { id } = useParams();
  return id ?? null;
}

export function useVersiones(proyectoId: string | null) {
  return useQuery({
    queryKey: qk.versiones(proyectoId ?? ""),
    queryFn: async () => {
      try {
        // TODO(047): el backend parsea este {proyectoId} como Long, no como UUIDv7
        // (PresupuestoVersionResource.java:49). Falla en runtime hasta que se corrija.
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
  const encontrada = versiones?.find((x) => x.presupuestoId === pedida);
  const vigente = versiones?.find((x) => x.esVigente) ?? versiones?.[0] ?? null;
  const activa = encontrada ?? vigente;

  const cambiar = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("v", String(id));
    setParams(next, { replace: false });
  };

  useEffect(() => {
    if (encontrada == null && vigente != null && params.has("v")) {
      cambiar(vigente.presupuestoId);
    }
  }, [encontrada, vigente, params]);

  return {
    versiones: versiones ?? [],
    activa,
    presupuestoId: activa?.presupuestoId ?? null,
    cambiar,
    isPending,
  };
}

export type { PresupuestoVersionResponse };
