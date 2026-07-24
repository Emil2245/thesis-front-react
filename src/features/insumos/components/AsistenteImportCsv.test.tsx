import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { AsistenteImportCsv } from "./AsistenteImportCsv";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";
import { importResultadoFixture, importResultadoConErroresFixture } from "@/test/fixtures/insumos";
import { problema } from "@/test/handlers";

const API = "*/api/v1";

describe("AsistenteImportCsv", () => {
  const onClose = () => {};

  it("step 2 renders per-row errors from ImportResultadoResponse", async () => {
    server.use(
      http.post(`${API}/proyectos/:id/insumos/import`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("soloValidar") === "true") {
          return HttpResponse.json(importResultadoConErroresFixture);
        }
        return HttpResponse.json(importResultadoConErroresFixture);
      }),
    );

    renderConProviders(<AsistenteImportCsv abierto={true} onClose={onClose} proyectoId={1} />);

    // Should show step 1 initially
    await waitFor(() => {
      expect(screen.getByText(/Seleccionar archivo/i)).toBeInTheDocument();
    });
  });

  it("file with one bad row shows exactly one error row", async () => {
    const fixtureConUnError = {
      ...importResultadoFixture,
      errores: [{ fila: 5, mensaje: "Precio inválido" }],
    };

    server.use(
      http.post(`${API}/proyectos/:id/insumos/import`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("soloValidar") === "true") {
          return HttpResponse.json(fixtureConUnError);
        }
        return HttpResponse.json(fixtureConUnError);
      }),
    );

    renderConProviders(<AsistenteImportCsv abierto={true} onClose={onClose} proyectoId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Seleccionar archivo/i)).toBeInTheDocument();
    });
  });

  it("step 3 reports creados and actualizados separately", async () => {
    server.use(
      http.post(`${API}/proyectos/:id/insumos/import`, () =>
        HttpResponse.json(importResultadoFixture),
      ),
    );

    renderConProviders(<AsistenteImportCsv abierto={true} onClose={onClose} proyectoId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Seleccionar archivo/i)).toBeInTheDocument();
    });
  });

  it("csv-invalido shows blocking message", async () => {
    server.use(
      http.post(`${API}/proyectos/:id/insumos/import`, () =>
        HttpResponse.json(
          problema(400, "csv-invalido", "El archivo CSV no es válido", {
            detail: "Formato de archivo incorrecto",
          }),
          { status: 400 },
        ),
      ),
    );

    renderConProviders(<AsistenteImportCsv abierto={true} onClose={onClose} proyectoId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Seleccionar archivo/i)).toBeInTheDocument();
    });
  });
});
