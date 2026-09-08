/**
 * El cuerpo de error del backend, tal cual. NO es RFC 7807: pese a lo que
 * dicen los javadoc de `ProblemaException` y `DocumentoResource` —los dos
 * mienten, mira el `entity(...)`, no el comentario—, todo error sale como
 *
 *     record ErrorPayload(String codigo, String mensaje) {}
 *
 * Dos strings, y ninguno de los campos de RFC 7807 —ni el descriptor de clase,
 * ni el titular, ni el estado repetido, ni el detalle, ni el array de errores
 * por campo. Los cuatro sitios que construyen errores —`ProblemaException`,
 * `GlobalExceptionMapper`, `SeguridadExceptionMapper`/`ValidacionExceptionMapper`
 * y el helper `AuthService.error(...)`— pasan todos por ahí.
 *
 * El índice abierto no es decoración: el 409 de configurar cronograma manda
 * `CronogramaConflictoPayload(codigo, mensaje, perdidas)`, un superconjunto.
 */
export interface Problem {
  codigo: string;
  mensaje: string;
  [k: string]: unknown;
}

/**
 * Los códigos que `origin/main` @ c337950 emite de verdad, sacados de los
 * cuatro constructores de error del backend. Ni uno inventado.
 *
 * Ojo al enumerarlos: no basta con buscar `new ErrorPayload("...")` ni
 * `ProblemaException.algo("...")`. Los códigos viven en tres capas más:
 * hardcodeados dentro de las factorías estáticas de `ProblemaException`, en el
 * `switch` de `GlobalExceptionMapper.codePorEstatus(status)`, y en el helper
 * privado `AuthService.error(status, codigo, mensaje)`.
 *
 * `insumo-en-uso` y `csv-invalido` NO están: cero apariciones en todo el
 * backend. Ver el plan 063 para qué manda en su lugar cada uno.
 *
 * `export-bloqueado` cayó con ellos contra `c337950` y **volvió** en `5673615`
 * (plan 031 del backend): lo emite `CronogramaDocumentoResource.descargar` con
 * el cuerpo tipado `BloqueoExportDetalle`, un superconjunto de `ErrorPayload`.
 */
export const PROBLEM_TYPES = [
  // GlobalExceptionMapper.codePorEstatus + ValidacionExceptionMapper
  "validacion",
  "no-encontrado",
  "credenciales-invalidas",
  "acceso-denegado",
  "token-invalido-o-expirado",
  "cooldown-activo",
  "servidor",
  // AuthService.error(...)
  "email-no-verificado",
  "cuenta-desactivada",
  // Factorías de ProblemaException
  "codigo-duplicado",
  "apu-referenciado",
  "fila-protegida",
  // ProblemaException.conflicto(codigo, ...) — 409 con código a medida
  "base-no-archivada",
  "vigente-duplicado",
  "version-vigente-protegida",
  "cronograma-ya-existe",
  // Excepciones propias del módulo cronograma, con su propio entity
  "segmento-solapado",
  "configuracion-cronograma-requiere-confirmacion",
  // CronogramaDocumentoResource.descargar — 409 con cuerpo `BloqueoExportDetalle`
  "export-bloqueado",
] as const;

export type ProblemType = (typeof PROBLEM_TYPES)[number];

export class ApiError extends Error {
  problem: Problem;
  status: number;

  constructor(problem: Problem, status: number) {
    super(problem.mensaje);
    this.name = "ApiError";
    this.problem = problem;
    this.status = status;
  }

  /**
   * El backend manda el slug pelado (`"insumo-en-uso"`), sin el prefijo
   * `/problemas/` que este getter le quitaba a un campo que nunca llegó.
   */
  get slug(): string {
    return this.problem.codigo ?? "";
  }

  is(t: ProblemType): boolean {
    return this.slug === t;
  }
}

/**
 * Cuando no hay respuesta (cable suelto, CORS, timeout) no hay `ErrorPayload`:
 * el código lo pone el cliente y queda FUERA de `PROBLEM_TYPES` a propósito,
 * igual que `respuesta-invalida` del plan 028. Antes decía `no-encontrado`, con
 * lo que un fallo de red se hacía pasar por un 404 del servidor.
 */
export function problemDesconocido(status: number, mensaje?: string): Problem {
  return {
    codigo: "sin-respuesta",
    mensaje: mensaje || "Ocurrió un error inesperado",
    status,
  };
}
