import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CAPITULO_AL_FINAL, type OpcionCapitulo } from "./capitulos";

interface SelectorCapituloProps {
  opciones: OpcionCapitulo[];
  value: string;
  onValueChange: (value: string) => void;
}

export function SelectorCapitulo({ opciones, value, onValueChange }: SelectorCapituloProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor="destino-capitulo">Capítulo de destino</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="destino-capitulo" aria-label="Capítulo de destino" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CAPITULO_AL_FINAL}>Al final (última hoja)</SelectItem>
          {opciones.map(({ capitulo, profundidad }) => (
            <SelectItem key={capitulo.id} value={capitulo.id}>
              {"— ".repeat(profundidad)}
              {capitulo.item} · {capitulo.descripcion}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
