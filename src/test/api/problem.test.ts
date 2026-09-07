import { cuerpoInvalido } from "@/test/espia";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { ApiError, PROBLEM_TYPES, problemDesconocido } from "@/api/problem";
import { get } from "@/api/request";
import { server } from "@/test/server";

const API = "*/api/v1";

/**
 * El backend NO habla RFC 7807. `GlobalExceptionMapper`, `ProblemaException`,
 * `SeguridadExceptionMapper`, `ValidacionExceptionMapper` y el helper
 * `AuthService.error(...)` envuelven TODO en
 * `record ErrorPayload(String codigo, String mensaje)`: dos strings, sin
 * `type`/`title`/`status`/`detail`/`errores[]`.
 *
 * Mientras `slug` leía `type`, `is()` devolvía `false` contra un cuerpo real y
 * todas las ramas de error del frontend caían al mensaje genérico.
 */
describe("ApiError contra el cuerpo real del backend", () => {
  it("lee el slug de `codigo`, tal cual lo manda el backend", () => {
    const e = new ApiError({ codigo: "insumo-en-uso", mensaje: "En uso" }, 409);
    expect(e.slug).toBe("insumo-en-uso");
  });

  it("no revienta cuando el cuerpo del error viene vacío", () => {
    const e = new ApiError(cuerpoInvalido({}), 500);
    expect(e.slug).toBe("");
    expect(e.is("validacion")).toBe(false);
  });

  it("usa `mensaje` como Error.message", () => {
    const e = new ApiError({ codigo: "validacion", mensaje: "Las contraseñas no coinciden" }, 400);
    expect(e.message).toBe("Las contraseñas no coinciden");
  });

  // Cada uno de estos es una rama muerta hoy en producción: el cuerpo llega
  // como lo manda `origin/main` y `is()` tiene que reconocerlo.
  it.each([
    ["credenciales-invalidas", 401, "Correo o contraseña incorrectos"],
    ["email-no-verificado", 403, "El correo no ha sido verificado"],
    ["cuenta-desactivada", 403, "La cuenta está desactivada"],
    ["codigo-duplicado", 400, "El código ya existe"],
    ["apu-referenciado", 409, "El APU está referenciado"],
    ["token-invalido-o-expirado", 410, "Token inválido o expirado"],
    ["cooldown-activo", 429, "Debe esperar antes de reenviar"],
    ["acceso-denegado", 403, "No posee los permisos necesarios"],
  ])("reconoce %s tal como sale del backend", async (codigo, status, mensaje) => {
    server.use(http.get(`${API}/cosas`, () => HttpResponse.json({ codigo, mensaje }, { status })));

    const err = (await get("/cosas").catch((e: unknown) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.is(codigo as (typeof PROBLEM_TYPES)[number])).toBe(true);
    expect(err.problem.mensaje).toBe(mensaje);
    expect(err.status).toBe(status);
  });

  /**
   * El 409 de configurar cronograma no manda `ErrorPayload` sino
   * `CronogramaConflictoPayload(codigo, mensaje, perdidas)`. El cuerpo de error
   * es un superconjunto, así que validarlo no puede tirar los campos de más.
   */
  it("conserva los campos extra del cuerpo de error (perdidas del cronograma)", async () => {
    server.use(
      http.get(`${API}/cosas`, () =>
        HttpResponse.json(
          {
            codigo: "configuracion-cronograma-requiere-confirmacion",
            mensaje: "Se perderá avance",
            perdidas: [{ rubroId: "r1" }],
          },
          { status: 409 },
        ),
      ),
    );

    const err = (await get("/cosas").catch((e: unknown) => e)) as ApiError;

    expect(err.is("configuracion-cronograma-requiere-confirmacion")).toBe(true);
    expect(err.problem.perdidas).toEqual([{ rubroId: "r1" }]);
  });

  /**
   * El catálogo son EXACTAMENTE los códigos que emite `origin/main` @ c337950.
   * `insumo-en-uso`, `export-bloqueado` y `csv-invalido` no existen en el
   * backend: cero apariciones en todo el repo.
   */
  it("el catálogo son los códigos que el backend emite de verdad", () => {
    expect([...PROBLEM_TYPES].sort()).toEqual(
      [
        "acceso-denegado",
        "apu-referenciado",
        "base-no-archivada",
        "codigo-duplicado",
        "configuracion-cronograma-requiere-confirmacion",
        "cooldown-activo",
        "credenciales-invalidas",
        "cronograma-ya-existe",
        "cuenta-desactivada",
        "email-no-verificado",
        "fila-protegida",
        "no-encontrado",
        "segmento-solapado",
        "servidor",
        "token-invalido-o-expirado",
        "validacion",
        "version-vigente-protegida",
        "vigente-duplicado",
      ].sort(),
    );
  });

  it("no inventa códigos que el backend no emite", () => {
    for (const inventado of ["insumo-en-uso", "export-bloqueado", "csv-invalido"]) {
      expect(PROBLEM_TYPES).not.toContain(inventado);
    }
  });

  /**
   * Sin respuesta no hay `ErrorPayload`: el código es del cliente y queda
   * fuera del catálogo a propósito, como `respuesta-invalida` del plan 028.
   * Antes decía `no-encontrado`, así que un cable suelto se hacía pasar por 404.
   */
  it("marca la ausencia de respuesta con un código fuera del catálogo", () => {
    const p = problemDesconocido(0, "Network Error");
    expect(p.mensaje).toBe("Network Error");
    expect(PROBLEM_TYPES).not.toContain(p.codigo);
  });
});
