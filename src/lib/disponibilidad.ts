/**
 * Módulos que esta UI todavía no puede usar contra el backend real. Verificado
 * en ../thesis-back-quarkus @ origin/main: 30 recursos JAX-RS, con presupuesto,
 * cronograma, plantillas de APU, plantillas de proyecto y admin de bases
 * centrales presentes. Quitar uno de este conjunto es lo único que hace falta
 * para encenderlo.
 *
 * Dos motivos distintos conviven aquí, y no conviene confundirlos:
 *
 * - Backend presente, front sin alinear todavía: "plantillas" (plan 048). Sale
 *   del conjunto en cuanto se alinee.
 * - Backend parcial, y aun así encendido: "documentos" salió del conjunto con el
 *   plan 051. El backend solo genera la especificación técnica en DOCX, pero la
 *   genera de verdad, y la pantalla dice en su propio texto qué falta. Un módulo
 *   que funciona a medias no es lo mismo que uno que no existe.
 * - Backend ausente a propósito: "descuento-global". La especificación se cerró
 *   el 2026-08-31 (thesis-docs v1.3 §2.5.4 / N04 §A1) pero no hay ni un endpoint
 *   en origin/main; el único DescuentoGlobalService vive en la rama test/stuff,
 *   que el proyecto decidió no mergear. No está pendiente de entrega: volver a
 *   añadirlo sería un cambio de especificación (plan 054).
 *
 * «admin» ya no es una sola clave (plan 050). Dentro del grupo convivían una
 * pantalla con backend completo —bases centrales, `AdminBaseCentralResource`—
 * y cuatro sin ningún endpoint, así que la clave gruesa apagaba la única que
 * funcionaba. El gate es por página: `admin-usuarios`, `admin-plantillas`,
 * `admin-valores` y `admin-logs`. Bases y Parámetros no aparecen porque su
 * backend existe.
 */
export const MODULOS_SIN_BACKEND = new Set([
  "plantillas",
  "admin-usuarios",
  "admin-plantillas",
  "admin-valores",
  "admin-logs",
  "descuento-global",
] as const);

export type ModuloSinBackend = typeof MODULOS_SIN_BACKEND extends Set<infer T> ? T : never;

export const MOTIVO_SIN_BACKEND = "Disponible cuando el backend implemente esta operación.";
