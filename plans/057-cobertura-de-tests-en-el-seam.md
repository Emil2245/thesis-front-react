# Plan 057 — Cobertura de tests donde viven los bugs

**Status:** TODO
**Escrito contra:** frontend `8cc08b5` — 45 archivos, 207 tests, verdes
**Esfuerzo:** L (2–3 días, pero rebanable por módulo) · **Riesgo:** BAJO — solo añade tests
**Depende de:** `061` · `053` · `054` · `059` — se fija el seam **después** de corregirlo
**Hermano de:** `028` (Zod). Este plan pone la prueba; el 028 pone la validación.
**Evidencia:** [`INVENTARIO-COBERTURA.md`](INVENTARIO-COBERTURA.md) §4

## El dato que ordena todo el backlog

| Capa | Archivos | Con test | Sin test |
|---|---|---|---|
| Páginas | 27 | 16 | 11 |
| Componentes de feature | 46 | 21 | 25 |
| **Hooks de feature** | **27** | **1** | **26** |

**26 de 27 hooks no tienen un solo test.** El único cubierto es `useApuEditor`.

## Por qué esto es la causa raíz y no una métrica más

Repasa dónde vive cada defecto que el handoff documenta:

| Defecto | Dónde |
|---|---|
| `PUT /cronogramas/{id}` sin `/configuracion` | `useCronograma.ts` |
| `/admin/bases` en vez de `/admin/bases-centrales` | `useAdminBases.ts` |
| `porcentajeIndirecto` descartado en silencio | `useApuEditor.ts` |
| `descripcion` en vez de `descripcionRubro` | `usePlantillas.ts` |
| `enabled: presupuestoId > 0` con UUID | `usePresupuesto.ts`, `useExportar.ts` |
| 409 leído de `periodosAfectados`, campo inexistente | `useCronograma.ts` |
| `POST /plantillas-proyecto` en vez de `/proyectos/{id}/guardar-plantilla` | `usePlantillasProyecto.ts` |
| `/uso` en vez de `/usos` | `DialogoUsoInsumo.tsx` |

**Todos en hooks.** Y los 207 tests cubren páginas y componentes, es decir la capa que consume el
hook **cuando el hook ya devolvió datos del mock**. El mock siempre responde bien. La suite nunca
mira la petición que sale.

Por eso tres análisis contra ramas o commits equivocados produjeron código que typechequea y pasa
la suite entera estando mal sobre el formato de red. No es mala suerte ni descuido: **la suite no
mira ahí, por construcción**.

Cualquier plan que arregle hooks sin dejar tests de hook deja el agujero abierto para el siguiente.

## Qué es «un test de hook» aquí

No es probar TanStack Query. Es probar **el contrato de salida**: qué petición sale, con qué
método, a qué ruta, con qué cuerpo. MSW ya está montado; lo que falta es **asertar sobre la
petición**, no solo sobre la respuesta.

Forma canónica, con `renderHook` de RTL y un espía en el servidor MSW:

```
dado un hook con ids UUID reales
cuando se dispara la mutación
entonces MSW recibió: método X, ruta Y, cuerpo exactamente Z
```

Tres reglas que hacen que estos tests sirvan de algo:

1. **Asertar sobre la petición, no sobre el resultado.** `await waitFor(() => expect(mutation.isSuccess).toBe(true))` está verde contra casi todos los bugs de la lista. Hay que capturar la
   request.
2. **Los handlers rechazan lo desconocido.** Un handler que acepta cualquier cuerpo no puede
   detectar un campo de más ni uno mal nombrado. Cada handler de mutación valida su cuerpo y
   devuelve 400 si sobra o falta algo, replicando lo que hace el backend.
3. **Ids UUID en las fixtures, siempre.** Un test con `id: 1` no detecta `enabled: id > 0`.

`src/test/handlers.ts` necesita un helper compartido para (2). Escribirlo una vez, en la primera
rebanada; sin él, cada módulo lo reinventa distinto.

## Rebanadas — una por módulo, independientes

Cada una es committeable por separado y no toca las demás. El orden va por riesgo, no por tamaño.

### 1 — infraestructura + `useCronograma`

El helper de captura de peticiones, el helper de handler estricto, y el primer módulo: cronograma,
que es el que más defectos concentra (plan 055).

Cubre: ruta de configuración, las 4 operaciones de programación, los tres 409 distinguidos por
`codigo`, el 404 = «sin cronograma».

### 2 — presupuesto

`usePresupuesto`, `useCapituloMutaciones`, `useRubroMutaciones`, `useVersionMutaciones`.
Es el dominio del plan 053: los guards `> 0`, el `parentId` UUID, el catch que se traga el 404.

Añadir aquí el test de página que falta: **`VersionesPage`** — P-31 / US-28, núcleo de I-08, y el
plan 053 le cambia los tipos de id. Es la página sin test que más pesa.

### 3 — APU e insumos

`useApus`, `usePlantillas`, `useBusquedaParaApu`, `useInsumos`, `useInsumoMutaciones`,
`useBasesCentrales`, `useImportCsv`.

Aquí caen dos bugs silenciosos (`porcentajeIndirecto`, `descripcionRubro`) y el `seccionTipo` que
falta (plan 059). `useImportCsv` merece atención aparte: parsea CSV con papaparse y valida fila a
fila (F-05); es lógica pura y hoy no tiene ninguna prueba.

### 4 — proyectos y plantillas de proyecto

`useProyectos`, `useProyecto`, `useFirmantes`, `useParametros`, `usePlantillasProyecto`,
`useDescuentoGlobal`.

`useFirmantes` no tiene test y **sí tiene backend completo** — es de los pocos módulos correctos, y
conviene fijarlo antes de que alguien lo rompa.

### 5 — admin y export

`useAdminBases`, `useParametrosSistema`, `useExportar`. Los otros cuatro hooks de admin
(`useAdminUsuarios`, `useAdminLogs`, `useAdminPlantillas`, `useValoresReferencia`) el plan 050 los
borra: **no escribir tests para código que se va a eliminar** — coordinar el orden.

`useExportar` estrena la descarga binaria (plan 051): test del blob y del nombre de archivo leído
de `Content-Disposition`.

### 6 — auth y las páginas huérfanas

`useAuthMutaciones` (el flujo de refresh token del interceptor es lo más delicado del seam y no
tiene test propio) y las páginas restantes: `PerfilPage`, `RestablecerPage`, `ErrorPage`,
`NoEncontradaPage`, `SinPermisoPage`.

Las tres de error son baratas y cierran P-44 / US-04.

### 7 — los componentes comunes de formato

`Moneda`, `Numero`, `Porcentaje` en `src/components/comunes/`. Solo uno de los 14 comunes tiene
test, y estos tres son **la frontera donde se decide cómo se ve el dinero**.

Es donde va a doler la partición `Decimal` string vs number (handoff §2, decisión abierta). Fijar
su comportamiento con tests **antes** de tomar esa decisión hace que la migración sea verificable
en vez de una apuesta.

## Lo que este plan NO hace

- **No persigue un porcentaje de cobertura.** `vitest run --coverage` existe; un número alto con
  tests de página seguiría sin ver ninguno de los bugs. La métrica que importa es «hooks con test
  de contrato», no líneas cubiertas.
- **No testea los componentes de presentación** (`FilaRubro`, `ChipAlerta`, `BadgeHerencia`…).
  Son 25 archivos y el retorno es bajo comparado con los hooks. Si sobra tiempo, después.
- **No toca los E2E.** `e2e/screenshots.spec.ts` arrastra ~26 ids numéricos; es del plan 021 y lo
  recoge el plan 060.

## Relación con el 028

El 028 añade validación Zod en el seam: el runtime rechaza una respuesta con forma equivocada.
Este plan añade tests que comprueban la **petición** que sale.

Son las dos mitades: Zod cubre lo que entra, los tests cubren lo que sale. Ninguna de las dos sola
habría cazado la lista de defectos completa — Zod no ve una URL mal escrita, y un test de hook no
ve un campo que el servidor real devuelve con otro tipo.

**Hacer el 057 antes que el 028** tiene una ventaja de orden: al escribir los tests de contrato
aparecen los esquemas que el 028 necesita, ya derivados del uso real en vez de copiados a mano de
los records de Java.

## Definición de hecho

- `npm run verify` en verde.
- Los 27 hooks de feature tienen al menos un test que asserta sobre la petición saliente.
- `src/test/handlers.ts` rechaza propiedades desconocidas en todas las mutaciones.
- Todas las fixtures usan UUIDv7 estables; cero ids numéricos fuera de `usuario` y `perfil`.
- Las 11 páginas sin test la tienen.
- `Moneda`, `Numero` y `Porcentaje` tienen test.

---

## Añadido 2026-09-06 (ola 2) — el banner `CI_NO_CONFIGURADO` es un fixture que miente

Encontrado al revisar el plan `059`. Es el caso de libro de lo que este plan existe para cazar.

**Los hechos, verificados contra `origin/main @ c337950`:**

- `ProyectoResponse` **no tiene `alertas`** — el record son 13 campos y ninguno es ese.
- `CI_NO_CONFIGURADO` **no aparece en ninguna parte del backend** (`git grep` en todo `origin/main`).
- El frontend declara `ProyectoDetalleResponse = ProyectoResponse & { alertas?: string[] }` en
  `src/api/contract.ts` — tipo inventado aquí, no traducido de nada.
- `ResumenProyectoPage.tsx` pinta un banner con enlace a parámetros cuando
  `proyecto.alertas?.includes("CI_NO_CONFIGURADO")`.
- `src/test/fixtures/proyectos.ts` sirve `alertas: ["CI_NO_CONFIGURADO"]`, y
  `ResumenProyectoPage.test.tsx` comprueba que el banner sale.

**Consecuencia:** el banner no puede aparecer nunca en producción, y el test está verde porque el
fixture inventa el campo. Test que solo prueba el fixture.

**Decisión de producto pendiente — preguntar antes de ejecutar esta sección.** Dos salidas:

1. **Calcularlo en el cliente.** El aviso es útil y el dato ya está: `ParametrosProyectoResponse`
   dice si el %CI está configurado. El banner deja de depender de un campo fantasma y empieza a
   funcionar de verdad. *Recomendada* — conserva la UX y no necesita backend.
2. **Borrarlo.** Banner, tipo `ProyectoDetalleResponse`, campo del fixture y test. Si el aviso no
   se quiere, no debe quedar el andamio.

Lo que **no** vale es dejarlo como está: promete un aviso que el usuario nunca verá.
