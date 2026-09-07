import { useCallback, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useVersiones } from "@/features/presupuesto/hooks/usePresupuesto";
import type { PresupuestoVersionResponse } from "@/api/contract";

export function useProyectoActivoId(): string | null {
  const { id } = useParams();
  return id ?? null;
}

export function useVersionActiva() {
  const proyectoId = useProyectoActivoId();
  const [params, setParams] = useSearchParams();
  // `useVersiones` desactiva la query con id vacío, que es lo que toca cuando
  // la ruta no lleva proyecto.
  const { data: versiones, isPending } = useVersiones(proyectoId ?? "");

  const pedida = params.get("v");
  const encontrada = versiones?.find((x) => x.presupuestoId === pedida);
  const vigente = versiones?.find((x) => x.esVigente) ?? versiones?.[0] ?? null;
  const activa = encontrada ?? vigente;

  // Forma funcional: así `cambiar` no captura `params` y su identidad es
  // estable, que es lo que permite listarlo como dependencia del efecto sin
  // rehacerlo en cada render.
  const cambiar = useCallback(
    (id: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("v", id);
          return next;
        },
        { replace: false },
      );
    },
    [setParams],
  );

  useEffect(() => {
    if (encontrada == null && vigente != null && params.has("v")) {
      cambiar(vigente.presupuestoId);
    }
  }, [encontrada, vigente, params, cambiar]);

  return {
    versiones: versiones ?? [],
    activa,
    presupuestoId: activa?.presupuestoId ?? null,
    cambiar,
    isPending,
  };
}

export type { PresupuestoVersionResponse };
