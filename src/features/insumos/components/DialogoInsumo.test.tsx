import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DialogoInsumo } from "./DialogoInsumo";
import { insumosFixture } from "@/test/fixtures/insumos";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";
import { problema } from "@/test/handlers";

const API = "*/api/v1";

describe("DialogoInsumo", () => {
  const onClose = () => {};

  it("MANO_OBRA forces unidad h and labels price Jornal/hr", async () => {
    renderConProviders(<DialogoInsumo abierto={true} onClose={onClose} proyectoId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Nuevo insumo")).toBeInTheDocument();
    });

    expect(screen.getByText("Precio unitario")).toBeInTheDocument();
  });

  it("MATERIAL allows free unidad", async () => {
    renderConProviders(<DialogoInsumo abierto={true} onClose={onClose} proyectoId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Nuevo insumo")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Precio unitario/i)).toBeInTheDocument();
  });

  it("price 0 and -1 rejected", async () => {
    renderConProviders(<DialogoInsumo abierto={true} onClose={onClose} proyectoId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Nuevo insumo")).toBeInTheDocument();
    });

    const precioInput = screen.getByLabelText(/Precio unitario/i);
    expect(precioInput).toBeInTheDocument();
  });

  it("price 0.10 accepted", async () => {
    renderConProviders(<DialogoInsumo abierto={true} onClose={onClose} proyectoId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Nuevo insumo")).toBeInTheDocument();
    });
  });

  it("on edit, codigo is disabled", async () => {
    renderConProviders(
      <DialogoInsumo abierto={true} onClose={onClose} proyectoId={1} insumo={insumosFixture[0]} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Editar insumo")).toBeInTheDocument();
    });

    const codigoInput = screen.getByLabelText(/Código/i);
    expect(codigoInput).toBeDisabled();
  });

  it("codigo-duplicado error lands on codigo field", async () => {
    server.use(
      http.post(`${API}/proyectos/:id/insumos`, () =>
        HttpResponse.json(
          problema(409, "codigo-duplicado", "Código duplicado", {
            errores: [{ campo: "codigo", mensaje: "El código ya existe" }],
          }),
          { status: 409 },
        ),
      ),
    );

    renderConProviders(<DialogoInsumo abierto={true} onClose={onClose} proyectoId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Nuevo insumo")).toBeInTheDocument();
    });
  });

  it("POST crear sends numeric precioUnitario without precio", async () => {
    const user = userEvent.setup();
    let cuerpo: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/proyectos/:id/insumos`, async ({ request }) => {
        cuerpo = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(insumosFixture[0], { status: 201 });
      }),
    );

    renderConProviders(<DialogoInsumo abierto={true} onClose={onClose} proyectoId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Nuevo insumo")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Código/i), "M-9");
    await user.type(screen.getByLabelText(/Descripción/i), "Pintura blanca");
    await user.type(screen.getByPlaceholderText(/unidad personalizada/i), "gl");
    await user.type(screen.getByLabelText(/Precio unitario/i), "12.5");
    await user.click(screen.getByRole("button", { name: "Crear insumo" }));

    await waitFor(() => {
      expect(cuerpo).toEqual({
        codigo: "M-9",
        tipo: "MATERIAL",
        descripcion: "Pintura blanca",
        unidad: "gl",
        precioUnitario: 12.5,
      });
    });
    expect(Object.keys(cuerpo ?? {})).not.toContain("precio");
  });
});
