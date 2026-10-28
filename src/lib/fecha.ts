import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Formatea una fecha calendario `YYYY-MM-DD` (p. ej. `LocalDate` del back) como
 * «1 de marzo de 2026». `new Date("YYYY-MM-DD")` la interpreta como medianoche UTC
 * y en UTC−5 muestra el día anterior; `parseISO` la interpreta como fecha local.
 */
export function formatearFechaLarga(iso: string): string {
  return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es });
}
