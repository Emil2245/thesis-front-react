import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { CapituloResponse, PresupuestoResponse, RubroResponse } from "@/api/contract";

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

function coincideConBusqueda(rubro: RubroResponse, query: string) {
  return [rubro.item, rubro.codigo, rubro.descripcion, rubro.unidad].some((valor) =>
    valor.toLocaleLowerCase().includes(query),
  );
}

function filtrarCapitulos(capitulos: CapituloResponse[], query: string): CapituloResponse[] {
  if (!query) return capitulos;

  return capitulos.flatMap((capitulo) => {
    const rubros = capitulo.rubros.filter((rubro) => coincideConBusqueda(rubro, query));
    const subcapitulos = filtrarCapitulos(capitulo.subcapitulos, query);
    if (!rubros.length && !subcapitulos.length) return [];

    return [{ ...capitulo, rubros, subcapitulos }];
  });
}

export function PresupuestoCompacto({
  presupuesto,
  busqueda = "",
}: {
  presupuesto: PresupuestoResponse;
  busqueda?: string;
}) {
  const [params, setParams] = useSearchParams();
  const entries = useMemo(() => collectRubros(presupuesto.capitulos), [presupuesto.capitulos]);
  const selectedId = params.get("rubro");
  const selected = entries.find(({ rubro }) => rubro.id === selectedId)?.rubro;
  const query = busqueda.trim().toLocaleLowerCase();
  const capitulosVisibles = useMemo(
    () => filtrarCapitulos(presupuesto.capitulos, query),
    [presupuesto.capitulos, query],
  );
  const matchingEntries = useMemo(() => collectRubros(capitulosVisibles), [capitulosVisibles]);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(presupuesto.capitulos.map((capitulo) => capitulo.id)),
  );

  const visibleExpanded = useMemo(() => {
    const forced = selected
      ? entries.find(({ rubro }) => rubro.id === selected.id)?.ancestors
      : undefined;
    return new Set([
      ...expanded,
      ...(forced ?? []),
      ...(query ? matchingEntries.flatMap(({ ancestors }) => ancestors) : []),
    ]);
  }, [entries, expanded, matchingEntries, query, selected]);

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
      const hasChildren = chapter.subcapitulos.length > 0 || chapter.rubros.length > 0;
      return [
        <tr key={chapter.id} className="border-t bg-muted/40">
          <th colSpan={6} className="px-2 py-1.5 text-left font-medium">
            <button
              type="button"
              disabled={!hasChildren}
              aria-label={
                hasChildren
                  ? `${isExpanded ? "Contraer" : "Expandir"} ${chapter.descripcion}`
                  : `Sin contenido ${chapter.descripcion}`
              }
              aria-expanded={hasChildren ? isExpanded : undefined}
              onClick={() =>
                setExpanded((previous) => {
                  const next = new Set(previous);
                  if (isExpanded) next.delete(chapter.id);
                  else next.add(chapter.id);
                  return next;
                })
              }
              className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted disabled:cursor-default disabled:opacity-40"
            >
              <span aria-hidden>{hasChildren ? (isExpanded ? "▾" : "▸") : "•"}</span>
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
                <td className="px-2 py-1.5">{rubro.item}</td>
                <td className="px-2 py-1.5">{rubro.descripcion}</td>
                <td className="px-2 py-1.5">{rubro.unidad}</td>
                <td className="px-2 py-1.5">{rubro.cantidad}</td>
                <td className="px-2 py-1.5">{rubro.precioUnitario}</td>
                <td className="px-2 py-1.5">{rubro.precioTotal}</td>
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

  if (query && !matchingEntries.length)
    return (
      <output className="block p-4 text-sm text-muted-foreground">No se encontraron rubros.</output>
    );

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">Árbol compacto del presupuesto</caption>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-2 py-1.5">Ítem</th>
            <th className="px-2 py-1.5">Descripción</th>
            <th className="px-2 py-1.5">Und.</th>
            <th className="px-2 py-1.5">Cantidad</th>
            <th className="px-2 py-1.5">P.U.</th>
            <th className="px-2 py-1.5">Parcial</th>
          </tr>
        </thead>
        <tbody>{renderChapters(capitulosVisibles)}</tbody>
      </table>
    </div>
  );
}
