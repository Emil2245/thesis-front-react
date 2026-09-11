import { SearchIcon } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BuscadorFiltrosPlantillasProps {
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
  sistema: boolean;
  onSistemaChange: (activo: boolean) => void;
  personal: boolean;
  onPersonalChange: (activo: boolean) => void;
}

export function BuscadorFiltrosPlantillas({
  busqueda,
  onBusquedaChange,
  sistema,
  onSistemaChange,
  personal,
  onPersonalChange,
}: BuscadorFiltrosPlantillasProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Buscar plantillas"
          placeholder="Buscar plantillas…"
          value={busqueda}
          onChange={(event) => onBusquedaChange(event.target.value)}
          className="pl-9"
        />
      </div>
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
        <legend className="sr-only">Fuentes de plantillas</legend>
        <Label className="gap-2">
          <Checkbox
            checked={sistema}
            onCheckedChange={(checked) => onSistemaChange(checked === true)}
            aria-label="Incluir plantillas del sistema"
          />
          Sistema
        </Label>
        <Label className="gap-2">
          <Checkbox
            checked={personal}
            onCheckedChange={(checked) => onPersonalChange(checked === true)}
            aria-label="Incluir plantillas personales"
          />
          Personales
        </Label>
      </fieldset>
    </div>
  );
}
