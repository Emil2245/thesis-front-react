# Manuales de usuario — Sistema APU

Dos manuales, en español (es-EC), con capturas reales generadas por la suite de Playwright de
este repositorio.

- **[Manual del Usuario](usuario/)** — todo lo que hace un usuario con rol `USUARIO`.
- **Manual del Administrador** — aún no existe en este repositorio. Las pantallas de
  administración (usuarios, bases, plantillas, parámetros, valores de referencia y logs) están
  operativas, pero sus capítulos no se han escrito.

## Regla que gobierna estos documentos

**Cada afirmación del manual corresponde a algo que existe en el código de este repositorio, y
cada captura la produce la suite de Playwright de este repositorio.** Nada de prosa escrita desde
la especificación sin comprobar la pantalla.

Un manual que describe una pantalla que no existe no falla: **miente**, y nadie lo detecta hasta
que un usuario sigue el paso 4 y no encuentra el botón.

## Regenerar las capturas

```bash
pnpm run e2e:manual     # todas las capturas del manual (chromium)
```

Las imágenes se escriben en `img/<capitulo>/NN-slug.png` y **nunca se editan a mano**: cada una
sale de `e2e/manual/<capitulo>.spec.ts`, que intercepta la API con `page.route()` y los fixtures
compartidos de `src/test/fixtures/`. Todas usan el mismo mundo de datos —proyecto _Puente
Ambato_ (`AMB-001`), usuaria _Ana Torres_— para que el manual no cambie de proyecto entre el
paso 3 y el paso 4.

Cada test **afirma antes de disparar la foto**: si la pantalla no muestra lo que debe, el test
falla en vez de guardar una captura de una pantalla vacía o equivocada.

## Cobertura

La especificación (`thesis-docs`, `plan/design/03-procesos-detalle.md`) describe 46 procesos.
Algunos no se documentan porque no existen en la interfaz — ver _Lo que no se documenta_, abajo —
y varios capítulos están pendientes de redactar.

| Capítulo                                              | Procesos                     | Estado       |
| ----------------------------------------------------- | ---------------------------- | ------------ |
| 00 · Introducción                                     | —                            | ⏳ pendiente |
| [01 · Cuenta y acceso](usuario/01-cuenta-y-acceso.md) | P-01…P-04                    | ✅ escrito   |
| [02 · Proyectos](usuario/02-proyectos.md)             | P-05, P-06, P-08, P-10, P-11 | ✅ escrito   |
| [03 · Insumos](usuario/03-insumos.md)                 | P-13…P-18                    | ✅ escrito   |
| 04 · APU                                              | P-19…P-23, P-26, P-27, P-45  | ⏳ pendiente |
| [05 · Presupuesto](usuario/05-presupuesto.md)         | P-28…P-32                    | ✅ escrito   |
| 06 · Cronograma                                       | P-33…P-36                    | ⏳ pendiente |
| 07 · Documentos                                       | P-37                         | ⏳ pendiente |
| [08 · Navegación](usuario/08-navegacion.md)           | P-43, P-44, P-46             | ✅ escrito   |
| admin · Bases centrales                               | P-39                         | ⏳ pendiente |
| admin · Parámetros del sistema                        | P-41                         | ⏳ pendiente |

## Lo que no se documenta, y por qué

Cinco procesos de la especificación quedan fuera, todos por decisión:

| Proceso                            | Motivo                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| **P-07** Editar proyecto           | Documentado como no disponible en §2                                                    |
| **P-09** Duplicar proyecto         | Sin backend. La acción fue retirada de la interfaz                                      |
| **P-12** Descuento global al CD    | Sin backend. Su UI, hooks, DTOs y mocks fueron retirados; no es un pendiente de entrega |
| **P-24** Descuento al CD por rubro | Retirado de la especificación (`WITHDRAWN / SUPERSEDED`)                                |
| **P-25** Rubro auxiliar            | Retirado. La regla vigente es que no hay enlaces entre APUs                             |

Dos matices que el manual dice en su propio texto, en vez de callarlos:

- **P-37 (Documentos)** ya exporta presupuesto, APUs, **especificaciones técnicas en DOCX** y
  **cronograma valorizado** (XLSX, PDF y MSPDI), mediante una solicitud de exportación y un enlace
  de descarga de un solo uso. Su capítulo del manual (07) sigue pendiente.
- **P-38, P-40, P-41 y P-42** (usuarios, plantillas de sistema, parámetros y valores de
  referencia, logs de actividad) tienen backend y pantalla operativos desde el plan 081; están
  pendientes de documentar, no ausentes.
- Las capturas de `img/09-privacidad-exportar/` no tienen aún capítulo propio.

## Convenciones de redacción

- Tuteo, voz activa, presente: _"Pulsa Guardar"_, no _"se deberá proceder a guardar"_.
- El nombre de cada control, **literal y en negrita**, tal y como se lee en la pantalla.
- Los sustantivos del dominio se quedan en español: _insumo, rubro, APU, capítulo, presupuesto,
  cronograma, rendimiento_.
- Cero jerga de implementación. Quien lee esto no sabe qué es un DTO, un endpoint ni un UUID, y
  no le hace falta.
- Una captura por cada paso que cambia lo que se ve. Ni capturas decorativas, ni pasos a ciegas.
- Las tablas de campos salen de la **validación real del formulario**, no de la especificación.
