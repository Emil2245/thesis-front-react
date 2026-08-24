import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { proyectoDetalleFixture } from "@/test/fixtures/proyectos";
import { AsistenteCrearProyecto } from "./AsistenteCrearProyecto";

const API = "*/api/v1";

describe("AsistenteCrearProyecto", () => {
  it("abre el asistente", () => {
    renderConProviders(<AsistenteCrearProyecto abierto onClose={() => {}} />);
    expect(screen.getByText(/crear proyecto/i)).toBeInTheDocument();
    expect(screen.getByText(/paso 1/i)).toBeInTheDocument();
  });

  it("sin nombre muestra error de validación", async () => {
    const { user } = renderConProviders(<AsistenteCrearProyecto abierto onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("El nombre es obligatorio")).toBeInTheDocument();
  });

  it("envía nombreProyecto y no origenInsumos al crear", async () => {
    let cuerpoCapturado: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/proyectos`, async ({ request }) => {
        cuerpoCapturado = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(proyectoDetalleFixture, { status: 201 });
      }),
    );

    const { user } = renderConProviders(<AsistenteCrearProyecto abierto onClose={() => {}} />, {
      ruta: "/proyectos",
    });

    await user.type(screen.getByLabelText("Nombre"), "Puente Tulcán");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.click(screen.getByRole("button", { name: /crear proyecto/i }));

    await waitFor(() => {
      expect(cuerpoCapturado).toBeDefined();
      expect(cuerpoCapturado?.nombreProyecto).toBe("Puente Tulcán");
      expect(cuerpoCapturado).not.toHaveProperty("origenInsumos");
      expect(cuerpoCapturado).not.toHaveProperty("nombre");
    });
  });
});
