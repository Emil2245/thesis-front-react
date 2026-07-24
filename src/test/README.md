# Convenciones de test (frontend)

Fuente: thesis-docs/plan/quality/01-testing-libraries.md Parte B ·
architecture/08-codebase-design.md §9.

- **Unit/componente:** Vitest + React Testing Library + user-event. Consulta por
  rol/etiqueta accesible en español (`getByRole("button", { name: /guardar/i })`).
  Nunca por test-id ni por clase.
- **Red:** siempre MSW. `onUnhandledRequest: "error"` — si un test falla por una
  petición no mockeada, el defecto es la URL o el handler, no el test.
- **Handlers tipados** desde `src/api/contract.ts`. Un mock que no compila es
  deriva de contrato detectada.
- **Zod:** los tests de formulario importan el schema real del módulo. Nunca se
  duplica un schema en un test (los rangos RNF-09 se afirman una sola vez).
- **No se testea "por dentro" de un módulo profundo** (architecture/08 §9): el
  editor de APU se prueba por su hook `useApuEditor`, no por sus internos.
- **E2E (Playwright):** solo los flujos que cruzan pantallas —
  TC-P05-03, TC-P06-04, TC-P21-04, TC-P35-01, TC-P43-01/02, TC-P44-01.
  Todo lo demás es más barato y más estable como test de componente.
