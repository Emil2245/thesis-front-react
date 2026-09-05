# Plan 047 — **[BACKEND]** ID path type inconsistencies at the REST frontier

**Status:** TODO
**Repo:** `../thesis-back-quarkus` — branch `test/stuff`, HEAD `eb9a1da`
**Written against:** `e44c608` (frontend), `eb9a1da` (backend)
**Spec source:** Plan 07 — "Identidad externa inmutable UUIDv7 (`public_id`)"; `Plan07Uuidv7FronterasTest`
**Effort:** M (3-5 hours)
**Risk:** MEDIUM — touches the REST frontier and its ownership checks; DB untouched

> **Execute this plan in the backend repo, not the frontend.** It exists here because the
> frontend is blocked on it. See `plans/ROADMAP-V2-BACKEND-PARITY.md`.

## Why

Plan 07 established the doctrine, stated verbatim in `ProyectoResource`'s javadoc:

> *Los path params reciben UUIDv7 como `String` y se validan con `UuidV7#parse` en la frontera
> REST. … El `BIGINT` interno se retiene debajo de este resource y de los services; nunca se
> expone.*

Four paths break it. Two are outright bugs; two are **not** what the roadmap first assumed.

### Finding — the roadmap's rows 3 and 4 are correct as written

The initial survey guessed that `/presupuestos/{id}/apus` and
`/documentos/especificaciones-tecnicas/{id}` were anomalies for taking a UUID, since presupuesto
is a `Long` everywhere else. **Reading the code says the opposite:**

- `Presupuesto` **has** a `public_id` UUID column (`presupuesto/entity/Presupuesto.java:20-21`).
- `PresupuestoApuResource` resolves it correctly via
  `presupuestoRepository.findByPublicIdAndOwnerScope(...)` (`PresupuestoApuResource.java:76-84`).
- `Plan07Uuidv7FronterasTest` has a section header **"Módulo 3: presupuesto (paths UUIDv7)"**
  with passing tests `TC_P07_PRESUPUESTO_01/02/03` asserting UUIDv7 behaviour on
  `/presupuestos/{id}/apus`.

So those two endpoints are the ones **obeying** the doctrine. The real gap is that the rest of
the presupuesto module never migrated: `PresupuestoResponse` still exposes `Long presupuestoId`,
leaking the internal BIGINT the doctrine forbids.

`Capitulo`, `Rubro`, `Cronograma` and `Actividad` have **no** `public_id` column — only
`Presupuesto` does. A full migration therefore means new columns and a Flyway migration, which
is out of scope here.

**This plan fixes only the two unambiguous bugs (Steps 1-2) and records the larger migration as
a follow-up (Step 5). It deliberately does not touch rows 3 and 4.**

## What changes

1. `/proyectos/{proyectoId}/presupuestos` — accept UUIDv7, not `Long`.
2. `/proyectos/{proyectoId}/logo` — accept UUIDv7, not `Long`.
3. Extend `Plan07Uuidv7FronterasTest` to cover both.
4. Leave `/presupuestos/{id}/apus` and `/documentos/especificaciones-tecnicas/{id}` alone.
5. File a follow-up for the presupuesto-module UUIDv7 migration.

## Steps

### Step 1 — `PresupuestoVersionResource` accepts UUIDv7

`src/main/java/ec/uce/propuestas/presupuesto/resource/PresupuestoVersionResource.java`

Today both methods bind `Long` and call a `validarAcceso(Long)` helper:

```java
private void validarAcceso(Long proyectoId) {
    proyectoService.validarPropietario(usuarioId(), proyectoId);
}

@GET
public List<PresupuestoVersionResponse> listar(@PathParam("proyectoId") Long proyectoId) {
```

`ProyectoService.validarPropietario` is already overloaded — `(Long, UUID)` at line 99 and
`(Long, Long)` at line 105 — and the UUID overload returns the `Proyecto` entity. Follow the
`ProyectoResource.resolverProyecto` pattern (`ProyectoResource.java:65-68`):

```java
/** Resuelve {@code proyectoId} (UUIDv7) → id interno validado por owner. */
private Long resolverProyectoInterno(String proyectoIdStr) {
    UUID publicId = UuidV7.parse(proyectoIdStr);
    return proyectoService.validarPropietario(usuarioId(), publicId).id;
}

@GET
@Consumes(MediaType.WILDCARD)
public List<PresupuestoVersionResponse> listar(@PathParam("proyectoId") String proyectoId) {
    return presupuestoService.listarVersiones(resolverProyectoInterno(proyectoId));
}

@POST
public Response crear(@PathParam("proyectoId") String proyectoId, @Valid PresupuestoVersionCrearRequest req) {
    PresupuestoVersionResponse version =
            presupuestoService.crearVersion(resolverProyectoInterno(proyectoId), req);
    return Response.status(Response.Status.CREATED).entity(version).build();
}
```

Add `import ec.uce.propuestas.common.UuidV7;` and `import java.util.UUID;`. Delete the now-unused
`validarAcceso(Long)`.

`PresupuestoService.listarVersiones` / `crearVersion` keep their `Long` signatures — the
translation stops at the resource, which is exactly what the doctrine asks for.

### Step 2 — `ProyectoResource` logo endpoints accept UUIDv7

`src/main/java/ec/uce/propuestas/proyecto/resource/ProyectoResource.java:109-133`

The class already has `resolverProyecto(String)` returning the entity. Use it:

```java
@PUT
@Path("/{proyectoId}/logo")
@Consumes(MediaType.APPLICATION_OCTET_STREAM)
public Response subirLogo(@PathParam("proyectoId") String proyectoId, byte[] data) {
    if (data == null || data.length == 0) {
        throw ProblemaException.validacion("El logo no puede estar vacío");
    }
    if (data.length > 2 * 1024 * 1024) {
        throw ProblemaException.validacion("El logo no puede superar 2 MB");
    }
    proyectoService.guardarLogo(usuarioId(), resolverProyecto(proyectoId).id, data);
    return Response.noContent().build();
}

@GET
@Path("/{proyectoId}/logo")
@Produces(MediaType.APPLICATION_OCTET_STREAM)
@Consumes(MediaType.WILDCARD)
public Response obtenerLogo(@PathParam("proyectoId") String proyectoId) {
    var p = resolverProyecto(proyectoId);
    if (p.logo == null || p.logo.length == 0) {
        throw ProblemaException.noEncontrado("El proyecto no tiene logo");
    }
    return Response.ok(p.logo).type(MediaType.APPLICATION_OCTET_STREAM).build();
}
```

Keep the size/empty validation **before** the lookup in `subirLogo` so a malformed upload still
fails fast on validation rather than on a DB round-trip.

> Watch for path ambiguity: `/proyectos/parametros-sistema` is a sibling of
> `/proyectos/{proyectoId}`. It already coexists today and `UuidV7.parse` rejects
> `"parametros-sistema"` with 400, so behaviour is unchanged — but confirm the
> `parametros-sistema` tests still pass, since JAX-RS prefers the literal match.

### Step 3 — Extend `Plan07Uuidv7FronterasTest`

`src/test/java/ec/uce/propuestas/identifier/Plan07Uuidv7FronterasTest.java`

Follow the existing naming and the three-case shape used by
`TC_P07_PROYECTO_02/03` and `TC_P07_PRESUPUESTO_01/02`:

```java
// Módulo: versiones de presupuesto bajo proyecto (paths UUIDv7)

@Test
void TC_P07_PRESUPUESTO_VERSION_01_path_uuid_v4_no_v7_devuelve_400() { ... GET /api/v1/proyectos/{UUID_NO_V7}/presupuestos ... }

@Test
void TC_P07_PRESUPUESTO_VERSION_02_path_uuid_v7_inexistente_devuelve_404() { ... }

@Test
void TC_P07_PRESUPUESTO_VERSION_03_listar_con_uuid_v7_valido_devuelve_200() { ... }

// Módulo: logo de proyecto (paths UUIDv7)

@Test
void TC_P07_LOGO_01_path_uuid_v4_no_v7_devuelve_400() { ... GET /api/v1/proyectos/{UUID_NO_V7}/logo ... }

@Test
void TC_P07_LOGO_02_path_uuid_v7_inexistente_devuelve_404() { ... }
```

Reuse the fixture helpers already in the class (`insertarPresupuesto(proyectoId)`, the
`UUID_NO_V7` / `UUID_INEXISTENTE` constants, and the `reset()` truncate).

Assert **404, never 403**, for a project owned by another user — that is the established rule
(`TC_P07_PROYECTO_04`).

### Step 4 — Update existing tests that pass a numeric id

```bash
cd ../thesis-back-quarkus
grep -rn "presupuestos" src/test/java --include="*.java" | grep -v Plan07
grep -rn "/logo" src/test/java --include="*.java"
```

Known classes to check: `PresupuestoResourceIT`, `DocumentoResourceIT`,
`SnapshotProyectoMapperTest`. Any call building `"/api/v1/proyectos/" + longId + "/presupuestos"`
must switch to the project's UUIDv7 public id.

### Step 5 — Record the follow-up, do not do it here

Open a backend plan for **"presupuesto module UUIDv7 migration"** covering:

- `PresupuestoResponse.presupuestoId` and `PresupuestoVersionResponse.presupuestoId` /
  `origenId` exposing `Long` — a direct doctrine violation.
- `Capitulo`, `Rubro`, `Cronograma`, `Actividad` have no `public_id` — needs a Flyway migration
  before their endpoints can move.
- `/documentos/*` `Long` path params, which follow from the above.

Do **not** start it inside this plan: it changes the wire format for presupuesto, cronograma and
export all at once, and the frontend has just been aligned to the `Long` shape (`e44c608`).
Sequence it deliberately with the frontend.

### Step 6 — Verify

```bash
cd ../thesis-back-quarkus
./mvnw test
```

**Expected baseline:** 318 tests, **2 red**, 1 skipped.

The two reds are **pre-existing and accepted** — `GM-19` and `GM-20`, motor consolidation
rounding residuals. They are red before this plan and must stay red-for-the-same-reason after.
`GM-24` is skipped on an upstream fixture. **Do not "fix" them and do not treat them as a
regression.** Any *third* failure is yours.

## Seams under test

- `Plan07Uuidv7FronterasTest` — the canonical frontier contract for UUIDv7 paths. Primary seam.
- `PresupuestoResourceIT` — presupuesto tree endpoints (unchanged here, must stay green).
- `DocumentoResourceIT` — export endpoints (unchanged here, must stay green).

Test at the HTTP boundary with RestAssured, as the existing tests do. Do not unit-test the
private `resolverProyectoInterno` helper — it is an implementation detail behind the seam.

## Out of scope

- Rows 3 and 4 of the original survey. They are correct; see **Why**.
- The presupuesto-module UUIDv7 migration (Step 5).
- Merging `test/stuff` into `main`.

## Escape hatches

- If `ProyectoService.validarPropietario(Long, UUID)` does not return the entity in your
  checkout, use `findByPublicIdAndOwnerScope` directly, as `PresupuestoApuResource:78-80` does.
- If JAX-RS resolves `/proyectos/parametros-sistema` to `{proyectoId}` after the change,
  add `@Path("/{proyectoId: [0-9a-fA-F-]{36}}")` to constrain the template.

## Maintenance notes

There are **two** classes annotated `@Path("/documentos")` —
`documento/DocumentoResource.java` (especificaciones-técnicas, UUID) and
`documento/resource/DocumentoResource.java` (apu/apus/presupuesto/cronograma, Long). They do not
collide because their sub-paths differ, so this is legal, but it is a trap: a reader greps
`DocumentoResource` and finds the wrong file. Consider merging them under the Step 5 follow-up.
