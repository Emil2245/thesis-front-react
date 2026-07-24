import { useState, useCallback } from "react";
import { FilaCapitulo } from "./FilaCapitulo";
import { FilaRubro } from "./FilaRubro";
import type { CapituloResponse, PresupuestoResponse } from "@/api/contract";

interface ArbolPresupuestoProps {
  presupuesto: PresupuestoResponse;
  onAgregarSub: (padreId: number) => void;
  onEditarCapitulo: (capitulo: CapituloResponse) => void;
  onEliminarCapitulo: (capitulo: CapituloResponse) => void;
  onMoverCapitulo: (capitulo: CapituloResponse) => void;
  onAgregarRubro: (capituloId: number) => void;
  onEliminarRubro: (capituloId: number, rubroId: number) => void;
  onCantidadChange: (capituloId: number, rubroId: number, cantidad: string) => void;
}

export function ArbolPresupuesto({
  presupuesto,
  onAgregarSub,
  onEditarCapitulo,
  onEliminarCapitulo,
  onMoverCapitulo,
  onAgregarRubro,
  onEliminarRubro,
  onCantidadChange,
}: ArbolPresupuestoProps) {
  const [expandidos, setExpandidos] = useState<Set<number>>(() => new Set());

  const toggle = useCallback((id: number) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderCapitulo = (cap: CapituloResponse, nivel: number) => {
    const estaExpandido = expandidos.has(cap.id);
    return (
      <div key={cap.id}>
        <FilaCapitulo
          capitulo={cap}
          nivel={nivel}
          expandido={estaExpandido}
          onToggle={() => toggle(cap.id)}
          onAgregarSub={onAgregarSub}
          onEditar={onEditarCapitulo}
          onEliminar={onEliminarCapitulo}
          onMover={onMoverCapitulo}
          onAgregarRubro={onAgregarRubro}
        />
        {estaExpandido && (
          <div>
            {(cap.subcapitulos ?? []).map((sub) => renderCapitulo(sub, nivel + 1))}
            {(cap.rubros ?? []).map((r) => (
              <FilaRubro
                key={r.id}
                rubro={r}
                nivel={nivel + 1}
                onEliminar={(rubroId) => onEliminarRubro(cap.id, rubroId)}
                onCantidadChange={(rubroId, cantidad) =>
                  onCantidadChange(cap.id, rubroId, cantidad)
                }
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {presupuesto.capitulos.map((c) => renderCapitulo(c, 0))}
    </div>
  );
}
