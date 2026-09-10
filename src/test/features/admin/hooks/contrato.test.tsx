import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";

import { crearQueryClient } from "@/test/render";
import { espiar, ultima, cuerpoInvalido } from "@/test/espia";
import {
  basesCentralesFixtureAdmin,
  parametrosSistemaFixture,
  usuariosAdminFixture,
  plantillasAdminFixture,
  valoresReferenciaFixture,
} from "@/test/fixtures/admin";
import { ApiError } from "@/api/problem";
import { server } from "@/test/server";
import {
  useAdminBases,
  useAdminBase,
  useCrearBase,
  useEliminarBase,
  useArchivarBase,
  useRenombrarBase,
} from "@/features/admin/hooks/useAdminBases";
import {
  useParametrosSistema,
  useActualizarParametros,
} from "@/features/admin/hooks/useParametrosSistema";
import {
  useUsuariosAdmin,
  useInvitarUsuario,
  useEditarUsuario,
  useEliminarUsuario,
} from "@/features/admin/hooks/useUsuariosAdmin";
import {
  usePlantillasAdmin,
  useCrearPlantillaAdmin,
  useEditarPlantillaAdmin,
  useEliminarPlantillaAdmin,
} from "@/features/admin/hooks/usePlantillasAdmin";
import {
  useValoresReferencia,
  useGuardarValorReferencia,
  useEliminarValorReferencia,
} from "@/features/admin/hooks/useValoresReferencia";
import { USUARIO_CON_PROYECTOS, VALOR_INEXISTENTE } from "@/test/handlers";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// El patrón de MSW necesita comodín de host; el pathname que se afirma no.
const RUTA = "/api/v1";
const BASE_ID = basesCentralesFixtureAdmin[0].id;

let cliente: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  cliente = crearQueryClient();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

// Plan 057 §5: se afirma la *petición que sale* (verbo, ruta exacta, params y
// cuerpo exacto), no solo `isSuccess`. Bases está activa y su contrato se prueba
// también en el hook para detectar deriva antes del render.
describe("contrato de useAdminBases", () => {
  // La ruta real del backend es `/admin/bases-centrales` (AdminBaseCentralResource).
  // `/admin/bases` nunca existió: era la deriva que arrastraba el plan 027.
  it("lista con GET /admin/bases-centrales y manda los filtros como query params", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useAdminBases({ incluirArchivadas: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/bases-centrales");
    expect(p?.ruta).toBe(`${RUTA}/admin/bases-centrales`);
    expect(p?.url.searchParams.get("incluirArchivadas")).toBe("true");
  });

  // El backend devuelve Page y el interceptor traduce `items/total` al contrato
  // interno `contenido/totalElementos` antes de que el schema valide la respuesta.
  it("devuelve la página normalizada y excluye archivadas por defecto", async () => {
    const { result } = renderHook(() => useAdminBases(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const activas = basesCentralesFixtureAdmin.filter((base) => !base.archivada);
    expect(result.current.data?.contenido).toHaveLength(activas.length);
    expect(result.current.data?.totalElementos).toBe(activas.length);
    expect(result.current.data?.contenido[0].nombre).toBe(activas[0].nombre);
  });

  it("manda siempre page y size explícitos", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useAdminBases(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/bases-centrales");
    expect(p?.url.searchParams.get("page")).toBe("0");
    expect(p?.url.searchParams.get("size")).toBe("25");
  });

  it("busca secuencialmente por páginas con tamaño 200 sin GET por id", async () => {
    const peticiones = espiar();
    const target = basesCentralesFixtureAdmin[1];
    server.use(
      http.get("*/api/v1/admin/bases-centrales", ({ request }) => {
        const params = new URL(request.url).searchParams;
        const page = Number(params.get("page"));
        return HttpResponse.json({
          items: page === 0 ? [basesCentralesFixtureAdmin[0]] : [target],
          total: 201,
          page,
          size: 200,
          totalPaginas: 2,
        });
      }),
    );

    const { result } = renderHook(() => useAdminBase(target.id), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(target.id);
    expect(
      peticiones
        .filter((p) => p.metodo === "GET" && p.ruta === `${RUTA}/admin/bases-centrales`)
        .map((p) => [p.url.searchParams.get("page"), p.url.searchParams.get("size")]),
    ).toEqual([
      ["0", "200"],
      ["1", "200"],
    ]);
  });

  it("crea con POST /admin/bases-centrales y un cuerpo de solo `nombre`", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useCrearBase(), { wrapper });
    await result.current.mutateAsync({ nombre: "Base Cámara 2027" });

    const p = ultima(peticiones, "POST", "/admin/bases-centrales");
    expect(p?.ruta).toBe(`${RUTA}/admin/bases-centrales`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ nombre: "Base Cámara 2027" }));
  });

  it("invalida también la caché de búsquedas secuenciales al crear una base", async () => {
    const lookupKey = ["admin", "bases-centrales", BASE_ID, "lookup"] as const;
    cliente.setQueryData(lookupKey, basesCentralesFixtureAdmin[0]);

    const { result } = renderHook(() => useCrearBase(), { wrapper });
    await result.current.mutateAsync({ nombre: "Base Cámara 2027" });

    expect(cliente.getQueryState(lookupKey)?.isInvalidated).toBe(true);
  });

  // PUT /admin/bases-centrales/{id} existe en el backend y no tenía hook.
  it("renombra con PUT /admin/bases-centrales/{id} y un cuerpo de solo `nombre`", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useRenombrarBase(), { wrapper });
    await result.current.mutateAsync({ id: BASE_ID, nombre: "Base Cámara 2028" });

    const p = ultima(peticiones, "PUT", `/admin/bases-centrales/${BASE_ID}`);
    expect(p?.ruta).toBe(`${RUTA}/admin/bases-centrales/${BASE_ID}`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ nombre: "Base Cámara 2028" }));
  });

  // El backend descarta en silencio lo que no conoce (Jackson) y devuelve 200.
  // El handler estricto lo convierte en 400 para que el seam lo vea.
  it("un campo de más en el alta de base es un 400, no un éxito silencioso", async () => {
    const { result } = renderHook(() => useCrearBase(), { wrapper });

    const error = await result.current
      .mutateAsync(cuerpoInvalido({ nombre: "Base", tipo: "CENTRAL" }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });

  it("elimina con DELETE /admin/bases-centrales/{id} usando el UUID de la base", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useEliminarBase(), { wrapper });
    await result.current.mutateAsync(BASE_ID);

    expect(ultima(peticiones, "DELETE", `/admin/bases-centrales/${BASE_ID}`)?.ruta).toBe(
      `${RUTA}/admin/bases-centrales/${BASE_ID}`,
    );
  });

  // Un solo endpoint archiva y restaura (toggle) y no recibe cuerpo: si
  // alguien le añade `{ archivada: true }`, el backend lo rechaza.
  it("archiva/restaura con POST /admin/bases-centrales/{id}/archivar y sin cuerpo", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useArchivarBase(), { wrapper });
    await result.current.mutateAsync(BASE_ID);

    const p = ultima(peticiones, "POST", "/archivar");
    expect(p?.ruta).toBe(`${RUTA}/admin/bases-centrales/${BASE_ID}/archivar`);
    expect(p?.cuerpo).toBeUndefined();
  });
});

// La trampa de esta ruta: el backend expone los parámetros de sistema en el
// recurso de *proyectos*, sin rol de admin (plan 027). Parece un error de copia
// dentro de un hook de admin y alguien lo va a «corregir» a `/admin/…`.
describe("contrato de useParametrosSistema", () => {
  it("lee de /proyectos/parametros-sistema y nunca de /admin", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useParametrosSistema(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(peticiones.map((p) => p.ruta)).toEqual([`${RUTA}/proyectos/parametros-sistema`]);
  });

  // `ParametrosSistemaEditarRequest` declara 10 campos `@NotNull` de los 11
  // numéricos: mandar solo 4, como hacía la pantalla, devuelve 400. Y son
  // `BigDecimal` serializados como número JSON, no como decimal string.
  it("escribe con PUT /proyectos/parametros-sistema los 11 campos como números", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useActualizarParametros(), { wrapper });
    await result.current.mutateAsync({ ...parametrosSistemaFixture });

    const p = ultima(peticiones, "PUT", "/parametros-sistema");
    expect(p?.ruta).toBe(`${RUTA}/proyectos/parametros-sistema`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        porcentajeHerramientaMenor: 0.05,
        porcentajeIndirecto: 0.15,
        iva: 0.12,
        rangoHmMin: 0,
        rangoHmMax: 0.2,
        rangoCiMin: 0,
        rangoCiMax: 1,
        rangoDescuentoMin: 0,
        rangoDescuentoMax: 0.5,
        rangoIvaMin: 0,
        rangoIvaMax: 0.3,
        moneda: "USD",
      }),
    );
  });

  it("un campo mal nombrado en los parámetros es un 400", async () => {
    const { result } = renderHook(() => useActualizarParametros(), { wrapper });

    const error = await result.current
      .mutateAsync(cuerpoInvalido({ porcentajeHm: "0.050000" }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });
});

// `UsuarioAdminResource` (plan 077): el gate `admin-usuarios` sigue cerrado
// (`MODULOS_SIN_BACKEND`), pero el contrato ya se prueba a nivel de hook,
// igual que Bases lo hizo mientras esperaba activarse.
describe("contrato de useUsuariosAdmin", () => {
  it("lista con GET /admin/usuarios y manda page y size explícitos", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useUsuariosAdmin(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/usuarios");
    expect(p?.ruta).toBe(`${RUTA}/admin/usuarios`);
    expect(p?.url.searchParams.get("page")).toBe("0");
    expect(p?.url.searchParams.get("size")).toBe("25");
  });

  it("devuelve la página normalizada con los usuarios del fixture", async () => {
    const { result } = renderHook(() => useUsuariosAdmin(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.contenido).toHaveLength(usuariosAdminFixture.length);
    expect(result.current.data?.totalElementos).toBe(usuariosAdminFixture.length);
  });

  it("manda el filtro q como query param", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useUsuariosAdmin({ q: "ana" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ultima(peticiones, "GET", "/admin/usuarios")?.url.searchParams.get("q")).toBe("ana");
  });

  it("invita con POST /admin/usuarios y un cuerpo de nombre, email y rol", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useInvitarUsuario(), { wrapper });
    await result.current.mutateAsync({
      nombre: "Nuevo Usuario",
      email: "nuevo@example.com",
      rol: "USUARIO",
    });

    const p = ultima(peticiones, "POST", "/admin/usuarios");
    expect(p?.ruta).toBe(`${RUTA}/admin/usuarios`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        nombre: "Nuevo Usuario",
        email: "nuevo@example.com",
        rol: "USUARIO",
      }),
    );
  });

  // Un campo de más (aquí, un email en el alta con una clave distinta) es un
  // 400 del handler estricto, no un éxito silencioso.
  it("un campo desconocido al invitar es un 400, no un éxito silencioso", async () => {
    const { result } = renderHook(() => useInvitarUsuario(), { wrapper });

    const error = await result.current
      .mutateAsync(cuerpoInvalido({ nombre: "X", email: "x@x.com", rol: "USUARIO", activo: true }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });

  // El PUT nunca manda `email`: no es editable por este endpoint aunque el
  // backend real lo ignore en silencio si se lo mandan.
  it("edita con PUT /admin/usuarios/{id} sin mandar email nunca", async () => {
    const peticiones = espiar();
    const objetivo = usuariosAdminFixture[1];

    const { result } = renderHook(() => useEditarUsuario(), { wrapper });
    await result.current.mutateAsync({
      id: objetivo.id,
      nombre: "Editado",
      rol: "USUARIO",
      activo: true,
    });

    const p = ultima(peticiones, "PUT", `/admin/usuarios/${objetivo.id}`);
    expect(p?.ruta).toBe(`${RUTA}/admin/usuarios/${objetivo.id}`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({ nombre: "Editado", rol: "USUARIO", activo: true }),
    );
  });

  it("elimina con DELETE /admin/usuarios/{id}", async () => {
    const peticiones = espiar();
    const objetivo = usuariosAdminFixture[1];

    const { result } = renderHook(() => useEliminarUsuario(), { wrapper });
    await result.current.mutateAsync(objetivo.id);

    expect(ultima(peticiones, "DELETE", `/admin/usuarios/${objetivo.id}`)?.ruta).toBe(
      `${RUTA}/admin/usuarios/${objetivo.id}`,
    );
  });

  // TC-12-P38-03: borrar un usuario con proyectos propios es un 409, no un
  // 204 silencioso.
  it("eliminar un usuario con proyectos propios es un 409 usuario-con-proyectos-impedido", async () => {
    const { result } = renderHook(() => useEliminarUsuario(), { wrapper });

    const error = await result.current.mutateAsync(USUARIO_CON_PROYECTOS).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).slug).toBe("usuario-con-proyectos-impedido");
  });
});

// `PlantillaApuAdminResource` (plan 078): mismo molde que usuarios (077),
// mismo gate cerrado (`admin-plantillas`, plan 081).
describe("contrato de usePlantillasAdmin", () => {
  it("lista con GET /admin/plantillas-apu y manda siempre tipo=SISTEMA", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => usePlantillasAdmin(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/plantillas-apu");
    expect(p?.ruta).toBe(`${RUTA}/admin/plantillas-apu`);
    expect(p?.url.searchParams.get("tipo")).toBe("SISTEMA");
    expect(p?.url.searchParams.get("page")).toBe("0");
    expect(p?.url.searchParams.get("size")).toBe("25");
  });

  // `usuarioId` llega siempre `null` explícito, no ausente (Patrón C): el
  // fixture y el schema lo declaran `.nullable()`, no `.optional()`.
  it("devuelve la página normalizada con usuarioId null explícito", async () => {
    const { result } = renderHook(() => usePlantillasAdmin(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.contenido).toHaveLength(plantillasAdminFixture.length);
    expect(result.current.data?.totalElementos).toBe(plantillasAdminFixture.length);
    expect(result.current.data?.contenido[0].usuarioId).toBeNull();
  });

  it("manda el filtro q como query param", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => usePlantillasAdmin({ q: "porcelanato" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ultima(peticiones, "GET", "/admin/plantillas-apu")?.url.searchParams.get("q")).toBe(
      "porcelanato",
    );
  });

  it("crea con POST /admin/plantillas-apu y un cuerpo de solo desdeApuId, nombre y descripcionRubro", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useCrearPlantillaAdmin(), { wrapper });
    await result.current.mutateAsync({
      desdeApuId: "018f8a20-0000-7000-8000-000000000001",
      nombre: "Plantilla nueva",
      descripcionRubro: "Descripción reutilizable",
    });

    const p = ultima(peticiones, "POST", "/admin/plantillas-apu");
    expect(p?.ruta).toBe(`${RUTA}/admin/plantillas-apu`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        desdeApuId: "018f8a20-0000-7000-8000-000000000001",
        nombre: "Plantilla nueva",
        descripcionRubro: "Descripción reutilizable",
      }),
    );
  });

  it("un campo desconocido al crear es un 400, no un éxito silencioso", async () => {
    const { result } = renderHook(() => useCrearPlantillaAdmin(), { wrapper });

    const error = await result.current
      .mutateAsync(
        cuerpoInvalido({
          desdeApuId: "018f8a20-0000-7000-8000-000000000001",
          nombre: "X",
          tipo: "PERSONAL",
        }),
      )
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });

  // El PUT es semántica de presencia (§9 del plan 078): editar sólo la
  // descripción NO debe mandar la clave `nombre`, y viceversa. Un `!== null`
  // o un objeto completo aquí sería el Patrón C en el lado del request.
  it("edita sólo la descripción con PUT /admin/plantillas-apu/{id} sin mandar nombre", async () => {
    const peticiones = espiar();
    const objetivo = plantillasAdminFixture[0];

    const { result } = renderHook(() => useEditarPlantillaAdmin(), { wrapper });
    await result.current.mutateAsync({ id: objetivo.id, descripcionRubro: "Nueva descripción" });

    const p = ultima(peticiones, "PUT", `/admin/plantillas-apu/${objetivo.id}`);
    expect(p?.ruta).toBe(`${RUTA}/admin/plantillas-apu/${objetivo.id}`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ descripcionRubro: "Nueva descripción" }));
    expect(p?.cuerpo).not.toHaveProperty("nombre");
  });

  it("edita sólo el nombre con PUT /admin/plantillas-apu/{id} sin mandar descripcionRubro", async () => {
    const peticiones = espiar();
    const objetivo = plantillasAdminFixture[0];

    const { result } = renderHook(() => useEditarPlantillaAdmin(), { wrapper });
    await result.current.mutateAsync({ id: objetivo.id, nombre: "Nombre editado" });

    const p = ultima(peticiones, "PUT", `/admin/plantillas-apu/${objetivo.id}`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ nombre: "Nombre editado" }));
    expect(p?.cuerpo).not.toHaveProperty("descripcionRubro");
  });

  it("elimina con DELETE /admin/plantillas-apu/{id}", async () => {
    const peticiones = espiar();
    const objetivo = plantillasAdminFixture[0];

    const { result } = renderHook(() => useEliminarPlantillaAdmin(), { wrapper });
    await result.current.mutateAsync(objetivo.id);

    expect(ultima(peticiones, "DELETE", `/admin/plantillas-apu/${objetivo.id}`)?.ruta).toBe(
      `${RUTA}/admin/plantillas-apu/${objetivo.id}`,
    );
  });
});

// `ValorReferenciaAdminResource` (plan 079): mismo molde que plantillas
// (078), mismo gate cerrado (`admin-valores`, plan 081).
describe("contrato de useValoresReferencia", () => {
  it("lista con GET /admin/valores-referencia y NO manda q", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useValoresReferencia(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/valores-referencia");
    expect(p?.ruta).toBe(`${RUTA}/admin/valores-referencia`);
    expect(p?.url.searchParams.get("page")).toBe("0");
    expect(p?.url.searchParams.get("size")).toBe("25");
    expect(p?.url.searchParams.has("q")).toBe(false);
  });

  it("devuelve la página normalizada con valor como string", async () => {
    const { result } = renderHook(() => useValoresReferencia(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.contenido).toHaveLength(valoresReferenciaFixture.length);
    expect(result.current.data?.totalElementos).toBe(valoresReferenciaFixture.length);
    expect(result.current.data?.contenido[0].valor).toBe(valoresReferenciaFixture[0].valor);
    expect(typeof result.current.data?.contenido[0].valor).toBe("string");
  });

  // §9bis: el upsert distingue creación de actualización sólo por el status.
  // Una clave ya sembrada → 200; una clave nueva → 201. La UI no debe
  // adivinarlo mirando la lista.
  it("actualiza (200, creado=false) con PUT /admin/valores-referencia/{clave} sobre una clave existente", async () => {
    const peticiones = espiar();
    const objetivo = valoresReferenciaFixture[0];

    const { result } = renderHook(() => useGuardarValorReferencia(), { wrapper });
    const respuesta = await result.current.mutateAsync({
      clave: objetivo.clave,
      valor: "500.00",
      descripcion: "Descripción actualizada",
      fuente: "Fuente actualizada",
    });

    expect(respuesta.creado).toBe(false);
    expect(toast.success).toHaveBeenCalledWith("Valor actualizado");
    const p = ultima(peticiones, "PUT", `/admin/valores-referencia/${objetivo.clave}`);
    expect(p?.ruta).toBe(`${RUTA}/admin/valores-referencia/${objetivo.clave}`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        valor: "500.00",
        descripcion: "Descripción actualizada",
        fuente: "Fuente actualizada",
      }),
    );
    expect(p?.cuerpo).not.toHaveProperty("clave");
  });

  it("crea (201, creado=true) con PUT /admin/valores-referencia/{clave} sobre una clave nueva", async () => {
    const { result } = renderHook(() => useGuardarValorReferencia(), { wrapper });
    const respuesta = await result.current.mutateAsync({
      clave: "NUEVA_CLAVE",
      valor: "1.6",
      descripcion: "Descripción nueva",
      fuente: "Fuente nueva",
    });

    expect(respuesta.creado).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Valor creado");
  });

  // Una clave con "/" es la prueba real de la codificación: sin
  // `encodeURIComponent` parte la ruta en un segmento de más y la petición no
  // casa con `:clave` en absoluto (MSW la rechaza por no tener handler). Un
  // espacio no sirve para esto: `URL` lo normaliza a `%20` igual sin ayuda.
  it("codifica la clave en la ruta", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useGuardarValorReferencia(), { wrapper });
    await result.current.mutateAsync({
      clave: "A/B",
      valor: "1",
      descripcion: "d",
      fuente: "f",
    });

    expect(
      ultima(peticiones, "PUT", `/admin/valores-referencia/${encodeURIComponent("A/B")}`)?.ruta,
    ).toBe(`${RUTA}/admin/valores-referencia/${encodeURIComponent("A/B")}`);
  });

  it("un campo desconocido al guardar es un 400, no un éxito silencioso", async () => {
    const { result } = renderHook(() => useGuardarValorReferencia(), { wrapper });

    const error = await result.current
      .mutateAsync(
        cuerpoInvalido({
          clave: "SBU",
          valor: "1",
          descripcion: "d",
          fuente: "f",
          extra: "no-deberia-ir",
        }),
      )
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });

  it("elimina con DELETE /admin/valores-referencia/{clave}", async () => {
    const peticiones = espiar();
    const objetivo = valoresReferenciaFixture[0];

    const { result } = renderHook(() => useEliminarValorReferencia(), { wrapper });
    await result.current.mutateAsync(objetivo.clave);

    expect(ultima(peticiones, "DELETE", `/admin/valores-referencia/${objetivo.clave}`)?.ruta).toBe(
      `${RUTA}/admin/valores-referencia/${objetivo.clave}`,
    );
  });

  it("borrar una clave inexistente es un 404, no un 204 silencioso", async () => {
    const { result } = renderHook(() => useEliminarValorReferencia(), { wrapper });

    const error = await result.current.mutateAsync(VALOR_INEXISTENTE).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).slug).toBe("no-encontrado");
  });
});
