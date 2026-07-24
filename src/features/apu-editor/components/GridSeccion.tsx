import type { SeccionEditor } from "../hooks/useApuEditor";
import { FilaDetalle } from "./FilaDetalle";
import { formatearMoneda } from "@/lib/decimal";

interface GridSeccionProps {
  seccion: SeccionEditor;
  onEditarCelda: (
    detalleId: number,
    campo: "cantidad" | "rendimiento" | "precioOverride",
    valor: string,
  ) => Promise<void>;
  onRestaurarHerencia: (detalleId: number) => Promise<void>;
  onEliminarFila: (detalleId: number) => Promise<void>;
}

export function GridSeccion({
  seccion,
  onEditarCelda,
  onRestaurarHerencia,
  onEliminarFila,
}: GridSeccionProps) {
  if (!seccion.filas.length) return null;

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-muted-foreground">
        {seccion.bloque} — {seccion.etiqueta}
      </h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2 font-medium">Insumo</th>
            <th className="p-2 font-medium">U</th>
            <th className="p-2 font-medium num">Cantidad</th>
            {seccion.muestraRendimiento && <th className="p-2 font-medium num">Rendimiento</th>}
            {seccion.muestraRendimiento && <th className="p-2 font-medium num">Costo/hora</th>}
            {!seccion.muestraRendimiento && <th className="p-2 font-medium num">Precio</th>}
            <th className="p-2 font-medium num">Costo</th>
            <th className="p-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {seccion.filas.map((fila) => (
            <FilaDetalle
              key={fila.detalle.id}
              fila={fila}
              muestraRendimiento={seccion.muestraRendimiento}
              onEditarCelda={onEditarCelda}
              onRestaurarHerencia={onRestaurarHerencia}
              onEliminarFila={onEliminarFila}
            />
          ))}
          <tr className="border-t font-semibold">
            <td className="p-2" colSpan={seccion.muestraRendimiento ? 5 : 4}>
              Subtotal {seccion.etiqueta}
            </td>
            <td className="p-2 num">{formatearMoneda(seccion.subtotal)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
