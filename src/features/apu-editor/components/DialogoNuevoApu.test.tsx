import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoNuevoApu } from "./DialogoNuevoApu";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";

const API = "*/api/v1";

describe("DialogoNuevoApu", () => {
  const onClose = vi.fn();
  const onCreate = vi.fn();

  it("renders dialog title", async () => {
    renderConProviders(
      <DialogoNuevoApu
        abierto
        onClose={onClose}
        presupuestoId={1}
        proyectoId={1}
        onCreate={onCreate}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Nuevo APU/)).toBeInTheDocument();
    });
  });

  it("renders tabs for creation modes", async () => {
    renderConProviders(
      <DialogoNuevoApu
        abierto
        onClose={onClose}
        presupuestoId={1}
        proyectoId={1}
        onCreate={onCreate}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Desde cero/)).toBeInTheDocument();
      expect(screen.getByText(/Desde plantilla/)).toBeInTheDocument();
    });
  });

  it("renders input fields for creación", async () => {
    renderConProviders(
      <DialogoNuevoApu
        abierto
        onClose={onClose}
        presupuestoId={1}
        proyectoId={1}
        onCreate={onCreate}
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/Código/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Descripción/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Unidad/)).toBeInTheDocument();
    });
  });

  it("has a Cancel and Crear button", async () => {
    renderConProviders(
      <DialogoNuevoApu
        abierto
        onClose={onClose}
        presupuestoId={1}
        proyectoId={1}
        onCreate={onCreate}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Cancelar/)).toBeInTheDocument();
      expect(screen.getByText(/Crear APU/)).toBeInTheDocument();
    });
  });

  it("template path shows 'valores referenciales' notice when template selected", async () => {
    server.use(
      http.get(`${API}/proyectos/:id/parametros`, () =>
        HttpResponse.json({
          modoCodigoRubro: "MANUAL",
          porcentajeHerramientaMenor: "0.050000",
          iva: "0.120000",
          moneda: "USD",
          mostrarSeccionesVacias: true,
          sufijosSeccionActivos: false,
          mostrarSubtotalesSeccion: true,
          mostrarSubtotalesPie: true,
          mostrarNombreProyectoHeader: false,
          enumerarApus: false,
        }),
      ),
    );

    const { user } = renderConProviders(
      <DialogoNuevoApu
        abierto
        onClose={onClose}
        presupuestoId={1}
        proyectoId={1}
        onCreate={onCreate}
      />,
    );

    await user.click(screen.getByText(/Desde plantilla/));
    await user.click(screen.getByText(/Excavación típica/));

    await waitFor(() => {
      expect(screen.getByText((c) => c.includes("referenciales"))).toBeInTheDocument();
    });
  });

  it("renders template list without crashing", async () => {
    const { user } = renderConProviders(
      <DialogoNuevoApu
        abierto
        onClose={onClose}
        presupuestoId={1}
        proyectoId={1}
        onCreate={onCreate}
      />,
    );

    await user.click(screen.getByText(/Desde plantilla/));
    expect(await screen.findByText(/Excavación típica/)).toBeInTheDocument();
  });

  it("fills descripcion and unidad from detalle when template selected", async () => {
    const { user } = renderConProviders(
      <DialogoNuevoApu
        abierto
        onClose={onClose}
        presupuestoId={1}
        proyectoId={1}
        onCreate={onCreate}
      />,
    );

    await user.click(screen.getByText(/Desde plantilla/));
    await user.click(await screen.findByText(/Excavación típica/));

    expect(await screen.findByDisplayValue("Excavación a máquina")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("m3")).toBeInTheDocument();
  });

  it("shows template tipo instead of a price", async () => {
    const { user } = renderConProviders(
      <DialogoNuevoApu
        abierto
        onClose={onClose}
        presupuestoId={1}
        proyectoId={1}
        onCreate={onCreate}
      />,
    );

    await user.click(screen.getByText(/Desde plantilla/));
    expect(await screen.findByText("Sistema")).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("MANUAL mode shows editable codigo field", async () => {
    server.use(
      http.get(`${API}/proyectos/:id/parametros`, () =>
        HttpResponse.json({
          modoCodigoRubro: "MANUAL",
          porcentajeHerramientaMenor: "0.050000",
          iva: "0.120000",
          moneda: "USD",
          mostrarSeccionesVacias: true,
          sufijosSeccionActivos: false,
          mostrarSubtotalesSeccion: true,
          mostrarSubtotalesPie: true,
          mostrarNombreProyectoHeader: false,
          enumerarApus: false,
        }),
      ),
    );

    renderConProviders(
      <DialogoNuevoApu
        abierto
        onClose={onClose}
        presupuestoId={1}
        proyectoId={1}
        onCreate={onCreate}
      />,
    );
    await waitFor(() => {
      const codigoInput = screen.getByLabelText(/Código/) as HTMLInputElement;
      expect(codigoInput).not.toBeDisabled();
    });
  });

  it("AUTOGENERADO mode shows disabled codigo field", async () => {
    server.use(
      http.get(`${API}/proyectos/:id/parametros`, () =>
        HttpResponse.json({
          modoCodigoRubro: "AUTOGENERADO",
          porcentajeHerramientaMenor: "0.050000",
          iva: "0.120000",
          moneda: "USD",
          mostrarSeccionesVacias: true,
          sufijosSeccionActivos: false,
          mostrarSubtotalesSeccion: true,
          mostrarSubtotalesPie: true,
          mostrarNombreProyectoHeader: false,
          enumerarApus: false,
        }),
      ),
    );

    renderConProviders(
      <DialogoNuevoApu
        abierto
        onClose={onClose}
        presupuestoId={1}
        proyectoId={1}
        onCreate={onCreate}
      />,
    );
    await waitFor(() => {
      const codigoInput = screen.getByLabelText(/Código/) as HTMLInputElement;
      expect(codigoInput).toBeDisabled();
    });
  });
});
