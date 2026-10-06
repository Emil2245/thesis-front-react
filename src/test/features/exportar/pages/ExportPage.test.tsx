import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";
import { espiar, ultima } from "@/test/espia";
import { Route, Routes } from "react-router-dom";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { PRESUPUESTO_V1, PRESUPUESTO_V2, validacionFixture } from "@/test/fixtures/presupuesto";
import { preflightBloqueadoFixture, preflightConWarningFixture } from "@/test/fixtures/cronograma";
import type { CronogramaExportPreflightResponse, DocumentoPreflightResponse } from "@/api/contract";
import { qk } from "@/api/queryKeys";
import { ExportPage } from "@/features/exportar/pages/ExportPage";

const API = "*/api/v1";
const PRESUPUESTO = "0198c1a0-0000-7000-8000-000000000011";

beforeEach(() => {
  useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  server.use(
    http.get(`${API}/documentos/:documento/:id/preflight`, ({ params, request }) => {
      if (params.documento !== "presupuesto" && params.documento !== "apus") return;
      expect([PRESUPUESTO_V1, PRESUPUESTO_V2]).toContain(params.id);
      const query = new URL(request.url).searchParams;
      const formato = query.get("formato");
      expect(["xlsx", "pdf"]).toContain(formato);
      const opciones =
        params.documento === "presupuesto" && formato === "pdf"
          ? { orientacion: query.get("orientacion") ?? "vertical" }
          : params.documento === "apus" && formato === "xlsx"
            ? { layout: query.get("layout") ?? "pestanas" }
            : {};
      expect([...query.entries()].sort()).toEqual(Object.entries({ formato, ...opciones }).sort());
      return HttpResponse.json({
        presupuestoId: params.id,
        version: 1,
        documento: params.documento,
        formato,
        opciones,
        exportable: true,
        bloqueos: [],
        warnings: [],
      });
    }),
  );
});

async function setup({
  exportable = false,
  preflight,
  presupuestoId = PRESUPUESTO,
}: {
  exportable?: boolean;
  preflight?: CronogramaExportPreflightResponse;
  presupuestoId?: string;
} = {}) {
  if (preflight)
    server.use(
      http.get(`${API}/documentos/cronograma/:id/preflight`, () => HttpResponse.json(preflight)),
    );
  if (exportable)
    server.use(
      http.get(`${API}/presupuestos/:id/validacion`, () =>
        HttpResponse.json({
          ...validacionFixture,
          exportable: true,
          itemsPuCero: [],
          itemsCantidadCero: [],
          itemsSinActividad: [],
        }),
      ),
    );
  const result = renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/documentos" element={<ExportPage />} />
    </Routes>,
    {
      ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/documentos?v=${presupuestoId}`,
    },
  );
  await waitFor(() => expect(screen.getByText("Exportar")).toBeInTheDocument());
  return { user: result.user, client: result.client };
}

// Preservar ET/cronograma al incorporar los documentos presupuestarios reales.
describe("ExportPage", () => {
  it("muestra el título y subtítulo", async () => {
    await setup();
    expect(screen.getByText("Exportar")).toBeInTheDocument();
    expect(screen.getByText(/descargue documentos/i)).toBeInTheDocument();
  });

  // Los documentos anteriores continúan disponibles con sus propios gates.
  it("ofrece la especificación técnica en DOCX y el cronograma valorizado", async () => {
    await setup();
    expect(screen.getByText(/especificaciones técnicas/i)).toBeInTheDocument();
    expect(screen.getByText(/cronograma valorizado/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /descargar/i })).toHaveLength(4);
  });

  it("ofrece presupuesto y APUs sin anunciar capacidades inexistentes", async () => {
    await setup();
    expect(screen.getByRole("button", { name: "Descargar presupuesto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar APUs" })).toBeInTheDocument();
    expect(screen.queryByText(/todavía no existe en el servidor/i)).not.toBeInTheDocument();
    // El cronograma sí existe desde `5673615`: el aviso no puede seguir
    // diciendo lo contrario de lo que la propia pantalla ofrece.
    expect(screen.queryByText(/del cronograma todavía no existe/i)).not.toBeInTheDocument();
  });

  it("deshabilita la descarga cuando el presupuesto no es exportable", async () => {
    await setup();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^descargar$/i })).toBeDisabled(),
    );
  });

  it("muestra alerta de validación cuando hay problemas", async () => {
    await setup();
    await waitFor(() => {
      expect(screen.getByText(/no puede exportarse/i)).toBeInTheDocument();
    });
  });

  it("descarga la ET del endpoint real cuando el presupuesto es exportable", async () => {
    const peticiones = espiar();
    const { user } = await setup({ exportable: true });

    const boton = await screen.findByRole("button", { name: /^descargar$/i });
    await waitFor(() => expect(boton).toBeEnabled());
    await user.click(boton);

    await waitFor(() =>
      expect(
        ultima(peticiones, "GET", `/documentos/especificaciones-tecnicas/${PRESUPUESTO}`),
      ).toBeDefined(),
    );
  });

  // Desde el sidebar se llega sin `?v=` —nadie lo pone— y hasta el plan 097 la
  // página sacaba el id de `searchParams`, así que pedía la ET con el segmento
  // vacío y el backend devolvía 404. La versión la resuelve `useVersionActiva()`:
  // «versión (default vigente)» de S-35.
  it("descarga con el presupuesto de la versión vigente cuando la URL no trae ?v=", async () => {
    const peticiones = espiar();
    server.use(
      http.get(`${API}/presupuestos/:id/validacion`, () =>
        HttpResponse.json({
          ...validacionFixture,
          exportable: true,
          itemsPuCero: [],
          itemsCantidadCero: [],
          itemsSinActividad: [],
        }),
      ),
    );
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/documentos" element={<ExportPage />} />
      </Routes>,
      { ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/documentos" },
    );

    const boton = await screen.findByRole("button", { name: /^descargar$/i });
    await waitFor(() => expect(boton).toBeEnabled());
    await user.click(boton);

    // `PRESUPUESTO_V2` es la única versión con `esVigente: true` del handler de
    // `/proyectos/:id/presupuestos`.
    await waitFor(() =>
      expect(
        ultima(peticiones, "GET", `/documentos/especificaciones-tecnicas/${PRESUPUESTO_V2}`),
      ).toBeDefined(),
    );
    expect(ultima(peticiones, "GET", "/documentos/especificaciones-tecnicas/")).toBeUndefined();
  });
});

const rubroDocumento = {
  id: "0198c1a0-0000-7000-8000-000000000021",
  item: "1.1",
  codigo: "APU-001",
  descripcion: "Excavación del presupuesto",
};
const bloqueoDocumento = {
  codigo: "presupuesto-pu-cero",
  mensaje: "Existen rubros con precio unitario cero",
  rubros: [rubroDocumento],
};
const presupuestoPreflight: DocumentoPreflightResponse = {
  presupuestoId: PRESUPUESTO,
  version: 1,
  documento: "presupuesto",
  formato: "xlsx",
  opciones: {},
  exportable: false,
  bloqueos: [bloqueoDocumento],
  warnings: [],
};

async function seleccionar(
  user: Awaited<ReturnType<typeof setup>>["user"],
  label: string,
  option: string,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(screen.getByRole("option", { name: option }));
}

describe("ExportPage — presupuesto/APUs", () => {
  it("no descarga durante preflight pendiente ni con respuesta de otro contexto", async () => {
    let resolver!: () => void;
    const espera = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    let solicitada = false;
    server.use(
      http.get(`${API}/documentos/presupuesto/${PRESUPUESTO}/preflight`, async ({ request }) => {
        expect([...new URL(request.url).searchParams.entries()]).toEqual([["formato", "xlsx"]]);
        solicitada = true;
        await espera;
        return HttpResponse.json({
          ...presupuestoPreflight,
          presupuestoId: PRESUPUESTO_V1,
          exportable: true,
          bloqueos: [],
        });
      }),
    );
    const peticiones = espiar();
    const { user } = await setup();
    const boton = screen.getByRole("button", { name: "Descargar presupuesto" });
    await waitFor(() => expect(solicitada).toBe(true));
    expect(boton).toBeDisabled();
    await user.click(boton);
    resolver();
    expect(
      await screen.findByText("No se pudo comprobar la exportación. Intente nuevamente."),
    ).toBeInTheDocument();
    expect(boton).toBeDisabled();
    expect(ultima(peticiones, "GET", `/documentos/presupuesto/${PRESUPUESTO}`)).toBeUndefined();
  });
  it("bloquea por rubros pero stale solo avisa", async () => {
    server.use(
      http.get(`${API}/documentos/presupuesto/${PRESUPUESTO}/preflight`, ({ request }) => {
        expect([...new URL(request.url).searchParams.entries()]).toEqual([["formato", "xlsx"]]);
        return HttpResponse.json(presupuestoPreflight);
      }),
      http.get(`${API}/documentos/apus/${PRESUPUESTO}/preflight`, ({ request }) => {
        expect([...new URL(request.url).searchParams.entries()].sort()).toEqual([
          ["formato", "xlsx"],
          ["layout", "pestanas"],
        ]);
        return HttpResponse.json({
          ...presupuestoPreflight,
          documento: "apus",
          opciones: { layout: "pestanas" },
          exportable: true,
          bloqueos: [],
          warnings: [
            {
              codigo: "apu-stale",
              mensaje: "APUs desactualizados; puede continuar",
              rubros: [rubroDocumento],
            },
          ],
        });
      }),
    );
    await setup();
    expect(await screen.findByText(bloqueoDocumento.mensaje)).toBeInTheDocument();
    expect(screen.getAllByText(/1.1 — Excavación del presupuesto/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Descargar presupuesto" })).toBeDisabled();
    expect(await screen.findByText("APUs desactualizados; puede continuar")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Descargar APUs" })).toBeEnabled(),
    );
  });

  it("descarga la versión histórica y elimina opciones incompatibles al cambiar formato", async () => {
    const peticiones = espiar();
    server.use(
      http.get(`${API}/documentos/apus/${PRESUPUESTO_V1}`, ({ request }) => {
        expect([...new URL(request.url).searchParams.entries()]).toEqual([["formato", "pdf"]]);
        return new HttpResponse("%PDF-1.7", { headers: { "Content-Type": "application/pdf" } });
      }),
    );
    const { user } = await setup({ presupuestoId: PRESUPUESTO_V1 });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Descargar APUs" })).toBeEnabled(),
    );
    await seleccionar(user, "Organización de APUs", "Apilado");
    await seleccionar(user, "Formato de APUs", "PDF (.pdf)");
    expect(
      screen.queryByRole("combobox", { name: "Organización de APUs" }),
    ).not.toBeInTheDocument();
    const boton = screen.getByRole("button", { name: "Descargar APUs" });
    await waitFor(() => expect(boton).toBeEnabled());
    await user.click(boton);
    await waitFor(() =>
      expect(ultima(peticiones, "GET", `/documentos/apus/${PRESUPUESTO_V1}`)).toBeDefined(),
    );
    expect(ultima(peticiones, "GET", `/documentos/apus/${PRESUPUESTO_V2}`)).toBeUndefined();
    const pre = ultima(peticiones, "GET", `/documentos/apus/${PRESUPUESTO_V1}/preflight`);
    expect([...pre!.url.searchParams.entries()]).toEqual([["formato", "pdf"]]);
    await seleccionar(user, "Formato de APUs", "Excel (.xlsx)");
    expect(screen.getByRole("combobox", { name: "Organización de APUs" })).toHaveTextContent(
      "Pestañas",
    );
  });

  it("mantiene cerrado el gate tras 409 mientras refresca un éxito antiguo", async () => {
    let resolver!: () => void;
    const espera = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    let descargas = 0;
    let preflights = 0;
    server.use(
      http.get(`${API}/documentos/presupuesto/${PRESUPUESTO}/preflight`, async ({ request }) => {
        expect([...new URL(request.url).searchParams.entries()]).toEqual([["formato", "xlsx"]]);
        preflights++;
        if (descargas) await espera;
        return HttpResponse.json(
          descargas
            ? presupuestoPreflight
            : {
                ...presupuestoPreflight,
                exportable: true,
                bloqueos: [],
              },
        );
      }),
      http.get(`${API}/documentos/presupuesto/${PRESUPUESTO}`, ({ request }) => {
        expect([...new URL(request.url).searchParams.entries()]).toEqual([["formato", "xlsx"]]);
        descargas++;
        return HttpResponse.json(presupuestoPreflight, { status: 409 });
      }),
    );
    const { user } = await setup();
    const boton = screen.getByRole("button", { name: "Descargar presupuesto" });
    await waitFor(() => expect(boton).toBeEnabled());
    await user.click(boton);
    expect(await screen.findByText(bloqueoDocumento.mensaje)).toBeInTheDocument();
    await waitFor(() => expect(preflights).toBe(2));
    expect(boton).toBeDisabled();
    await user.click(boton);
    expect(descargas).toBe(1);
    resolver();
    await waitFor(() => expect(boton).toBeDisabled());
  });

  it("un 409 tardío invalida solo la key capturada y no bloquea el formato nuevo", async () => {
    let resolver!: () => void;
    let solicitada = false;
    const espera = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    server.use(
      http.get(`${API}/documentos/presupuesto/${PRESUPUESTO}`, async ({ request }) => {
        expect([...new URL(request.url).searchParams.entries()]).toEqual([["formato", "xlsx"]]);
        solicitada = true;
        await espera;
        return HttpResponse.json(presupuestoPreflight, { status: 409 });
      }),
    );
    const { user, client } = await setup();
    const invalidar = vi.spyOn(client, "invalidateQueries");
    const boton = screen.getByRole("button", { name: "Descargar presupuesto" });
    await waitFor(() => expect(boton).toBeEnabled());
    await user.click(boton);
    await waitFor(() => expect(solicitada).toBe(true));
    await seleccionar(user, "Formato de presupuesto", "PDF (.pdf)");
    resolver();
    await waitFor(() =>
      expect(invalidar).toHaveBeenCalledWith({
        queryKey: qk.documentos.preflight(PRESUPUESTO, "presupuesto", "xlsx", {}),
        exact: true,
      }),
    );
    await waitFor(() => expect(boton).toBeEnabled());
    expect(screen.queryByText(bloqueoDocumento.mensaje)).not.toBeInTheDocument();
    expect(invalidar).not.toHaveBeenCalledWith({
      queryKey: qk.documentos.preflight(PRESUPUESTO, "presupuesto", "pdf", {
        orientacion: "vertical",
      }),
      exact: true,
    });
  });
});

// Plan 031 del backend: el preflight decide si la descarga va a salir, y con
// qué bloqueos si no. La pantalla enseña el `detalle` que el servidor redacta.
describe("ExportPage — cronograma valorizado", () => {
  it("ofrece los tres formatos que el backend genera", async () => {
    const { user } = await setup();

    await user.click(screen.getByRole("combobox", { name: "Formato" }));

    expect(screen.getByRole("option", { name: /xlsx/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /\.pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /\.xml/i })).toBeInTheDocument();
  });

  // El `cronograma-desviacion` viene por actividad con un `detalle` genérico:
  // repetido no dice cuál falta, así que se nombra la actividad por su id.
  it("muestra cada bloqueo, nombra la actividad sin asignar y deshabilita la descarga", async () => {
    await setup({ preflight: preflightBloqueadoFixture });

    expect(
      await screen.findByText("Existen rubros con precio unitario cero (P-32)"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Excavación a máquina")).toBeInTheDocument();
    expect(screen.getByText(/falta asignar en el cronograma 1 actividad/i)).toBeInTheDocument();
    expect(
      screen.queryByText("La actividad tiene desviación distinta de 0.0000"),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /descargar cronograma/i })).toBeDisabled(),
    );
  });

  // Un warning avisa pero NO bloquea: tratarlo como bloqueo es el bug que este
  // test caza, y sin él no lo caza nadie.
  it("un warning avisa sin deshabilitar la descarga", async () => {
    await setup({ exportable: true, preflight: preflightConWarningFixture });

    expect(
      await screen.findByText(preflightConWarningFixture.warnings[0].detalle),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /descargar cronograma/i })).toBeEnabled(),
    );
  });

  it("al pulsar el botón pide /documentos/cronograma/{id}", async () => {
    const peticiones = espiar();
    const { user } = await setup({ exportable: true });

    const boton = await screen.findByRole("button", { name: /descargar cronograma/i });
    await waitFor(() => expect(boton).toBeEnabled());
    await user.click(boton);

    await waitFor(() =>
      expect(ultima(peticiones, "GET", `/documentos/cronograma/${PRESUPUESTO}`)).toBeDefined(),
    );
  });
});
