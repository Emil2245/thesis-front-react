import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { PresupuestoVersionResponse } from "@/api/contract";

export function useProyectoActivoId(): string | null {
  const { id } = useParams();
  return id ?? null;
}

export function useVersiones(proyectoId: string | null) {
  return useQuery({
    queryKey: qk.versiones(proyectoId ?? ""),
    queryFn: () => get<PresupuestoVersionResponse[]>(`/proyectos/${proyectoId}/presupuestos`),
    enabled: proyectoId != null,
  });
}

export function useVersionActiva() {
  const proyectoId = useProyectoActivoId();
  const [params, setParams] = useSearchParams();
  const { data: versiones, isPending } = useVersiones(proyectoId);

  const pedida = params.get("v");
  const encontrada = versiones?.find((x) => x.presupuestoId === pedida);
  const vigente = versiones?.find((x) => x.esVigente) ?? versiones?.[0] ?? null;
  const activa = encontrada ?? vigente;

  const cambiar = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("v", id);
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
