import type { SeccionEditor } from "../hooks/useApuEditor";
import { FilaDetalle } from "./FilaDetalle";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { formatearMoneda } from "@/lib/decimal";

interface GridSeccionProps {
  seccion: SeccionEditor;
  onEditarCelda: (
    detalleId: string,
    campo: "cantidad" | "rendimiento" | "precioOverride",
    valor: string,
  ) => Promise<void>;
  onRestaurarHerencia: (detalleId: string) => Promise<void>;
  onEliminarFila: (detalleId: string) => Promise<void>;
  onReordenarFila: (detalleId: string, nuevoOrden: number) => Promise<void>;
}

export function GridSeccion({
  seccion,
  onEditarCelda,
  onRestaurarHerencia,
  onEliminarFila,
  onReordenarFila,
}: GridSeccionProps) {
  if (!seccion.filas.length) return null;

  return (
    <TarjetaTabla
      titulo={
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex size-4.5 items-center justify-center rounded-sm bg-muted text-[11px] font-semibold text-muted-foreground"
          >
            {seccion.bloque}
          </span>
          {seccion.etiqueta}
        </span>
      }
      accion={
        <span className="num text-sm text-muted-foreground">
          Subtotal {formatearMoneda(seccion.subtotal)}
        </span>
      }
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">Detalle de {seccion.etiqueta}</caption>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th scope="col" className="h-8 px-2.5 font-medium">
                Insumo
              </th>
              <th scope="col" className="h-8 w-14 px-2.5 font-medium">
                U
              </th>
              <th scope="col" className="num h-8 w-24 px-2.5 font-medium">
                Cantidad
              </th>
              {seccion.muestraRendimiento && (
                <th scope="col" className="num h-8 w-28 px-2.5 font-medium">
                  Rendimiento
                </th>
              )}
              {seccion.muestraRendimiento && (
                <th scope="col" className="num h-8 w-28 px-2.5 font-medium">
                  Costo/hora
                </th>
              )}
              {!seccion.muestraRendimiento && (
                <th scope="col" className="num h-8 w-32 px-2.5 font-medium">
                  Precio
                </th>
              )}
              <th scope="col" className="num h-8 w-28 px-2.5 font-medium">
                Costo
              </th>
              <th scope="col" className="h-8 w-10 px-2.5">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {seccion.filas.map((fila, indice) => (
              <FilaDetalle
                key={fila.detalle.id}
                fila={fila}
                muestraRendimiento={seccion.muestraRendimiento}
                onEditarCelda={onEditarCelda}
                onRestaurarHerencia={onRestaurarHerencia}
                onEliminarFila={onEliminarFila}
                onReordenarFila={onReordenarFila}
                indice={indice}
                totalFilas={seccion.filas.length}
              />
            ))}
          </tbody>
        </table>
      </div>
    </TarjetaTabla>
  );
}
