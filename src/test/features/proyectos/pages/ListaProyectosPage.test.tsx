import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { ListaProyectosPage } from "@/features/proyectos/pages/ListaProyectosPage";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { proyectosFixture } from "@/test/fixtures/proyectos";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";

const API = "*/api/v1";

describe("ListaProyectosPage", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  });

  it("muestra CTA vacío cuando no hay proyectos", async () => {
    server.use(
      http.get(`${API}/proyectos`, () =>
        HttpResponse.json({ items: [], page: 0, size: 25, total: 0, totalPaginas: 0 }),
      ),
    );

    renderConProviders(
      <Routes>
        <Route path="/proyectos" element={<ListaProyectosPage />} />
      </Routes>,
      { ruta: "/proyectos" },
    );

    await waitFor(() => {
      expect(screen.getByText(/crea tu primer proyecto/i)).toBeInTheDocument();
      expect(screen.getByText(/crear proyecto/i)).toBeInTheDocument();
    });
  });

  it("renderiza filas de proyectos", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos" element={<ListaProyectosPage />} />
      </Routes>,
      { ruta: "/proyectos" },
    );

    await waitFor(() => {
      expect(screen.getByText("Puente Ambato")).toBeInTheDocument();
      expect(screen.getByText("Vía Quito Sur")).toBeInTheDocument();
    });
  });

  it("acepta campos opcionales nulos del backend", async () => {
    server.use(
      http.get(`${API}/proyectos`, () =>
        HttpResponse.json({
          items: [
            {
              id: "01a08c1f-0fe2-78b5-9140-296fa20d45c6",
              nombreProyecto: "Proyecto Prueba 1",
              codigo: "PR999",
              descripcion: null,
              anio: null,
              fechaInicio: null,
              plazoEjecucion: null,
              plazoUnidad: null,
              estado: "BORRADOR",
              direccionInstitucional: null,
              subdireccionInstitucional: null,
              tieneLogo: false,
              updatedAt: null,
            },
          ],
          page: 0,
          size: 25,
          total: 1,
          totalPaginas: 1,
        }),
      ),
    );

    renderConProviders(
      <Routes>
        <Route path="/proyectos" element={<ListaProyectosPage />} />
      </Routes>,
      { ruta: "/proyectos" },
    );

    expect(await screen.findByText("Proyecto Prueba 1")).toBeInTheDocument();
    expect(screen.queryByText("No hay proyectos")).not.toBeInTheDocument();
  });

  it("buscar filtra la lista contra el servidor", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos" element={<ListaProyectosPage />} />
      </Routes>,
      { ruta: "/proyectos" },
    );
    await screen.findByLabelText("Buscar proyecto");
    await screen.findByText("Puente Ambato");

    await user.type(screen.getByLabelText("Buscar proyecto"), "Ambato");

    await waitFor(() => {
      expect(screen.queryByText("Vía Quito Sur")).not.toBeInTheDocument();
      expect(screen.getByText("Puente Ambato")).toBeInTheDocument();
    });
  });

  it("el filtro de estado filtra la lista", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos" element={<ListaProyectosPage />} />
      </Routes>,
      { ruta: "/proyectos" },
    );
    await screen.findByText("Puente Ambato");

    await user.click(screen.getByRole("combobox", { name: "Filtrar por estado" }));
    await user.click(await screen.findByRole("option", { name: "Borrador" }));

    await waitFor(() => {
      expect(screen.queryByText("Puente Ambato")).not.toBeInTheDocument();
      expect(screen.queryByText("Escuela Milagro")).not.toBeInTheDocument();
      expect(screen.getByText("Vía Quito Sur")).toBeInTheDocument();
    });
  });

  it("sin resultados muestra el vacío de búsqueda, no el de creación", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos" element={<ListaProyectosPage />} />
      </Routes>,
      { ruta: "/proyectos" },
    );
    await screen.findByLabelText("Buscar proyecto");

    await user.type(screen.getByLabelText("Buscar proyecto"), "zzz");

    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
    expect(screen.queryByText(/crea tu primer proyecto para empezar/i)).not.toBeInTheDocument();
  });

  it("limpiar filtros restaura la lista completa", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos" element={<ListaProyectosPage />} />
      </Routes>,
      { ruta: "/proyectos" },
    );
    await screen.findByLabelText("Buscar proyecto");

    await user.type(screen.getByLabelText("Buscar proyecto"), "zzz");
    await user.click(await screen.findByRole("button", { name: "Limpiar filtros" }));

    expect(await screen.findByText("Puente Ambato")).toBeInTheDocument();
    expect(screen.getByText("Vía Quito Sur")).toBeInTheDocument();
    expect(screen.getByText("Escuela Milagro")).toBeInTheDocument();
  });

  it("el pie usa el total del servidor, no el de la página", async () => {
    server.use(
      http.get(`${API}/proyectos`, () =>
        HttpResponse.json({
          contenido: proyectosFixture,
          page: 0,
          size: 25,
          totalElementos: 42,
          totalPaginas: 2,
        }),
      ),
    );

    renderConProviders(
      <Routes>
        <Route path="/proyectos" element={<ListaProyectosPage />} />
      </Routes>,
      { ruta: "/proyectos" },
    );

    const pie = await screen.findByText(
      (_, elemento) =>
        elemento?.tagName === "SPAN" && elemento.textContent === "Mostrando 3 de 42 proyectos",
    );
    expect(pie).toBeInTheDocument();
  });
});
