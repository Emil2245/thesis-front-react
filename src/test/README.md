# Convenciones de test (frontend)

Fuente: thesis-docs/plan/quality/01-testing-libraries.md Parte B ·
architecture/08-codebase-design.md §9.

- **Unit/componente:** Vitest + React Testing Library + user-event. Consulta por
  rol/etiqueta accesible en español (`getByRole("button", { name: /guardar/i })`).
  Nunca por test-id ni por clase.
- **Red:** siempre MSW. `onUnhandledRequest: "error"` — si un test falla por una
  petición no mockeada, el defecto es la URL o el handler, no el test.
- **Test de contrato (plan 057):** un hook se prueba por la **petición que sale**
  —método, ruta exacta, cuerpo con `toEqual`—, no por `isSuccess`. El mock
  siempre responde bien, así que asertar el resultado está verde contra casi
  cualquier ruta mal escrita o campo mal nombrado. `espiar()` (en
  `src/test/espia.ts`) engancha el emisor de MSW y devuelve las peticiones; el
  cuerpo se rellena en asíncrono, así que las aserciones van dentro de
  `waitFor`.
- **Los handlers de mutación rechazan lo desconocido.** `soloCampos(request,
...permitidos)` en `handlers.ts` devuelve 400 ante una propiedad que el record
  del backend no tiene. Al añadir una mutación nueva, se le pone su lista blanca:
  un handler permisivo no puede ver un campo de más ni uno mal nombrado.
- **El orden de los handlers importa.** MSW casa por orden, así que una ruta
  literal va **antes** que la ruta con parámetro que la contendría
  (`/proyectos/parametros-sistema` antes de `/proyectos/:id`). Al revés, la
  petición cae en la genérica y devuelve un 404 que la página disimula con sus
  valores por defecto.
- **Ids UUIDv7 en las fixtures, siempre.** Un test con `id: 1` no detecta un
  guard `id > 0`. Las únicas entidades con id numérico real son `usuario` y
  `perfil`.
- **Toda ruta de listado se mockea con `*` al final** (`/proyectos/:id/insumos*`),
  en MSW y en Playwright. La paginación manda `?page=0` siempre: un patrón
  literal deja de casar, la petición cae en el catch-all que devuelve `{}` y la
  página revienta. Es la clase de error que vuelve a colarse sola.
- **Handlers tipados** desde `src/api/contract.ts`. Un mock que no compila es
  deriva de contrato detectada.
- **Zod:** los tests de formulario importan el schema real del módulo. Nunca se
  duplica un schema en un test (los rangos RNF-09 se afirman una sola vez).
- **No se testea "por dentro" de un módulo profundo** (architecture/08 §9): el
  editor de APU se prueba por su hook `useApuEditor`, no por sus internos.
- **E2E (Playwright):** solo los flujos que cruzan pantallas —
  TC-P05-03, TC-P06-04, TC-P21-04, TC-P35-01, TC-P43-01/02, TC-P44-01.
  Todo lo demás es más barato y más estable como test de componente.
