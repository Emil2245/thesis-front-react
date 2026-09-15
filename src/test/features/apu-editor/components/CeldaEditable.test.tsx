import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { CeldaEditable } from "@/features/apu-editor/components/CeldaEditable";

describe("CeldaEditable", () => {
  it("muestra el valor recibido cuando no hay error", () => {
    renderConProviders(
      <CeldaEditable value="3.5" onCommit={vi.fn()} editable mensajeError={undefined} />,
    );
    expect(screen.getByLabelText(/Editar valor 3.5/)).toBeInTheDocument();
  });

  it("asocia el mensaje de validación al botón de edición cuando hay error", () => {
    renderConProviders(
      <CeldaEditable value="abc" onCommit={vi.fn()} editable mensajeError="Debe ser mayor que 0" />,
    );
    const boton = screen.getByLabelText(/Editar valor abc/);
    // `aria-invalid` no se admite en `<button>` (WAI-ARIA 1.2): la invalidez
    // se anuncia por el nodo de descripción accesible al que apunta el botón.
    expect(boton).toHaveAttribute("aria-describedby");
    const describedBy = boton.getAttribute("aria-describedby");
    const mensaje = describedBy ? document.getElementById(describedBy) : null;
    expect(mensaje).not.toBeNull();
    expect(mensaje?.textContent).toBe("Debe ser mayor que 0");
  });

  it("asocia el mensaje del servidor cuando la edición falló en el backend", () => {
    renderConProviders(
      <CeldaEditable
        value="0"
        onCommit={vi.fn()}
        editable
        mensajeError="El rendimiento debe ser mayor que 0"
      />,
    );
    const boton = screen.getByLabelText(/Editar valor 0/);
    const describedBy = boton.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const mensaje = describedBy ? document.getElementById(describedBy) : null;
    expect(mensaje).not.toBeNull();
    expect(mensaje?.textContent).toBe("El rendimiento debe ser mayor que 0");
  });

  it("sin mensajeError, el botón de edición no expone descripción de error", () => {
    renderConProviders(
      <CeldaEditable value="3.5" onCommit={vi.fn()} editable mensajeError={undefined} />,
    );
    const boton = screen.getByLabelText(/Editar valor 3.5/);
    expect(boton).not.toHaveAttribute("aria-describedby");
  });

  // Triangulación: el error sigue marcado mientras se está editando, porque la
  // invalidez del valor anterior no se "cura" sólo por abrir el input. Si el
  // usuario corrige a medias y se va con Escape, el mensaje sigue siendo
  // visible para no perder la pista.
  it("preserva aria-invalid mientras se edita un valor con error previo", async () => {
    const { user } = renderConProviders(
      <CeldaEditable value="abc" onCommit={vi.fn()} editable mensajeError="Debe ser mayor que 0" />,
    );
    const boton = screen.getByLabelText(/Editar valor abc/);
    await user.click(boton);
    const input = screen.getByDisplayValue("abc");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-errormessage");
  });

  // Verificación independiente §2: en modo edición, `aria-describedby` y
  // `aria-errormessage` deben apuntar a un nodo que exista en el DOM. Si la
  // descripción está condicionada a `!editando`, los lectores de pantalla
  // anuncian un id huérfano al entrar al input.
  it("mantiene montado el nodo del mensaje mientras se edita", async () => {
    const { user } = renderConProviders(
      <CeldaEditable value="abc" onCommit={vi.fn()} editable mensajeError="Debe ser mayor que 0" />,
    );
    const boton = screen.getByLabelText(/Editar valor abc/);
    await user.click(boton);
    const input = screen.getByDisplayValue("abc");
    const describedBy =
      input.getAttribute("aria-describedby") ?? input.getAttribute("aria-errormessage");
    expect(describedBy).toBeTruthy();
    // El id al que apunta la celda en modo edición debe estar en el DOM con el
    // texto del mensaje; si la referencia está vacía o apunta a null, falla.
    const nodo = describedBy ? document.getElementById(describedBy) : null;
    expect(nodo).not.toBeNull();
    expect(nodo?.textContent).toBe("Debe ser mayor que 0");
  });

  // Cobertura adicional (hallazgo restante §3): `aria-describedby` Y
  // `aria-errormessage` deben resolver al MISMO nodo montado, no sólo uno de
  // los dos. La aserción anterior caía al primer id no-nulo con `??`; este
  // test exige ambos explícitamente.
  it("ambos aria-describedby y aria-errormessage resuelven al nodo del mensaje en edición", async () => {
    const { user } = renderConProviders(
      <CeldaEditable value="abc" onCommit={vi.fn()} editable mensajeError="Debe ser mayor que 0" />,
    );
    const boton = screen.getByLabelText(/Editar valor abc/);
    await user.click(boton);
    const input = screen.getByDisplayValue("abc");
    const describedBy = input.getAttribute("aria-describedby");
    const errorMessage = input.getAttribute("aria-errormessage");
    expect(describedBy).toBeTruthy();
    expect(errorMessage).toBeTruthy();
    // Ambos ids deben resolver al MISMO <output> montado con el mensaje.
    expect(describedBy).toBe(errorMessage);
    const nodoDescrito = describedBy ? document.getElementById(describedBy) : null;
    const nodoError = errorMessage ? document.getElementById(errorMessage) : null;
    expect(nodoDescrito).not.toBeNull();
    expect(nodoError).not.toBeNull();
    expect(nodoDescrito).toBe(nodoError);
    expect(nodoDescrito?.textContent).toBe("Debe ser mayor que 0");
  });
});
