import { EstadoVacio } from "./EstadoVacio";

/**
 * Pantalla para un módulo cuyo backend todavía no existe (ver
 * `src/lib/disponibilidad.ts`). Nombra qué falta en vez de dejar la
 * pantalla en blanco.
 */
export function ModuloNoDisponible({
  modulo,
  descripcion,
}: {
  modulo: string;
  descripcion: string;
}) {
  return <EstadoVacio titulo={`${modulo} todavía no está disponible`} descripcion={descripcion} />;
}
