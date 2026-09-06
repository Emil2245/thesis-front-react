import { describe, expect, it, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { ResumenProyectoPage } from "@/features/proyectos/pages/ResumenProyectoPage";
import { useSesionStore } from "@/features/auth/sesion";
import { server } from "@/test/server";
import { usuarioFixture } from "@/test/fixtures/auth";
import { PROYECTO_1, parametrosFixture } from "@/test/fixtures/proyectos";

describe("ResumenProyectoPage", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  });

  // Plan 062 §2: el aviso se calcula en el cliente desde los parámetros del
  // proyecto. Antes venía de un `alertas: ["CI_NO_CONFIGURADO"]` que sólo
  // existía en el fixture: el banner no podía salir nunca en producción.
  const conPorcentajeIndirecto = (valor: number | null) =>
    server.use(
      http.get(`*/api/v1/proyectos/:id/parametros`, () =>
        HttpResponse.json({ ...parametrosFixture, porcentajeIndirecto: valor }),
      ),
    );

  it("avisa del %CI sin configurar con enlace a parámetros", async () => {
    conPorcentajeIndirecto(null);
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<ResumenProyectoPage />} />
      </Routes>,
      { ruta: `/proyectos/${PROYECTO_1}` },
    );

    await waitFor(() => {
      expect(screen.getByText(/indirectos no configurado/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/configurar ahora/i).closest("a")).toHaveAttribute(
      "href",
      `/proyectos/${PROYECTO_1}/parametros`,
    );
  });

  // Un %CI puesto a 0 es una decisión válida del usuario, no un hueco.
  it("no avisa cuando el %CI está configurado, ni siquiera si es 0", async () => {
    conPorcentajeIndirecto(0);
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<ResumenProyectoPage />} />
      </Routes>,
      { ruta: `/proyectos/${PROYECTO_1}` },
    );

    await waitFor(() => {
      expect(screen.getByText("Puente Ambato")).toBeInTheDocument();
    });
    expect(screen.queryByText(/indirectos no configurado/i)).not.toBeInTheDocument();
  });

  it("muestra el nombre del proyecto", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<ResumenProyectoPage />} />
      </Routes>,
      { ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001" },
    );

    await waitFor(() => {
      expect(screen.getByText("Puente Ambato")).toBeInTheDocument();
    });
  });

  it("abre el diálogo de guardar como plantilla desde el menú de más acciones", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<ResumenProyectoPage />} />
      </Routes>,
      { ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001" },
    );

    await waitFor(() => {
      expect(screen.getByText("Puente Ambato")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Más acciones"));
    await user.click(screen.getByText("Guardar como plantilla"));

    expect(
      screen.getByText(
        "Guarda este proyecto como plantilla para crear nuevos proyectos a partir de él.",
      ),
    ).toBeInTheDocument();
  });
});
