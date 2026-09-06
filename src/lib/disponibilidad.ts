/**
 * Módulos que esta UI todavía no puede usar contra el backend real. Verificado
 * en ../thesis-back-quarkus @ origin/main: 30 recursos JAX-RS, con presupuesto,
 * cronograma, plantillas de APU, plantillas de proyecto y admin de bases
 * centrales presentes. Quitar uno de este conjunto es lo único que hace falta
 * para encenderlo.
 *
 * Dos motivos distintos conviven aquí, y no conviene confundirlos:
 *
 * - Backend presente, front sin alinear todavía: "plantillas" (plan 048),
 *   "plantillas-proyecto" (plan 049). Salen del conjunto en cuanto se alineen.
 * - Backend parcial: "documentos" (solo la ET en DOCX, plan 051) y "admin"
 *   (solo bases centrales; usuarios, logs y parámetros no existen, plan 050).
 * - Backend ausente a propósito: "descuento-global". La especificación se cerró
 *   el 2026-08-31 (thesis-docs v1.3 §2.5.4 / N04 §A1) pero no hay ni un endpoint
 *   en origin/main; el único DescuentoGlobalService vive en la rama test/stuff,
 *   que el proyecto decidió no mergear. No está pendiente de entrega: volver a
 *   añadirlo sería un cambio de especificación (plan 054).
 */
export const MODULOS_SIN_BACKEND = new Set([
  "documentos",
  "plantillas",
  "plantillas-proyecto",
  "admin",
  "descuento-global",
] as const);

export type ModuloSinBackend = typeof MODULOS_SIN_BACKEND extends Set<infer T> ? T : never;

export const MOTIVO_SIN_BACKEND = "Disponible cuando el backend implemente esta operación.";
