import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { renderConProviders } from "@/test/render";
import { Route, Routes } from "react-router-dom";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { presupuestoFixture } from "@/test/fixtures/presupuesto";
import {
  PresupuestoPage,
  PresupuestoPageActiva,
} from "@/features/presupuesto/pages/PresupuestoPage";
import { VersionesPage, VersionesPageActiva } from "@/features/presupuesto/pages/VersionesPage";

const API = "*/api/v1";

beforeEach(() => {
  useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
});

// El backend no expone /proyectos/{id}/presupuestos ni /presupuestos/{id}
// (plan 027): las rutas reales muestran PresupuestoPage y VersionesPage, que
// degradan a "todavía no disponible" sin llamar al backend (ver más abajo).
// PresupuestoPageActiva y VersionesPageActiva son las implementaciones
// completas, conservadas para reactivarlas cuando el endpoint exista: estos
// tests siguen probándolas directamente.

// ─── Helpers ───

async function setupPresupuestoPage() {
  const result = renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/presupuesto" element={<PresupuestoPageActiva />} />
    </Routes>,
    { ruta: "/proyectos/1/presupuesto?v=11" },
  );
  await waitFor(() => expect(screen.getByText(/v2/)).toBeInTheDocument());
  return { user: result.user, result };
}

async function setupVersionesPage() {
  const result = renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/versiones" element={<VersionesPageActiva />} />
    </Routes>,
    { ruta: "/proyectos/1/versiones" },
  );
  await waitFor(() => expect(screen.getByText("Versiones del presupuesto")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText("v1")).toBeInTheDocument());
  return { user: result.user, result };
}

async function abrirDialogoEliminarCapitulo(user: ReturnType<typeof renderConProviders>["user"]) {
  const preliminares = screen.getByText("Preliminares");
  const row = preliminares.closest("div")?.parentElement?.parentElement;
  const deleteBtn = row?.querySelector('[title="Eliminar capítulo"]');
  await user.click(deleteBtn!);
  return screen.findByRole("alertdialog");
}

// ─── PresupuestoPageActiva ───

describe("PresupuestoPageActiva", () => {
  it("muestra el árbol del presupuesto con capítulos", async () => {
    await setupPresupuestoPage();
    expect(screen.getByText("Preliminares")).toBeInTheDocument();
    expect(screen.getByText("Obra civil")).toBeInTheDocument();
  });

  it("expande/colapsa capítulos al hacer clic en el chevron", async () => {
    const { user } = await setupPresupuestoPage();
    const preliminares = screen.getByText("Preliminares");
    const prelimRow = preliminares.closest("div")?.parentElement;
    const prelimChevron = prelimRow?.querySelector("button");
    expect(prelimChevron).toBeTruthy();

    await user.click(prelimChevron!);
    await waitFor(() => {
      expect(screen.getByText("Instalación de campamento")).toBeInTheDocument();
    });

    const campamento = screen.getByText("Instalación de campamento");
    const campRow = campamento.closest("div")?.parentElement;
    const campChevron = campRow?.querySelector("button");
    await user.click(campChevron!);
    await waitFor(() => {
      expect(screen.getByText("Excavación a máquina")).toBeInTheDocument();
    });

    await user.click(prelimChevron!);
    await waitFor(() => {
      expect(screen.queryByText("Excavación a máquina")).not.toBeInTheDocument();
    });
  });

  it("muestra el banner de integridad con alertas", async () => {
    await setupPresupuestoPage();
    await waitFor(() => {
      expect(screen.getByText(/no es exportable/i)).toBeInTheDocument();
    });
  });

  it("muestra el desglose por componentes", async () => {
    await setupPresupuestoPage();
    await waitFor(() => {
      expect(screen.getByText("Desglose por componente")).toBeInTheDocument();
      expect(screen.getByText("Equipo")).toBeInTheDocument();
      expect(screen.getByText("Mano de obra")).toBeInTheDocument();
    });
  });

  it("abre el diálogo de nuevo capítulo", async () => {
    const { user } = await setupPresupuestoPage();
    await user.click(screen.getByRole("button", { name: /nuevo capítulo/i }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("crea un nuevo capítulo desde el diálogo", async () => {
    const { user } = await setupPresupuestoPage();
    await user.click(screen.getByRole("button", { name: /nuevo capítulo/i }));
    const input = screen.getByLabelText("Descripción");
    await user.type(input, "Capítulo de prueba");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("abre el diálogo de agregar rubro desde un capítulo", async () => {
    const { user } = await setupPresupuestoPage();
    const preliminares = screen.getByText("Preliminares");
    const row = preliminares.closest("div")?.parentElement;
    const addItemBtn = row?.querySelector('[title="Agregar rubro"]');
    expect(addItemBtn).toBeTruthy();

    await user.click(addItemBtn!);
    await waitFor(() => {
      expect(screen.getByText("Agregar rubro al presupuesto")).toBeInTheDocument();
    });
  });

  it("agrega un rubro desde el diálogo de búsqueda de APU", async () => {
    const { user } = await setupPresupuestoPage();
    const preliminares = screen.getByText("Preliminares");
    const row = preliminares.closest("div")?.parentElement;
    const addItemBtn = row?.querySelector('[title="Agregar rubro"]');
    await user.click(addItemBtn!);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar apu/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/APU-001/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/APU-001/));

    const cantidadInput = screen.getByLabelText(/cantidad/i);
    expect(cantidadInput).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /agregar/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("edita un capítulo desde el botón de editar", async () => {
    const { user } = await setupPresupuestoPage();
    const preliminares = screen.getByText("Preliminares");
    const row = preliminares.closest("div")?.parentElement;
    const editBtn = row?.querySelector('[title="Editar descripción"]');
    await user.click(editBtn!);

    await waitFor(() => {
      expect(screen.getByText("Editar capítulo")).toBeInTheDocument();
    });
  });

  it("eliminar un capítulo pide confirmación en un diálogo del sistema", async () => {
    const { user } = await setupPresupuestoPage();
    const dialogo = await abrirDialogoEliminarCapitulo(user);
    expect(within(dialogo).getByText(/"Preliminares"/)).toBeInTheDocument();
  });

  it("cancelar la confirmación no elimina el capítulo", async () => {
    let deletes = 0;
    server.use(
      http.delete(`${API}/presupuestos/:id/capitulos/:cid`, () => {
        deletes += 1;
        return HttpResponse.json(presupuestoFixture);
      }),
    );
    const { user } = await setupPresupuestoPage();
    const dialogo = await abrirDialogoEliminarCapitulo(user);
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Preliminares")).toBeInTheDocument();
    expect(deletes).toBe(0);
  });

  it("confirmar la confirmación elimina el capítulo", async () => {
    let cidEliminado = -1;
    server.use(
      http.delete(`${API}/presupuestos/:id/capitulos/:cid`, ({ params }) => {
        cidEliminado = Number(params.cid);
        return HttpResponse.json(presupuestoFixture);
      }),
    );
    const { user } = await setupPresupuestoPage();
    const dialogo = await abrirDialogoEliminarCapitulo(user);
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(cidEliminado).toBe(10));
  });
});

// ─── VersionesPageActiva ───

describe("VersionesPageActiva", () => {
  it("muestra la tabla de versiones", async () => {
    await setupVersionesPage();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
  });

  it("marca una versión como vigente", async () => {
    const { user } = await setupVersionesPage();
    const marcarBtns = screen.getAllByRole("button", { name: /marcar vigente/i });
    await user.click(marcarBtns[0]);
  });

  it("abre el diálogo de nueva versión", async () => {
    const { user } = await setupVersionesPage();
    await user.click(screen.getByRole("button", { name: /nueva versión/i }));
    await waitFor(() => {
      expect(screen.getByText("Nueva versión del presupuesto")).toBeInTheDocument();
    });
  });

  it("crea una nueva versión", async () => {
    const { user } = await setupVersionesPage();
    await user.click(screen.getByRole("button", { name: /nueva versión/i }));
    const combobox = screen.getByRole("combobox", { name: /versión origen/i });
    await user.click(combobox);
    await user.click(screen.getByRole("option", { name: /v2/i }));
    await user.click(screen.getByRole("button", { name: /crear/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("elimina una versión histórica tras confirmar en el diálogo", async () => {
    let idEliminado = -1;
    server.use(
      http.delete(`${API}/presupuestos/:id`, ({ params }) => {
        idEliminado = Number(params.id);
        return HttpResponse.json(null, { status: 204 });
      }),
    );
    const { user } = await setupVersionesPage();
    const deleteBtns = screen.getAllByRole("button", { name: /eliminar/i });
    await user.click(deleteBtns[0]);
    const dialogo = await screen.findByRole("alertdialog");
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(idEliminado).toBe(10));
  });

  it("no permite eliminar la versión vigente", async () => {
    await setupVersionesPage();
    const filas = screen.getAllByRole("row");
    const vigenteRow = filas.find((row) => within(row).queryByText("Vigente"))!;
    expect(vigenteRow).toBeTruthy();
    const deleteBtn = within(vigenteRow).queryByRole("button", { name: /eliminar/i });
    expect(deleteBtn).not.toBeInTheDocument();
  });
});

// ─── PresupuestoPage / VersionesPage (degradadas) ───

describe("PresupuestoPage", () => {
  it("explica que el módulo todavía no está disponible, sin pedir el presupuesto al backend", async () => {
    // MSW está configurado con onUnhandledRequest: "error": si esta pantalla
    // llamara al hook real, el test fallaría por la petición no mockeada.
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/presupuesto" element={<PresupuestoPage />} />
      </Routes>,
      { ruta: "/proyectos/1/presupuesto?v=11" },
    );

    expect(screen.getByText("Presupuesto")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/todavía no está disponible/i)).toBeInTheDocument();
    });
  });
});

describe("VersionesPage", () => {
  it("explica que el módulo todavía no está disponible, sin pedir las versiones al backend", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/versiones" element={<VersionesPage />} />
      </Routes>,
      { ruta: "/proyectos/1/versiones" },
    );

    expect(screen.getByText("Versiones del presupuesto")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/todavía no está disponible/i)).toBeInTheDocument();
    });
  });
});
