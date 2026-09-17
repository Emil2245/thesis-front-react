import { useMemo, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, Dot, GripVerticalIcon } from "lucide-react";
import type { CapituloResponse, PresupuestoResponse, RubroResponse } from "@/api/contract";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Moneda } from "@/components/comunes/Moneda";
import { DialogoCapitulo } from "@/features/presupuesto/components/DialogoCapitulo";
import { useCapituloMutaciones } from "@/features/presupuesto/hooks/useCapituloMutaciones";
import { useRubroMutaciones } from "@/features/presupuesto/hooks/useRubroMutaciones";
import { formatearNumero } from "@/lib/decimal";
import { cn } from "@/lib/utils";

type RubroEntry = { rubro: RubroResponse; ancestors: string[] };
type CapituloPosition = {
  chapter: CapituloResponse;
  siblings: CapituloResponse[];
  parentId: string | null;
  index: number;
};

type RubroEliminar = {
  capituloId: string;
  rubro: RubroResponse;
};

function collectRubros(capitulos: CapituloResponse[], ancestors: string[] = []): RubroEntry[] {
  return capitulos.flatMap((capitulo) => {
    const path = [...ancestors, capitulo.id];
    return [
      ...capitulo.rubros.map((rubro) => ({ rubro, ancestors: path })),
      ...collectRubros(capitulo.subcapitulos, path),
    ];
  });
}

function collectCapituloIds(capitulos: CapituloResponse[]): string[] {
  return capitulos.flatMap((capitulo) => [
    capitulo.id,
    ...collectCapituloIds(capitulo.subcapitulos),
  ]);
}

function findChapterPosition(
  chapters: CapituloResponse[],
  chapterId: string,
  parentId: string | null = null,
): CapituloPosition | null {
  const index = chapters.findIndex((chapter) => chapter.id === chapterId);
  if (index >= 0) {
    return { chapter: chapters[index], siblings: chapters, parentId, index };
  }

  for (const chapter of chapters) {
    const nested = findChapterPosition(chapter.subcapitulos, chapterId, chapter.id);
    if (nested) return nested;
  }

  return null;
}

function containsChapter(chapter: CapituloResponse, chapterId: string): boolean {
  return chapter.subcapitulos.some(
    (child) => child.id === chapterId || containsChapter(child, chapterId),
  );
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
  const { actualizarCantidad, eliminar: eliminarRubro } = useRubroMutaciones(
    presupuesto.presupuestoId,
  );
  const { crear, mover, eliminar } = useCapituloMutaciones(presupuesto.presupuestoId);
  const entries = useMemo(() => collectRubros(presupuesto.capitulos), [presupuesto.capitulos]);
  const capituloIds = useMemo(
    () => collectCapituloIds(presupuesto.capitulos),
    [presupuesto.capitulos],
  );
  const selectedId = params.get("rubro");
  const selected = entries.find(({ rubro }) => rubro.id === selectedId)?.rubro;
  const query = busqueda.trim().toLocaleLowerCase();
  const capitulosVisibles = useMemo(
    () => filtrarCapitulos(presupuesto.capitulos, query),
    [presupuesto.capitulos, query],
  );
  const matchingEntries = useMemo(() => collectRubros(capitulosVisibles), [capitulosVisibles]);
  const [colapsados, setColapsados] = useState<Set<string>>(() => new Set());
  const [dialogoCapitulo, setDialogoCapitulo] = useState<{ padreId?: string } | null>(null);
  const [capituloEliminar, setCapituloEliminar] = useState<CapituloResponse | null>(null);
  const [rubroEliminar, setRubroEliminar] = useState<RubroEliminar | null>(null);
  const [capituloArrastrado, setCapituloArrastrado] = useState<string | null>(null);
  const [objetivoArrastre, setObjetivoArrastre] = useState<{
    id: string;
    after: boolean;
  } | null>(null);

  const visibleExpanded = useMemo(
    () =>
      new Set([
        ...capituloIds.filter((id) => !colapsados.has(id)),
        ...(query ? matchingEntries.flatMap(({ ancestors }) => ancestors) : []),
      ]),
    [capituloIds, colapsados, matchingEntries, query],
  );

  const toggle = (id: string) => {
    setColapsados((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const moverCapituloRelativo = (chapterId: string, desplazamiento: -1 | 1) => {
    const position = findChapterPosition(presupuesto.capitulos, chapterId);
    if (!position) return;

    const nuevoIndice = position.index + desplazamiento;
    if (nuevoIndice < 0 || nuevoIndice >= position.siblings.length) return;

    mover.mutate({
      capituloId: chapterId,
      body: { parentId: position.parentId, orden: nuevoIndice + 1 },
    });
  };

  const moverCapituloArrastrado = (targetId: string, after: boolean) => {
    if (!capituloArrastrado || capituloArrastrado === targetId) return;

    const source = findChapterPosition(presupuesto.capitulos, capituloArrastrado);
    const target = findChapterPosition(presupuesto.capitulos, targetId);
    if (!source || !target || containsChapter(source.chapter, targetId)) return;

    const destinationSiblings = target.siblings.filter(
      (chapter) => chapter.id !== capituloArrastrado,
    );
    const targetIndex = destinationSiblings.findIndex((chapter) => chapter.id === targetId);
    if (targetIndex < 0) return;

    mover.mutate({
      capituloId: capituloArrastrado,
      body: {
        parentId: target.parentId,
        orden: targetIndex + (after ? 2 : 1),
      },
    });
  };

  const iniciarArrastreCapitulo = (event: DragEvent<HTMLButtonElement>, chapterId: string) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", chapterId);
    setCapituloArrastrado(chapterId);
  };

  const finalizarArrastreCapitulo = () => {
    setCapituloArrastrado(null);
    setObjetivoArrastre(null);
  };

  const arrastrarSobreCapitulo = (
    event: DragEvent<HTMLTableRowElement>,
    chapter: CapituloResponse,
  ) => {
    if (!capituloArrastrado || capituloArrastrado === chapter.id) return;
    const source = findChapterPosition(presupuesto.capitulos, capituloArrastrado);
    if (!source || containsChapter(source.chapter, chapter.id)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setObjetivoArrastre({ id: chapter.id, after: event.clientY >= bounds.top + bounds.height / 2 });
  };

  const soltarSobreCapitulo = (event: DragEvent<HTMLTableRowElement>, chapterId: string) => {
    event.preventDefault();
    const after = objetivoArrastre?.id === chapterId ? objetivoArrastre.after : false;
    moverCapituloArrastrado(chapterId, after);
    finalizarArrastreCapitulo();
  };

  const renderChapters = (chapters: CapituloResponse[], nivel = 0): ReactNode[] =>
    chapters.flatMap((chapter) => {
      const isExpanded = visibleExpanded.has(chapter.id);
      const hasChildren = chapter.subcapitulos.length > 0 || chapter.rubros.length > 0;
      const position = findChapterPosition(presupuesto.capitulos, chapter.id);
      const esPrimero = !position || position.index === 0;
      const esUltimo = !position || position.index === position.siblings.length - 1;
      return [
        <ContextMenu key={chapter.id}>
          <ContextMenuTrigger asChild>
            <tr
              className={cn(
                "border-t",
                nivel === 0 ? "bg-muted font-semibold" : "bg-muted/40",
                objetivoArrastre?.id === chapter.id && "ring-1 ring-inset ring-ring",
              )}
              onDragOver={(event) => arrastrarSobreCapitulo(event, chapter)}
              onDrop={(event) => soltarSobreCapitulo(event, chapter.id)}
            >
              <th colSpan={6} className="px-1.5 py-1 text-left">
                <div className="flex min-w-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={!hasChildren}
                    aria-label={
                      hasChildren
                        ? `${isExpanded ? "Contraer" : "Expandir"} ${chapter.descripcion}`
                        : `Sin contenido ${chapter.descripcion}`
                    }
                    aria-expanded={hasChildren ? isExpanded : undefined}
                    onClick={() => toggle(chapter.id)}
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded hover:bg-muted disabled:cursor-default disabled:opacity-40"
                  >
                    {hasChildren ? (
                      isExpanded ? (
                        <ChevronDown className="size-4" aria-hidden />
                      ) : (
                        <ChevronRight className="size-4" aria-hidden />
                      )
                    ) : (
                      <Dot className="size-4 text-muted-foreground" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    draggable
                    aria-label={`Arrastrar ${chapter.descripcion}`}
                    title="Arrastrar para mover"
                    onDragStart={(event) => iniciarArrastreCapitulo(event, chapter.id)}
                    onDragEnd={finalizarArrastreCapitulo}
                    className="inline-flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
                  >
                    <GripVerticalIcon aria-hidden className="size-3.5" />
                  </button>
                  <span className="min-w-0 truncate">
                    {chapter.item} · {chapter.descripcion}
                  </span>
                  <span className="ml-auto whitespace-nowrap font-normal text-muted-foreground">
                    <Moneda valor={chapter.total} />
                  </span>
                </div>
              </th>
            </tr>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => setDialogoCapitulo({ padreId: chapter.id })}>
              Agregar subcapítulo
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger disabled={!position || position.siblings.length <= 1}>
                Mover
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem
                  disabled={esPrimero}
                  onSelect={() => moverCapituloRelativo(chapter.id, -1)}
                >
                  Mover arriba <span className="ml-auto text-xs text-muted-foreground">↑</span>
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={esUltimo}
                  onSelect={() => moverCapituloRelativo(chapter.id, 1)}
                >
                  Mover abajo <span className="ml-auto text-xs text-muted-foreground">↓</span>
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onSelect={() => setCapituloEliminar(chapter)}>
              Eliminar capítulo completo
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>,
        ...(isExpanded ? renderChapters(chapter.subcapitulos, nivel + 1) : []),
        ...(isExpanded
          ? chapter.rubros.map((rubro) => (
              <ContextMenu key={rubro.id}>
                <ContextMenuTrigger asChild>
                  <tr
                    tabIndex={0}
                    aria-selected={selected?.id === rubro.id}
                    onClick={() => select(rubro)}
                    onKeyDown={(event) => activate(event, rubro)}
                    className="cursor-pointer border-t hover:bg-muted/50 aria-selected:bg-muted"
                  >
                    <td className="whitespace-nowrap px-1.5 py-1">{rubro.item}</td>
                    <td className="px-1.5 py-1">{rubro.descripcion}</td>
                    <td className="whitespace-nowrap px-1.5 py-1">{rubro.unidad}</td>
                    <td className="px-1 py-1 text-right">
                      <Input
                        key={`${rubro.id}-${rubro.cantidad}`}
                        type="text"
                        inputMode="decimal"
                        aria-label={`Cantidad de ${rubro.descripcion}`}
                        defaultValue={formatearNumero(rubro.cantidad, { min: 2, max: 2 })}
                        className="h-6 min-w-0 border-transparent bg-transparent px-1 py-0.5 text-right text-sm shadow-none focus-visible:border-ring focus-visible:bg-background"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        onBlur={(event) => {
                          const valorMostrado = formatearNumero(rubro.cantidad, { min: 2, max: 2 });
                          const cantidad = event.currentTarget.value.replace(/,/g, "");
                          if (cantidad !== valorMostrado) {
                            actualizarCantidad.mutate({
                              capituloId: chapter.id,
                              rubroId: rubro.id,
                              cantidad,
                            });
                          }
                        }}
                      />
                    </td>
                    <td className="whitespace-nowrap px-1.5 py-1 text-right">
                      <Moneda valor={rubro.precioUnitario} />
                    </td>
                    <td className="whitespace-nowrap px-1.5 py-1 text-right">
                      <Moneda valor={rubro.precioTotal} />
                    </td>
                  </tr>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onSelect={() => select(rubro)}>
                    Ver detalle del APU
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    variant="destructive"
                    onSelect={() => setRubroEliminar({ capituloId: chapter.id, rubro })}
                  >
                    Eliminar APU del presupuesto
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))
          : []),
      ];
    });

  const confirmarCrearCapitulo = (descripcion: string) => {
    const padreId = dialogoCapitulo?.padreId;
    crear.mutate(padreId ? { descripcion, parentId: padreId } : { descripcion });
    setDialogoCapitulo(null);
  };

  const confirmarEliminarCapitulo = () => {
    if (!capituloEliminar) return;
    eliminar.mutate(capituloEliminar.id);
    setCapituloEliminar(null);
  };

  const confirmarEliminarRubro = () => {
    if (!rubroEliminar) return;
    eliminarRubro.mutate({
      capituloId: rubroEliminar.capituloId,
      rubroId: rubroEliminar.rubro.id,
    });
    setRubroEliminar(null);
  };

  if (!presupuesto.capitulos.length)
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="scrollbar-discreet min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-[500px] flex-col">
          <div className="scrollbar-discreet min-h-0 flex-1 overflow-y-auto">
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">Árbol compacto del presupuesto</caption>
              <colgroup>
                <col className="w-[4.5rem]" />
                <col />
                <col className="w-11" />
                <col className="w-20" />
                <col className="w-[4.75rem]" />
                <col className="w-[5.5rem]" />
              </colgroup>
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-1.5 py-1">Ítem</th>
                  <th className="px-1.5 py-1">Descripción</th>
                  <th className="px-1.5 py-1">Und.</th>
                  <th className="px-1 py-1 text-right">Cantidad</th>
                  <th className="px-1.5 py-1 text-right">P.U.</th>
                  <th className="px-1.5 py-1 text-right">Parcial</th>
                </tr>
              </thead>
              <tbody>{renderChapters(capitulosVisibles)}</tbody>
            </table>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-card px-1.5 py-1.5 text-sm shadow-[0_-4px_10px_-8px_var(--foreground)]">
            <span className="font-medium">Costo total</span>
            <Moneda valor={presupuesto.totalGeneral} className="font-semibold" />
          </div>
        </div>
      </div>
      <DialogoCapitulo
        open={dialogoCapitulo !== null}
        onOpenChange={(open) => {
          if (!open) setDialogoCapitulo(null);
        }}
        onConfirm={confirmarCrearCapitulo}
        titulo={dialogoCapitulo?.padreId ? "Nuevo subcapítulo" : "Nuevo capítulo"}
      />
      <ConfirmarDestructivo
        abierto={capituloEliminar !== null}
        onAbiertoChange={(open) => {
          if (!open) setCapituloEliminar(null);
        }}
        titulo="Eliminar capítulo completo"
        descripcion={
          capituloEliminar
            ? `¿Eliminar el capítulo "${capituloEliminar.descripcion}" y todo su contenido? Esta acción no se puede deshacer.`
            : ""
        }
        onConfirmar={confirmarEliminarCapitulo}
      />
      <ConfirmarDestructivo
        abierto={rubroEliminar !== null}
        onAbiertoChange={(open) => {
          if (!open) setRubroEliminar(null);
        }}
        titulo="Eliminar APU del presupuesto"
        descripcion={
          rubroEliminar
            ? `¿Eliminar el APU "${rubroEliminar.rubro.descripcion}" del presupuesto? El APU seguirá disponible en el catálogo. Esta acción no se puede deshacer.`
            : ""
        }
        onConfirmar={confirmarEliminarRubro}
      />
    </div>
  );
}
