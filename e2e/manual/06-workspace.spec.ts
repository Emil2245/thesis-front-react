import { expect, test, type Page } from "@playwright/test";

import { sinViolacionesA11y } from "../axe";
import {
  APU_1,
  PLANTILLA_APU_1,
  PLANTILLA_APU_2,
  PLANTILLA_LOTE_ERROR,
  apuDetalleFixture,
  plantillaDetalleFixture,
} from "../../src/test/fixtures/apu";
import { tokenFixture } from "../../src/test/fixtures/auth";
import { insumosBusquedaFixture, insumosFixture } from "../../src/test/fixtures/insumos";
import {
  CAPITULO_2,
  PRESUPUESTO_V2,
  presupuestoFixture,
  versionesFixture,
} from "../../src/test/fixtures/presupuesto";
import {
  PROYECTO_1,
  parametrosFixture,
  proyectoDetalleFixture,
} from "../../src/test/fixtures/proyectos";

const API = "**/api/v1";
const WORKSPACE = `/proyectos/${PROYECTO_1}/workspace?v=${PRESUPUESTO_V2}`;

const plantillaSistema = {
  id: PLANTILLA_APU_1,
  nombre: "Excavación típica",
  descripcionRubro: "Plantilla base para excavaciones",
  unidad: "m3",
  tipo: "SISTEMA" as const,
  createdAt: "2026-07-01T00:00:00",
  updatedAt: "2026-07-01T00:00:00",
};
const plantillaPersonal = {
  id: PLANTILLA_APU_2,
  nombre: "Replanteo personal",
  descripcionRubro: "Plantilla personal propia",
  unidad: "m2",
  tipo: "PERSONAL" as const,
  createdAt: "2026-07-20T00:00:00",
  updatedAt: "2026-07-20T00:00:00",
};

const json = (body: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

function pagina<T>(items: T[], size = 20) {
  return { items, total: items.length, page: 0, size, totalPaginas: items.length ? 1 : 0 };
}

function presupuestoConRubros(descripciones: string[]) {
  return {
    ...presupuestoFixture,
    capitulos: presupuestoFixture.capitulos.map((capitulo) =>
      capitulo.id === CAPITULO_2
        ? {
            ...capitulo,
            rubros: [
              ...capitulo.rubros,
              ...descripciones.map((descripcion, index) => ({
                id: `0198c1a2-0000-7000-8000-00000000030${index}`,
                item: `2.${index + 2}`,
                codigo: `APU-N${index + 1}`,
                descripcion,
                unidad: "m3",
                cantidad: "1.000000",
                precioUnitario: "10.000000",
                precioTotal: "10.000000",
                apuId: `018f8a40-0000-7000-8000-00000000010${index}`,
              })),
            ],
          }
        : capitulo,
    ),
  };
}

async function baseWorkspace(
  page: Page,
  modoCodigoRubro: "AUTOGENERADO" | "MANUAL" = "AUTOGENERADO",
) {
  await page.route(`${API}/**`, (route) =>
    route.fulfill(
      json({ codigo: "e2e-no-mock", mensaje: `Ruta no simulada: ${route.request().url()}` }, 501),
    ),
  );
  await page.route(`${API}/auth/refresh`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(await route.request().postDataJSON()).toEqual({ refreshToken: "rt-test" });
    await route.fulfill(json(tokenFixture));
  });
  await page.route(`${API}/config/display`, (route) =>
    route.fulfill(json({ precisionDinero: 2, precisionPorcentaje: 4 })),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalleFixture)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/presupuestos*`, (route) =>
    route.fulfill(json(versionesFixture)),
  );
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}`, (route) =>
    route.fulfill(json(presupuestoFixture)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/parametros`, (route) =>
    route.fulfill(json({ ...parametrosFixture, modoCodigoRubro })),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/insumos*`, (route) =>
    route.fulfill(json(pagina(insumosFixture, 200))),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/insumos/selector*`, (route) =>
    route.fulfill(json(pagina(insumosBusquedaFixture, 25))),
  );
  await page.route(`${API}/plantillas-apu/${PLANTILLA_APU_1}`, (route) =>
    route.fulfill(json(plantillaDetalleFixture)),
  );
  await page.route(`${API}/plantillas-apu/${PLANTILLA_APU_2}`, (route) =>
    route.fulfill(
      json({
        ...plantillaDetalleFixture,
        ...plantillaPersonal,
      }),
    ),
  );
  await page.addInitScript(() => localStorage.setItem("apu.refresh", "rt-test"));
}

async function servirBusqueda(page: Page) {
  const consultas: URL[] = [];
  await page.route(`${API}/plantillas-apu/busqueda*`, async (route) => {
    expect(route.request().method()).toBe("GET");
    const url = new URL(route.request().url());
    consultas.push(url);
    expect(
      [...url.searchParams.keys()].every((key) => ["q", "tipo", "page", "size"].includes(key)),
    ).toBe(true);
    expect(url.searchParams.get("page")).toBe("0");
    expect(url.searchParams.get("size")).toBe("20");
    const tipos = url.searchParams.getAll("tipo");
    const q = url.searchParams.get("q")?.toLocaleLowerCase("es-EC") ?? "";
    const items = [plantillaSistema, plantillaPersonal].filter(
      (plantilla) =>
        tipos.includes(plantilla.tipo) && plantilla.nombre.toLocaleLowerCase("es-EC").includes(q),
    );
    await route.fulfill(json(pagina(items)));
  });
  return consultas;
}

async function abrirDialogo(page: Page) {
  await page.goto(WORKSPACE, { waitUntil: "networkidle", timeout: 30_000 });
  const trigger = page.getByRole("button", { name: "Agregar APU" });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Agregar APU" })).toBeVisible();
  return trigger;
}

test("abre, busca, filtra, muestra detalle y conserva el destino", async ({ page }) => {
  await baseWorkspace(page);
  const consultas = await servirBusqueda(page);
  const trigger = await abrirDialogo(page);

  await expect(page.getByRole("searchbox", { name: "Buscar plantillas" })).toBeFocused();
  await expect(
    page.getByRole("button", { name: /Ver detalles de Excavación típica/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Ver detalles de Replanteo personal/ }),
  ).toBeVisible();
  await sinViolacionesA11y(page);
  await expect(page.getByRole("combobox", { name: "Capítulo de destino" })).toContainText(
    "Al final (última hoja)",
  );
  await page.getByRole("button", { name: /Ver detalles de Excavación típica/ }).click();
  await expect(page.getByRole("region", { name: "Detalle de plantilla" })).toContainText("MAT-001");

  await page.getByRole("searchbox", { name: "Buscar plantillas" }).fill("replanteo");
  await expect
    .poll(() => consultas.some((url) => url.searchParams.get("q") === "replanteo"))
    .toBe(true);
  await expect(
    page.getByRole("button", { name: /Ver detalles de Replanteo personal/ }),
  ).toBeVisible();

  await page.getByRole("checkbox", { name: "Incluir plantillas del sistema" }).uncheck();
  await expect.poll(() => consultas.at(-1)?.searchParams.getAll("tipo")).toEqual(["PERSONAL"]);
  await expect(
    page.getByRole("button", { name: /Ver detalles de Replanteo personal/ }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Agregar APU" })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("selección simple sin checkbox hace un POST exacto y conserva la URL", async ({ page }) => {
  await baseWorkspace(page);
  await servirBusqueda(page);
  let posts = 0;
  await page.route(
    `${API}/presupuestos/${PRESUPUESTO_V2}/rubros/desde-plantillas`,
    async (route) => {
      posts += 1;
      expect(route.request().method()).toBe("POST");
      expect(await route.request().postDataJSON()).toEqual({ plantillaIds: [PLANTILLA_APU_1] });
      await route.fulfill(
        json(
          {
            presupuesto: presupuestoConRubros(["Excavación agregada"]),
            resultados: [
              {
                plantillaId: PLANTILLA_APU_1,
                plantillaNombre: plantillaSistema.nombre,
                apuId: APU_1,
                codigo: "APU-N1",
                advertencias: [],
              },
            ],
          },
          201,
        ),
      );
    },
  );
  await abrirDialogo(page);

  await page.getByRole("button", { name: /Ver detalles de Excavación típica/ }).click();
  await expect(
    page.getByRole("checkbox", { name: "Seleccionar Excavación típica" }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Agregar plantillas" }).click();

  await expect(page.getByText("Excavación agregada")).toBeVisible();
  expect(posts).toBe(1);
  expect(page.url()).toContain(`?v=${PRESUPUESTO_V2}`);
});

test("selección múltiple conserva el orden visual en un único POST", async ({ page }) => {
  await baseWorkspace(page);
  await servirBusqueda(page);
  let posts = 0;
  await page.route(
    `${API}/presupuestos/${PRESUPUESTO_V2}/rubros/desde-plantillas`,
    async (route) => {
      posts += 1;
      expect(await route.request().postDataJSON()).toEqual({
        plantillaIds: [PLANTILLA_APU_1, PLANTILLA_APU_2],
      });
      await route.fulfill(
        json(
          {
            presupuesto: presupuestoConRubros(["Excavación agregada", "Replanteo agregado"]),
            resultados: [plantillaSistema, plantillaPersonal].map((plantilla, index) => ({
              plantillaId: plantilla.id,
              plantillaNombre: plantilla.nombre,
              apuId: `018f8a40-0000-7000-8000-00000000010${index}`,
              codigo: `APU-N${index + 1}`,
              advertencias: [],
            })),
          },
          201,
        ),
      );
    },
  );
  await abrirDialogo(page);

  await page.getByRole("checkbox", { name: "Seleccionar Replanteo personal" }).check();
  await page.getByRole("checkbox", { name: "Seleccionar Excavación típica" }).check();
  await page.getByRole("button", { name: "Agregar plantillas" }).click();

  await expect(page.getByText("Excavación agregada")).toBeVisible();
  await expect(page.getByText("Replanteo agregado")).toBeVisible();
  const textos = await page.locator("tbody tr").allTextContents();
  expect(textos.findIndex((text) => text.includes("Excavación agregada"))).toBeLessThan(
    textos.findIndex((text) => text.includes("Replanteo agregado")),
  );
  expect(posts).toBe(1);
});

test("fallo atómico conserva la selección y no muestra resultados parciales", async ({ page }) => {
  await baseWorkspace(page);
  await page.route(`${API}/plantillas-apu/busqueda*`, (route) =>
    route.fulfill(
      json(
        pagina([
          { ...plantillaSistema, id: PLANTILLA_LOTE_ERROR, nombre: "Plantilla conflictiva" },
        ]),
      ),
    ),
  );
  let posts = 0;
  await page.route(
    `${API}/presupuestos/${PRESUPUESTO_V2}/rubros/desde-plantillas`,
    async (route) => {
      posts += 1;
      expect(await route.request().postDataJSON()).toEqual({
        plantillaIds: [PLANTILLA_LOTE_ERROR],
      });
      await route.fulfill(
        json(
          {
            codigo: "no-encontrado",
            mensaje: "No se pudo aplicar la plantilla en la posición 1",
            detalles: { indice: 0, plantillaId: PLANTILLA_LOTE_ERROR },
          },
          404,
        ),
      );
    },
  );
  await abrirDialogo(page);

  const checkbox = page.getByRole("checkbox", { name: "Seleccionar Plantilla conflictiva" });
  await checkbox.check();
  await page.getByRole("button", { name: "Agregar plantillas" }).click();

  await expect(page.getByRole("alert")).toContainText("Plantilla conflictiva");
  await expect(checkbox).toBeChecked();
  await expect(page.getByText("Excavación agregada")).toHaveCount(0);
  await expect(page.getByText("Replanteo agregado")).toHaveCount(0);
  expect(posts).toBe(1);
});

test("creación manual automática agrega una fila y omite código y capítulo", async ({ page }) => {
  await baseWorkspace(page, "AUTOGENERADO");
  await servirBusqueda(page);
  let posts = 0;
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}/apus/completo`, async (route) => {
    posts += 1;
    expect(await route.request().postDataJSON()).toEqual({
      descripcion: "Adoquín manual",
      unidad: "m2",
      detalles: [
        {
          seccionTipo: "MATERIAL",
          insumoId: insumosFixture[0].id,
          cantidad: "1.000000",
        },
      ],
    });
    await route.fulfill(
      json(
        {
          apu: apuDetalleFixture,
          presupuesto: presupuestoConRubros(["Adoquín manual"]),
        },
        201,
      ),
    );
  });
  const trigger = await abrirDialogo(page);
  await page.getByRole("button", { name: "Crear manualmente" }).click();
  await sinViolacionesA11y(page);
  await page.getByLabel("Descripción").fill("Adoquín manual");
  await page.getByLabel("Unidad").fill("m2");
  const materiales = page.getByRole("region", { name: "MATERIAL" });
  await materiales.getByRole("button", { name: "Agregar insumo" }).click();
  await page.getByRole("button", { name: /M-001 — Cemento Portland/ }).click();

  await expect(page.getByLabel("Código")).toBeDisabled();
  await expect(page.getByRole("region", { name: "MATERIAL" })).toContainText("M-001");
  await page.getByRole("button", { name: "Crear APU" }).click();

  await expect(page.getByRole("dialog", { name: "Agregar APU" })).toBeHidden();
  await expect(page.getByText("Adoquín manual")).toBeVisible();
  await expect(trigger).toBeFocused();
  expect(posts).toBe(1);
});

test("modo manual envía código; Cancelar vuelve y cierra con foco restaurado", async ({ page }) => {
  await baseWorkspace(page, "MANUAL");
  await servirBusqueda(page);
  let body: unknown;
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}/apus/completo`, async (route) => {
    body = await route.request().postDataJSON();
    await route.fulfill(
      json({ apu: apuDetalleFixture, presupuesto: presupuestoConRubros(["Adoquín manual"]) }, 201),
    );
  });
  const trigger = await abrirDialogo(page);
  await page.getByRole("button", { name: "Crear manualmente" }).click();
  const codigo = page.getByLabel("Código");
  await expect(codigo).toBeEnabled();
  await codigo.fill("MAN-001");
  await page.getByLabel("Descripción").fill("Adoquín manual");
  await page.getByLabel("Unidad").fill("m2");
  const materiales = page.getByRole("region", { name: "MATERIAL" });
  await materiales.getByRole("button", { name: "Agregar insumo" }).click();
  await page.getByRole("button", { name: /M-001 — Cemento Portland/ }).click();
  await page.getByRole("button", { name: "Crear APU" }).click();

  await expect
    .poll(() => body)
    .toEqual({
      codigo: "MAN-001",
      descripcion: "Adoquín manual",
      unidad: "m2",
      detalles: [
        {
          seccionTipo: "MATERIAL",
          insumoId: insumosFixture[0].id,
          cantidad: "1.000000",
        },
      ],
    });
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("button", { name: "Crear manualmente" }).click();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("searchbox", { name: "Buscar plantillas" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(trigger).toBeFocused();
});
