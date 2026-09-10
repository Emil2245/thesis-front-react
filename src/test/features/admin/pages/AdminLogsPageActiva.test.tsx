import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { espiar, ultima } from "@/test/espia";
import { server } from "@/test/server";
import { AdminLogsPageActiva } from "@/features/admin/pages/AdminLogsPageActiva";
import { logsActividadFixture } from "@/test/fixtures/admin";

const [login, proyectoCreado] = logsActividadFixture;

// El gate `admin-logs` sigue cerrado (plan 081 lo abre); esta pantalla se
// prueba aislada, como Valores (079) mientras esperaba activarse.
describe("AdminLogsPageActiva", () => {
  it("lista los logs del backend con actor, evento, entidad, detalle y fecha", async () => {
    renderConProviders(<AdminLogsPageActiva />);

    expect(await screen.findByText(login.usuarioNombre!)).toBeInTheDocument();
    expect(screen.getByText(login.evento)).toBeInTheDocument();
    expect(screen.getByText(login.entidad)).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify(login.detalle))).toBeInTheDocument();
    // El log sin actor se pinta como "Sistema", nunca en blanco.
    expect(screen.getByText("Sistema")).toBeInTheDocument();
    expect(screen.getByText(proyectoCreado.evento)).toBeInTheDocument();
  });

  it("no muestra ningún id interno ni UUID crudo en la tabla", async () => {
    renderConProviders(<AdminLogsPageActiva />);

    await screen.findByText(login.evento);
    expect(screen.queryByText(login.usuarioId!)).not.toBeInTheDocument();
    expect(screen.queryByText(proyectoCreado.entidadId!)).not.toBeInTheDocument();
  });

  it("pide la lista a GET /admin/logs con page/size y sin filtros por defecto", async () => {
    const peticiones = espiar();
    renderConProviders(<AdminLogsPageActiva />);

    await screen.findByText(login.evento);
    const p = ultima(peticiones, "GET", "/admin/logs");
    expect(p?.ruta).toBe("/api/v1/admin/logs");
    expect(p?.url.searchParams.get("page")).toBe("0");
    expect(p?.url.searchParams.get("size")).toBe("25");
    expect(p?.url.searchParams.has("evento")).toBe(false);
    expect(p?.url.searchParams.has("usuarioId")).toBe(false);
  });

  it("filtra por evento y sólo pide ese evento al backend (AND con el resto de filtros)", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminLogsPageActiva />);

    await screen.findByText(login.evento);
    await user.type(screen.getByLabelText("Evento"), login.evento);

    await waitFor(() => {
      const p = ultima(peticiones, "GET", "/admin/logs");
      expect(p?.url.searchParams.get("evento")).toBe(login.evento);
    });
    // El backend real combina los filtros con AND: con `evento` fijado a
    // `auth.login`, la fila sin ese evento deja de estar en la respuesta.
    await waitFor(() => expect(screen.queryByText(proyectoCreado.evento)).not.toBeInTheDocument());
    expect(screen.getByText(login.evento)).toBeInTheDocument();
  });

  it("renderiza un estado vacío honesto cuando ningún log coincide", async () => {
    server.use(
      http.get("*/api/v1/admin/logs", () =>
        HttpResponse.json({ items: [], total: 0, page: 0, size: 25, totalPaginas: 0 }),
      ),
    );

    renderConProviders(<AdminLogsPageActiva />);

    expect(await screen.findByText("Sin actividad registrada")).toBeInTheDocument();
  });

  it("muestra un estado de error si el listado falla (403)", async () => {
    server.use(
      http.get("*/api/v1/admin/logs", () =>
        HttpResponse.json(
          { codigo: "acceso-denegado", mensaje: "No posee los permisos necesarios" },
          { status: 403 },
        ),
      ),
    );

    renderConProviders(<AdminLogsPageActiva />);

    expect(await screen.findByText("No posee los permisos necesarios")).toBeInTheDocument();
  });

  it("muestra el mensaje del backend cuando el rango de fechas es inválido (400)", async () => {
    server.use(
      http.get("*/api/v1/admin/logs", () =>
        HttpResponse.json(
          { codigo: "validacion", mensaje: "rango-fechas-invalido" },
          { status: 400 },
        ),
      ),
    );

    renderConProviders(<AdminLogsPageActiva />);

    expect(await screen.findByText("rango-fechas-invalido")).toBeInTheDocument();
  });

  it("navega a la página siguiente pidiendo page=1 al backend", async () => {
    server.use(
      http.get("*/api/v1/admin/logs", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page") ?? 0);
        return HttpResponse.json({
          items: page === 0 ? [login] : [proyectoCreado],
          total: 2,
          page,
          size: 1,
          totalPaginas: 2,
        });
      }),
    );
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminLogsPageActiva />);

    await screen.findByText(login.evento);
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() => expect(screen.getByText(proyectoCreado.evento)).toBeInTheDocument());
    expect(ultima(peticiones, "GET", "/admin/logs")?.url.searchParams.get("page")).toBe("1");
  });
});
