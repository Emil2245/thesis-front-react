import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ProyectoResponse } from "@/api/contract";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SelectorProyecto() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: qk.proyectos(),
    queryFn: () => get<{ contenido: ProyectoResponse[] }>("/proyectos"),
  });

  return (
    <Select onValueChange={(value) => navigate(`/proyectos/${value}`)}>
      <SelectTrigger className="w-64" aria-label="Seleccionar proyecto">
        <SelectValue placeholder="Seleccionar proyecto…" />
      </SelectTrigger>
      <SelectContent>
        {data?.contenido.map((p) => (
          <SelectItem key={p.id} value={String(p.id)}>
            {p.codigo} — {p.nombreProyecto}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
