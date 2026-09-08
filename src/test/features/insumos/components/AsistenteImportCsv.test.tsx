import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsistenteImportCsv } from "@/features/insumos/components/AsistenteImportCsv";
import { destinoProyecto } from "@/features/insumos/destino";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";
import { importResultadoFixture, importResultadoConErroresFixture } from "@/test/fixtures/insumos";
import { problema } from "@/test/handlers";

const API = "*/api/v1";

const csvContent = "codigo,descripcion,unidad,precio\nM-9,Pintura,gl,10.5";

const subirArchivo = async (input: HTMLElement) => {
  const archivo = new File([csvContent], "insumos.csv", { type: "text/csv" });
  const user = userEvent.setup();
  await user.upload(input, archivo);
};

describe("AsistenteImportCsv", () => {
  // Plan 067: el texto anterior nombraba `tipo` y `precioUnitario`, columnas
  // que el parser del backend no acepta — quien lo siguiera no importaba nada.
  it("nombra las cuatro columnas del parser, no precioUnitario", async () => {
    renderConProviders(
      <AsistenteImportCsv
        abierto={true}
        onClose={() => {}}
        destino={destinoProyecto("01927f4e-1a2b-7c3d-8e4f-000000000001")}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Seleccionar archivo/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/codigo, descripcion, unidad, precio\./i)).toBeInTheDocument();
    expect(screen.queryByText(/precioUnitario/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Paso 1 de 2/)).toBeInTheDocument();
  });

  // El enlace "Descargar plantilla" apuntaba al vacío: `/plantillas` es además
  // una ruta del SPA, así que el usuario se descargaba el HTML de la app.
  it("la plantilla descargable existe con la cabecera del parser", () => {
    const csv = readFileSync("public/plantillas/insumos-template.csv", "utf8");
    expect(csv.split("\n")[0]).toBe("codigo,descripcion,unidad,precio");
  });

  it("happy path: imports via /importar and closes", async () => {
    const onClose = vi.fn();
    let llamado = false;
    server.use(
      http.post(`${API}/proyectos/:id/insumos/importar`, () => {
        llamado = true;
        return HttpResponse.json(importResultadoFixture);
      }),
    );

    renderConProviders(
      <AsistenteImportCsv
        abierto={true}
        onClose={onClose}
        destino={destinoProyecto("01927f4e-1a2b-7c3d-8e4f-000000000001")}
      />,
    );

    await subirArchivo(screen.getByLabelText(/Archivo CSV/i));
    await waitFor(() => {
      expect(screen.getByText(/filas detectadas/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(llamado).toBe(true);
  });

  it("shows per-row errors in final step and stays open", async () => {
    const onClose = vi.fn();
    server.use(
      http.post(`${API}/proyectos/:id/insumos/importar`, () =>
        HttpResponse.json(importResultadoConErroresFixture),
      ),
    );

    renderConProviders(
      <AsistenteImportCsv
        abierto={true}
        onClose={onClose}
        destino={destinoProyecto("01927f4e-1a2b-7c3d-8e4f-000000000001")}
      />,
    );

    await subirArchivo(screen.getByLabelText(/Archivo CSV/i));
    await userEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(screen.getByText(/Fila 3/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Fila 7/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 2 de 2/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("csv-invalido keeps the wizard open", async () => {
    const onClose = vi.fn();
    server.use(
      http.post(`${API}/proyectos/:id/insumos/importar`, () =>
        problema(400, "csv-invalido", "El archivo CSV no es válido", {
          detail: "Formato de archivo incorrecto",
        }),
      ),
    );

    renderConProviders(
      <AsistenteImportCsv
        abierto={true}
        onClose={onClose}
        destino={destinoProyecto("01927f4e-1a2b-7c3d-8e4f-000000000001")}
      />,
    );

    await subirArchivo(screen.getByLabelText(/Archivo CSV/i));
    await userEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(screen.getByText(/Seleccionar archivo/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
