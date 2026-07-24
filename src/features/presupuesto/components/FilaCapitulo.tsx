import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  PlusCircle,
  Edit,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CapituloResponse } from "@/api/contract";

interface FilaCapituloProps {
  capitulo: CapituloResponse;
  nivel: number;
  expandido: boolean;
  onToggle: () => void;
  onAgregarSub: (padreId: number) => void;
  onEditar: (capitulo: CapituloResponse) => void;
  onEliminar: (capitulo: CapituloResponse) => void;
  onMover: (capitulo: CapituloResponse) => void;
  onAgregarRubro: (capituloId: number) => void;
}

export function FilaCapitulo({
  capitulo,
  nivel,
  expandido,
  onToggle,
  onAgregarSub,
  onEditar,
  onEliminar,
  onMover,
  onAgregarRubro,
}: FilaCapituloProps) {
  const tieneHijos = capitulo.subcapitulos.length > 0 || capitulo.rubros.length > 0;

  return (
    <div
      className={cn("flex items-center gap-2 border-b px-2 py-2 hover:bg-muted/50")}
      style={{ paddingLeft: `${nivel * 24 + 8}px` }}
    >
      <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={onToggle}>
        {tieneHijos ? (
          expandido ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )
        ) : (
          <FolderOpen className="size-4 text-muted-foreground" />
        )}
      </Button>
      <span className="min-w-[4rem] text-sm font-mono text-muted-foreground">{capitulo.item}</span>
      <span className="flex-1 text-sm font-medium">{capitulo.descripcion}</span>
      <span className="text-sm font-mono tabular-nums text-right min-w-[7rem]">
        ${Number(capitulo.total).toFixed(2)}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title="Agregar subcapítulo"
          onClick={() => onAgregarSub(capitulo.id)}
        >
          <PlusCircle className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title="Agregar rubro"
          onClick={() => onAgregarRubro(capitulo.id)}
        >
          <ArrowRight className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title="Mover capítulo"
          onClick={() => onMover(capitulo)}
        >
          <Edit className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title="Editar descripción"
          onClick={() => onEditar(capitulo)}
        >
          <Edit className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-destructive"
          title="Eliminar capítulo"
          onClick={() => onEliminar(capitulo)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
