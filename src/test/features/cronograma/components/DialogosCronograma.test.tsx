import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderConProviders } from "@/test/render";
import { DialogoConfigurarCronograma } from "@/features/cronograma/components/DialogoConfigurarCronograma";
import { DialogoConfirmarReduccion } from "@/features/cronograma/components/DialogoConfirmarReduccion";
import { DialogoEditarActividad } from "@/features/cronograma/components/DialogoEditarActividad";
import { TablaActividades } from "@/features/cronograma/components/TablaActividades";
import { actividadesFixture, cronogramaFixture, perdidasFixture } from "@/test/fixtures/cronograma";

const HORMIGON = actividadesFixture[3];

// El único punto donde el usuario ve qué avances va a borrar antes de
// confirmar. Con `periodosAfectados` —un campo que el backend no manda— salía
// una lista vacía y se confirmaba a ciegas.
describe("DialogoConfirmarReduccion", () => {
  it("lista las pérdidas del 409: actividad, período y valor", () => {
    renderConProviders(
      <DialogoConfirmarReduccion
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        perdidas={perdidasFixture}
        actividades={cronogramaFixture.actividades}
      />,
    );

    const filas = screen.getAllByRole("row");
    // Una fila de cabecera y una por pérdida.
    expect(filas).toHaveLength(perdidasFixture.length + 1);
    // La primera pérdida es del hormigón, período 4, 25,2253 puntos.
    expect(screen.getByText(HORMIGON.item)).toBeInTheDocument();
    expect(screen.getByText("25.2253 %")).toBeInTheDocument();
  });

  it("no promete nada cuando el 409 no trajo pérdidas", () => {
    renderConProviders(
      <DialogoConfirmarReduccion
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        perdidas={[]}
        actividades={cronogramaFixture.actividades}
      />,
    );

    expect(screen.queryByRole("row")).not.toBeInTheDocument();
  });
});

// `SEMANA` ≤ 520 y `MES` ≤ 120: validar aquí en vez de esperar al 400.
describe("DialogoConfigurarCronograma", () => {
  const configurar = (props: Partial<Parameters<typeof DialogoConfigurarCronograma>[0]> = {}) =>
    renderConProviders(
      <DialogoConfigurarCronograma
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        modo="reconfigurar"
        unidadActual="MES"
        periodosActual={4}
        {...props}
      />,
    );

  it("rechaza 121 meses sin llamar al backend", async () => {
    const onConfirm = vi.fn();
    const { user } = configurar({ onConfirm });

    const periodos = screen.getByLabelText(/número de períodos/i);
    await user.clear(periodos);
    await user.type(periodos, "121");

    expect(screen.getByText(/1 y 120/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reconfigurar/i })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("acepta 200 semanas, que están dentro del límite de SEMANA", async () => {
    const { user } = configurar({ unidadActual: "SEMANA" });

    const periodos = screen.getByLabelText(/número de períodos/i);
    await user.clear(periodos);
    await user.type(periodos, "200");

    expect(screen.queryByText(/1 y 520/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reconfigurar/i })).toBeEnabled();
  });

  it("manda siempre unidad y períodos: el PUT es un reemplazo completo", async () => {
    const onConfirm = vi.fn();
    const { user } = configurar({ onConfirm });

    await user.click(screen.getByRole("button", { name: /reconfigurar/i }));

    expect(onConfirm).toHaveBeenCalledWith("MES", 4);
  });
});

describe("DialogoEditarActividad", () => {
  const editar = (onConfirm = vi.fn()) => ({
    onConfirm,
    ...renderConProviders(
      <DialogoEditarActividad
        open
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        actividad={HORMIGON}
        numeroPeriodos={cronogramaFixture.numeroPeriodos}
      />,
    ),
  });

  // `"Valor de avance debe ser un decimal string"`: el parser rechaza el
  // número JSON, así que los avances salen como string de 4 decimales.
  it("emite REEMPLAZAR_AVANCES con los valores como decimal string", async () => {
    const { user, onConfirm } = editar();

    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      operacion: "REEMPLAZAR_AVANCES",
      avancePorPeriodo: { "2": "25.2252", "3": "25.2252", "4": "25.2253" },
    });
  });

  // El mapa es disperso: un período en cero no se manda como `"0.0000"`, se
  // omite, porque una clave presente cuenta como período activo.
  it("omite los períodos vacíos en vez de mandarlos en cero", async () => {
    const { user, onConfirm } = editar();

    await user.clear(screen.getByLabelText("Período 4"));
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      operacion: "REEMPLAZAR_AVANCES",
      avancePorPeriodo: { "2": "25.2252", "3": "25.2252" },
    });
  });

  it("muestra la desviación en vivo contra el peso ponderado", async () => {
    const { user } = editar();

    await user.clear(screen.getByLabelText("Período 4"));

    // 75,6757 − (25,2252 + 25,2252) = 25,2253 sin repartir.
    expect(screen.getByText(/25\.2253 %/)).toBeInTheDocument();
  });

  // El backend ya sabe repartir el peso de la actividad entre los períodos que
  // se le den; sin este botón el usuario teclea a mano lo que el servidor
  // calcula mejor.
  it("distribuye uniforme sobre los períodos seleccionados", async () => {
    const { user, onConfirm } = editar();

    await user.click(screen.getByRole("checkbox", { name: /seleccionar período 1/i }));
    await user.click(screen.getByRole("checkbox", { name: /seleccionar período 2/i }));
    await user.click(screen.getByRole("button", { name: /distribuir uniforme/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      operacion: "DISTRIBUIR_UNIFORME",
      periodos: [1, 2],
    });
  });
});

describe("TablaActividades", () => {
  const tabla = () =>
    renderConProviders(
      <TablaActividades
        actividades={cronogramaFixture.actividades}
        periodos={cronogramaFixture.numeroPeriodos}
      />,
    );

  it("muestra el código y la unidad, que ya venían y no se pintaban", () => {
    tabla();

    expect(screen.getByText(HORMIGON.codigo)).toBeInTheDocument();
    expect(screen.getAllByText(HORMIGON.unidad).length).toBeGreaterThan(0);
  });

  // `pesoPonderado` son puntos de porcentaje escala 4: 75,6757 se pinta
  // «75,6757 %», no «7.567,57 %» como salía al tratarlo como fracción.
  it("pinta el peso ponderado como puntos de porcentaje, no como fracción", () => {
    tabla();

    expect(screen.getByText("75.6757 %")).toBeInTheDocument();
    expect(screen.queryByText(/7\.567/)).not.toBeInTheDocument();
  });

  // Los avances tampoco son dinero: el precio total sí, y ese sigue en dólares.
  it("pinta los avances como porcentaje y el precio total como dinero", () => {
    tabla();

    expect(screen.getByText("25.2253 %")).toBeInTheDocument();
    expect(screen.getByText("$14,000.00")).toBeInTheDocument();
  });
});
