# 014 — Panel Super-Admin: usuarios, bases centrales, plantillas, parámetros y logs (P-38…P-42, S-37…S-42)

- **Status:** TODO
- **Written against:** repo state after plans 001–013. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 006 (`RutaAdmin` guard), 008 (reuses `DialogoInsumo` + `AsistenteImportCsv`), 010 (template preview), 007 (parameter form shape).
- **Covers:** processes **P-38…P-42**; screens **S-37…S-42**; XP stories **US-35…US-39** (iteration I-11).

---

## 1. Why this matters

There are exactly **two roles** — `USUARIO` and `SUPER_ADMIN` (interview 07-06-2026, no intermediate roles in v1). The Super-Admin governs the shared substrate: the central insumo bases users copy from, the SISTEMA templates they start APUs from, the system defaults new projects inherit, and the users themselves.

This iteration comes **after** the user flow on purpose (`roadmap/01 §2.4`): the admin administers entities whose user-facing behaviour is already proven. Most of this plan is therefore CRUD reusing components that already exist — resist rebuilding them.

## 2. Contract — endpoints (`../thesis-docs/plan/architecture/07-api-contract.md §9`)

All under `/admin/*`, role `Admin`.

| Método | Path | Request | Response | Códigos | Errores |
|---|---|---|---|---|---|
| GET | `/admin/usuarios?q&activo&page…` | — | `Page<UsuarioAdminResponse>` | 200 | — |
| POST | `/admin/usuarios` | `UsuarioInvitarRequest` | `UsuarioAdminResponse` | 201, 400 | `validacion`. **Envía invitación 72 h (D-11)** |
| PUT | `/admin/usuarios/{id}` | `UsuarioAdminEditarRequest` | `UsuarioAdminResponse` | 200, 400, 404 | `validacion` |
| POST | `/admin/usuarios/{id}/desactivar` · `/reactivar` | — | `UsuarioAdminResponse` | 200, 404 | — |
| DELETE | `/admin/usuarios/{id}` | — | — | 204, 404, **409** | 409 si tiene proyectos (RESTRICT) |
| GET | `/admin/bases-centrales?incluirArchivadas=` | — | `BaseInsumosResponse[]` | 200 | — |
| POST | `/admin/bases-centrales` | `BaseInsumosCrearRequest` | `BaseInsumosResponse` | 201, 400 | `validacion` |
| PUT | `/admin/bases-centrales/{id}` | `BaseInsumosCrearRequest` | `BaseInsumosResponse` | 200, 400, 404 | `validacion` (renombrar) |
| POST | `/admin/bases-centrales/{id}/archivar` | — | `BaseInsumosResponse` | 200, 404 | — (**D-12: archivar, no borrar**) |
| POST/PUT/DELETE | `/admin/bases-centrales/{id}/insumos[/{iid}]` | `InsumoCrearRequest` / `InsumoEditarRequest` | `InsumoResponse` | 201/200/204, 400, 404, 409 | `validacion` · `codigo-duplicado` · `insumo-en-uso` |
| POST | `/admin/bases-centrales/{id}/insumos/import?soloValidar=` | multipart CSV + `tipo` | `ImportResultadoResponse` | 200, 400, 404 | `csv-invalido` |
| GET/POST | `/admin/plantillas-apu` | `PlantillaSistemaCrearRequest` | `PlantillaApuResponse[]` / `PlantillaApuResponse` | 200/201, 400 | `validacion` (`desdeApuId`) |
| PUT/DELETE | `/admin/plantillas-apu/{id}` | `PlantillaApuEditarRequest` | `PlantillaApuResponse` | 200/204, 400, 404 | `validacion` |
| GET/PUT | `/admin/parametros-sistema` | `ParametrosSistemaActualizarRequest` | `ParametrosSistemaResponse` | 200, 400 | `validacion` (rangos §4.6) |
| GET | `/admin/valores-referencia` | — | `ValorReferenciaResponse[]` | 200 | — |
| PUT | `/admin/valores-referencia/{clave}` | `ValorReferenciaRequest` | `ValorReferenciaResponse` | 200, 201, 400 | `validacion` (upsert por clave) |
| DELETE | `/admin/valores-referencia/{clave}` | — | — | 204, 404 | — |
| GET | `/admin/logs?usuarioId&evento&desde&hasta&page…` | — | `Page<LogActividadResponse>` | 200 | — (**sin PII**, RNF-08) |

## 3. Screens

| ID | Pantalla | Ruta | Prio | Contenido clave | Procesos |
|---|---|---|---|---|---|
| S-37 | Usuarios (admin) | `/admin/usuarios` | A | Tabla + diálogo: crear (invitación), editar, desactivar/reactivar, eliminar | P-38 |
| S-38 | Bases centrales | `/admin/bases` | A | Lista de bases; crear/renombrar/archivar | P-39 |
| S-39 | Detalle de base central | `/admin/bases/:id` | A | Tabla de insumos de la base: CRUD + import CSV (destino central) | P-39, P-15 |
| S-40 | Plantillas de sistema | `/admin/plantillas` | A | CRUD de plantillas SISTEMA | P-40 |
| S-41 | Parámetros del sistema | `/admin/parametros` | A | Tabs: defaults de `ParametrosSistema` · `ValorReferencia` (Anexo A, informativos) | P-41 |
| S-42 | Logs de actividad | `/admin/logs` | A | Tabla filtrable de eventos | P-42 |

## 4. Domain rules

- **D-11 — creating a user is an invitation, never a temporary password.** `POST /admin/usuarios` sends an email with a link to set a password, expiring in **72 h**. The UI must say so and must not offer a password field. (The public `POST /auth/aceptar-invitacion` landing was built in plan 005; if it was not, add the `/aceptar-invitacion/:token` route here reusing plan 005's reset-password screen shape and note it.)
- **Deactivate ≠ delete.** A deactivated user cannot log in but their data persists (`design/03` P-38). `DELETE` 409s if they own projects — surface that clearly (*"Este usuario tiene proyectos. Decide primero qué hacer con ellos."*), because there is no cascade.
- **D-12 (assumption) — deleting a central base means archiving it.** It disappears from the catalogue; project data is untouched. Use the word *archivar* in the UI, never *eliminar*, and explain the consequence. Flag that this is an assumption pending interview 02.
- **A9 (assumption) — central-base price edits do NOT propagate** to users' APU rows (rows are frozen when added). `07 §9` states it on the PUT endpoint. Put that sentence in the edit dialog's help text, because an admin will otherwise assume the opposite.
- **SISTEMA templates are created from a reference APU** (`PlantillaSistemaCrearRequest.desdeApuId`), with `tipo=SISTEMA` and `usuario_id=NULL` fixed by the server. Same snapshot mechanism as personal templates (plan 010).
- **`ParametrosSistema` changes affect only new projects** (DM §15) — copied at project creation. State that prominently; it is counterintuitive.
- **`ValorReferencia` values are informative only** — *"nunca entran al motor"* (v1.1 §4.5). The value field is **text**, not a number, and must not be formatted as currency. Fields: `clave` (unique, e.g. `SBU`), `valor`, `descripcion` (required), `fuente` (required, e.g. *"Ministerio del Trabajo 2023"*).
- **Logs contain no PII or secrets** (RNF-08). Display only; no export, no drill-down into user data.

## 5. Files in scope

```
src/features/admin/
  pages/{UsuariosPage,BasesCentralesPage,DetalleBasePage,PlantillasSistemaPage,
         ParametrosSistemaPage,LogsPage}.tsx
  components/{DialogoInvitarUsuario,DialogoEditarUsuario,DialogoBase,
              DialogoPlantillaSistema,TabValoresReferencia,FiltrosLogs}.tsx
  hooks/{useUsuariosAdmin.ts,useBasesAdmin.ts,usePlantillasSistema.ts,
         useParametrosSistema.ts,useValoresReferencia.ts,useLogs.ts}
  schemas.ts
  *.test.tsx
src/test/handlers.ts · src/test/fixtures/admin.ts
src/routes/index.tsx                            (edit — replace admin placeholders)
```

**Reuse, do not rebuild:**
- `DialogoInsumo` and `AsistenteImportCsv` from `src/features/insumos/` (plan 008 built them with a destination prop for exactly this).
- The parameter form from `src/features/proyectos/` (plan 007) — extract the shared field group into `src/features/proyectos/components/CamposParametros.tsx` if it is still inline, and use it in both. **This refactor is in scope**; leave plan 007's tests passing.
- The template preview from `src/features/apu-editor/` (plan 010).

**Never edit `plans/`** beyond `Status:`/README. **Never write to `../thesis-docs`.**

## 6. Steps

1. **Install:** `npx shadcn@4 add pagination` if not already present. Nothing exotic here.
2. **S-37 usuarios** — data table (nombre · email · rol · activo chip · emailVerificado · fecha). Actions: invitar · editar · desactivar/reactivar · eliminar (confirmation; 409 explains the project constraint). The invite dialog collects nombre, email, rol — **no password field** — and its success message states the 72 h expiry.
3. **S-38 bases** — list with an `incluirArchivadas` toggle; create/rename dialogs; **archivar** with a confirmation explaining D-12. Archived bases render with a chip and no edit actions.
4. **S-39 detalle de base** — the insumo table for that base, reusing `DialogoInsumo` and `AsistenteImportCsv` with `destino: { tipo: "CENTRAL", baseId }`. Include the A9 note in the edit dialog.
5. **S-40 plantillas de sistema** — list, create from a reference APU (`desdeApuId` — the picker needs an APU; scope it to a project the admin selects, and if that is awkward, accept a numeric id with a preview and report the UX gap), rename, delete, preview snapshot.
6. **S-41 parámetros** — two tabs. Tab 1: the 12 system defaults, same validation as plan 007 (RNF-09 ranges, percentages as fractions on the wire), with a prominent notice *"Estos valores se copian a los proyectos nuevos. Los proyectos existentes no cambian."* Tab 2: `ValorReferencia` CRUD — a table with inline add/edit, `valor` as a **text** input.
7. **S-42 logs** — filterable table (usuarioId, evento, desde, hasta), server-paginated. Render `detalle` as compact JSON in an expandable cell. No export button.
8. **Handlers, fixtures, tests, `npm run verify`, commit.**

## 7. Test plan

- `UsuariosPage.test.tsx` — the invite dialog has **no password input** (assert absence — this is D-11 made testable); the success message mentions 72 h; deactivate/reactivate toggles the chip; DELETE 409 renders the project-constraint explanation.
- `BasesCentralesPage.test.tsx` — the destructive action is labelled *archivar* and its confirmation explains that project data is untouched; archived bases appear only with the toggle on.
- `DetalleBasePage.test.tsx` — reuses `DialogoInsumo` (assert by rendering it, not by duplicating its tests) with the central destination: the create request goes to `/admin/bases-centrales/{id}/insumos`; the edit dialog shows the A9 non-propagation note.
- `ParametrosSistemaPage.test.tsx` — imports the shared parameter schema; RNF-09 boundaries (%HM 21 rejected, %CI 101 rejected, IVA 31 rejected); percentages sent as fractions; the "solo proyectos nuevos" notice is present.
- `TabValoresReferencia.test.tsx` — `valor` is a text field and is **not** currency-formatted; `descripcion` and `fuente` required; upsert by `clave`.
- `LogsPage.test.tsx` — filters build the right query params; pagination works; no export control exists.
- `Guards` regression: a `USUARIO` visiting `/admin/*` lands on `/403` (already covered in plan 006 — re-run those tests, do not duplicate).

## 8. Done criteria

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- admin` | ≥ 22 tests passing |
| `grep -rn "password" src/features/admin/components/DialogoInvitarUsuario.tsx \| wc -l` | `0` |
| `grep -rn "eliminar" src/features/admin/pages/BasesCentralesPage.tsx \| wc -l` | `0` (the word is *archivar*) |
| `grep -rn "from \"@/features/insumos" src/features/admin \| wc -l` | ≥ 1 (reuse, not rebuild) |
| all six `/admin/*` routes no longer render `Placeholder` | exit 0 |
| `grep -rn "toFixed\|parseFloat" src/features/admin \| wc -l` | `0` |

## 9. Boundaries

- **Do not** add roles beyond `USUARIO` and `SUPER_ADMIN`.
- **Do not** offer temporary passwords or let an admin set another user's password (D-11).
- **Do not** offer hard deletion of a central base (D-12: archive).
- **Do not** format `ValorReferencia.valor` as a number or feed it anywhere near a calculation — it is informative text (v1.1 §4.5).
- **Do not** duplicate the insumo dialog, the CSV wizard, or the parameters form. Reuse.
- **Do not** add a log export or any view that could surface PII (RNF-08).
- **Do not** rely on hiding admin UI for security — the server enforces roles.

## 10. Escape hatches

- If `PlantillaSistemaCrearRequest.desdeApuId` has no reasonable picker (the admin may not own a project with a suitable APU), implement the numeric-id + preview fallback and **report the UX gap** — it may be a spec hole worth raising with the humans.
- If interview 02 resolves D-12 (archive vs delete) or A9 (propagation) while you work, follow the answer and note the deviation.
- If reusing plan 007's parameter form requires more than extracting a component — e.g. it is entangled with project-specific queries — extract the **fields only** and keep the two submit paths separate. Do not break plan 007's tests.

## 11. Maintenance note

The A9 and D-12 assumptions are both marked *pendiente de confirmación* in the spec repo. Both are surfaced to the admin as help text in this module, which means if the decisions flip, the copy here lies. Grep for the A9 and D-12 wording when those decisions land.

The reuse relationships (insumos dialog, CSV wizard, parameters form) are the main structural risk: a change made "for the admin" that leaks into the user-facing screens. Any edit to `src/features/insumos/components/DialogoInsumo.tsx` should re-run both plans' test suites.
