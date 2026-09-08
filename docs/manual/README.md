# Manuales de usuario — Sistema APU

Dos manuales, en español (es-EC), con capturas reales generadas por la suite de Playwright de
este repositorio.

- **[Manual del Usuario](usuario/)** — todo lo que hace un usuario con rol `USUARIO`.
- **[Manual del Administrador](admin/)** — lo que hace `ADMIN`. Hoy es corto a propósito: solo
  dos de sus cinco procesos tienen backend.

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

**38 procesos documentables**, medidos contra el código el 2026-09-07. La especificación
(`thesis-docs`, `plan/design/03-procesos-detalle.md`) describe 46; los ocho que faltan no se
documentan porque no existen en la interfaz — ver _Lo que no se documenta_, abajo.

| Capítulo                                                         | Procesos                     | Estado       |
| ---------------------------------------------------------------- | ---------------------------- | ------------ |
| [00 · Introducción](usuario/00-introduccion.md)                  | —                            | ⏳ pendiente |
| [01 · Cuenta y acceso](usuario/01-cuenta-y-acceso.md)            | P-01…P-04                    | ✅ escrito   |
| [02 · Proyectos](usuario/02-proyectos.md)                        | P-05, P-06, P-08, P-10, P-11 | ✅ escrito   |
| [03 · Insumos](usuario/03-insumos.md)                            | P-13…P-18                    | ✅ escrito   |
| [04 · APU](usuario/04-apu.md)                                    | P-19…P-23, P-26, P-27, P-45  | ⏳ pendiente |
| [05 · Presupuesto](usuario/05-presupuesto.md)                    | P-28…P-32                    | ✅ escrito   |
| [06 · Cronograma](usuario/06-cronograma.md)                      | P-33…P-36                    | ⏳ pendiente |
| [07 · Documentos](usuario/07-documentos.md)                      | P-37                         | ⏳ pendiente |
| [08 · Navegación](usuario/08-navegacion.md)                      | P-43, P-44, P-46             | ✅ escrito   |
| [admin · Bases centrales](admin/01-bases-centrales.md)           | P-39                         | ⏳ pendiente |
| [admin · Parámetros del sistema](admin/02-parametros-sistema.md) | P-41 (defaults)              | ⏳ pendiente |

## Lo que no se documenta, y por qué

Ocho procesos de la especificación quedan fuera, todos por decisión:

| Proceso                            | Motivo                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **P-07** Editar proyecto           | Documentado como no disponible en §2                                                                                                     |
| **P-09** Duplicar proyecto         | Sin backend. La acción existe en el menú pero está desactivada, con el aviso _"Disponible cuando el backend implemente esta operación."_ |
| **P-12** Descuento global al CD    | Sin backend. Especificado y cerrado el 2026-08-31, pero no hay endpoint. No es un pendiente de entrega                                   |
| **P-24** Descuento al CD por rubro | Retirado de la especificación (`WITHDRAWN / SUPERSEDED`)                                                                                 |
| **P-25** Rubro auxiliar            | Retirado. La regla vigente es que no hay enlaces entre APUs                                                                              |
| **P-38** Gestión de usuarios       | Sin backend; la pantalla muestra el aviso de no disponible                                                                               |
| **P-40** Plantillas de sistema     | Ídem                                                                                                                                     |
| **P-42** Logs de actividad         | Ídem                                                                                                                                     |

Dos matices que el manual dice en su propio texto, en vez de callarlos:

- **P-37 (Documentos)** está a medias: hoy se exportan las **especificaciones técnicas en DOCX**
  y el **cronograma valorizado** en XLSX, PDF y MSPDI. El presupuesto y los APUs todavía no.
- **P-41 (Parámetros del sistema)** solo cubre los valores por defecto. La pestaña de _valores de
  referencia_ no tiene backend.

## Convenciones de redacción

- Tuteo, voz activa, presente: _"Pulsa Guardar"_, no _"se deberá proceder a guardar"_.
- El nombre de cada control, **literal y en negrita**, tal y como se lee en la pantalla.
- Los sustantivos del dominio se quedan en español: _insumo, rubro, APU, capítulo, presupuesto,
  cronograma, rendimiento_.
- Cero jerga de implementación. Quien lee esto no sabe qué es un DTO, un endpoint ni un UUID, y
  no le hace falta.
- Una captura por cada paso que cambia lo que se ve. Ni capturas decorativas, ni pasos a ciegas.
- Las tablas de campos salen de la **validación real del formulario**, no de la especificación.
