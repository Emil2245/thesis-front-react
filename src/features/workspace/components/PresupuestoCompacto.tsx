import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import type { CapituloResponse, PresupuestoResponse, RubroResponse } from "@/api/contract";
import type { ReactNode } from "react";

type RubroEntry = { rubro: RubroResponse; ancestors: string[] };

function collectRubros(capitulos: CapituloResponse[], ancestors: string[] = []): RubroEntry[] {
  return capitulos.flatMap((capitulo) => {
    const path = [...ancestors, capitulo.id];
    return [
      ...capitulo.rubros.map((rubro) => ({ rubro, ancestors: path })),
      ...collectRubros(capitulo.subcapitulos, path),
    ];
  });
}

export function PresupuestoCompacto({ presupuesto }: { presupuesto: PresupuestoResponse }) {
  const [params, setParams] = useSearchParams();
  const entries = useMemo(() => collectRubros(presupuesto.capitulos), [presupuesto.capitulos]);
  const selectedId = params.get("rubro");
  const selected = entries.find(({ rubro }) => rubro.id === selectedId)?.rubro;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const visibleExpanded = useMemo(() => {
    const forced = selected?.id
      ? entries.find(({ rubro }) => rubro.id === selected.id)?.ancestors
      : selectedId && !selected
        ? entries[0]?.ancestors
        : undefined;
    return forced ? new Set([...expanded, ...forced]) : expanded;
  }, [entries, expanded, selected, selectedId]);

  useEffect(() => {
    const fallback = entries[0];
    if (selectedId && !selected) {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (fallback) next.set("rubro", fallback.rubro.id);
          else next.delete("rubro");
          return next;
        },
        { replace: true },
      );
    }
  }, [entries, selected, selectedId, setParams]);

  const select = (rubro: RubroResponse) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("rubro", rubro.id);
        return next;
      },
      { replace: false },
    );
  };
  const activate = (event: KeyboardEvent<HTMLTableRowElement>, rubro: RubroResponse) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(rubro);
    }
  };

  const renderChapters = (chapters: CapituloResponse[]): ReactNode[] =>
    chapters.flatMap((chapter) => {
      const isExpanded = visibleExpanded.has(chapter.id);
      return [
        <tr key={chapter.id} className="border-t bg-muted/40">
          <th colSpan={6} className="px-3 py-2 text-left font-medium">
            <button
              type="button"
              aria-label={`${isExpanded ? "Contraer" : "Expandir"} ${chapter.descripcion}`}
              aria-expanded={isExpanded}
              onClick={() =>
                setExpanded((previous) => {
                  const next = new Set(previous);
                  if (isExpanded) next.delete(chapter.id);
                  else next.add(chapter.id);
                  return next;
                })
              }
              className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
            >
              {isExpanded ? "▾" : "▸"}
            </button>
            {chapter.item} · {chapter.descripcion}
          </th>
        </tr>,
        ...(isExpanded ? renderChapters(chapter.subcapitulos) : []),
        ...(isExpanded
          ? chapter.rubros.map((rubro) => (
              <tr
                key={rubro.id}
                tabIndex={0}
                aria-selected={selected?.id === rubro.id}
                onClick={() => select(rubro)}
                onKeyDown={(event) => activate(event, rubro)}
                className="cursor-pointer border-t hover:bg-muted/50 aria-selected:bg-muted"
              >
                <td className="px-3 py-2">{rubro.item}</td>
                <td className="px-3 py-2">{rubro.descripcion}</td>
                <td className="px-3 py-2">{rubro.unidad}</td>
                <td className="px-3 py-2">{rubro.cantidad}</td>
                <td className="px-3 py-2">{rubro.precioUnitario}</td>
                <td className="px-3 py-2">{rubro.precioTotal}</td>
              </tr>
            ))
          : []),
      ];
    });

  if (!entries.length)
    return (
      <output className="p-4 text-sm text-muted-foreground">
        Este presupuesto no contiene rubros.
      </output>
    );
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Árbol compacto del presupuesto</caption>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2">Ítem</th>
            <th className="px-3 py-2">Descripción</th>
            <th className="px-3 py-2">Und.</th>
            <th className="px-3 py-2">Cantidad</th>
            <th className="px-3 py-2">P.U.</th>
            <th className="px-3 py-2">Parcial</th>
          </tr>
        </thead>
        <tbody>{renderChapters(presupuesto.capitulos)}</tbody>
      </table>
    </div>
  );
}
