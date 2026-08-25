import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ProyectoResponse } from "@/api/contract";
import { ChevronsUpDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Migaja del proyecto activo que además conmuta entre proyectos: la identidad y
 * el cambio de contexto viven en el mismo control.
 */
export function SelectorProyecto({ nombre }: { nombre: string }) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: qk.proyectos(),
    queryFn: () => get<{ contenido: ProyectoResponse[] }>("/proyectos"),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Seleccionar proyecto"
        className="flex max-w-64 items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-muted"
      >
        <span className="truncate">{nombre}</span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Cambiar de proyecto</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {data?.contenido.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => navigate(`/proyectos/${p.id}`)}>
              <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
              <span className="truncate">{p.nombreProyecto}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
