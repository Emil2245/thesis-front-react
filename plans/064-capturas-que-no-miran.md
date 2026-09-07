# Plan 064 — Las capturas E2E no miran lo que fotografían

**Status:** DONE (2026-09-06, rama `ola7-064`, sobre `d77f1b2`)
**Escrito contra:** frontend `main` tras la ola 6 · backend `origin/main` @ `c337950`
**Esfuerzo:** S (1 h) · **Riesgo:** BAJO
**Ola:** 7 — es lo último que queda de la ruta
**Origen:** hallazgo del plan `060`, verificado por el orquestador mirando el PNG

## El defecto

**`screenshots/08-presupuesto.png`, commiteado en el repo, es una foto de una pantalla reventada.**
Muestra el error boundary: *«Algo salió mal en esta sección. Reintentar»*. Y `pnpm run e2e` da
**20/20 en verde**.

### Por qué revienta

`ResumenComponentes.tsx` hace:

```ts
const items = Object.entries(data.porComponente).map(...)
```

El contrato declara `ResumenComponentesResponse.porComponente: Record<string, Decimal>` y el
fixture de unidad (`resumenComponentesFixture`) lo respeta. Pero el stub de
`e2e/screenshots.spec.ts` devuelve una forma **plana** que nunca ha existido en el contrato:

```ts
{
  equipo: { total: "4000.000000", porcentaje: "0.2830" },
  manoObra: { total: "6000.000000", porcentaje: "0.4250" },
  material: { total: "3000.000000", porcentaje: "0.2120" },
  transporte: { total: "1000.000000", porcentaje: "0.0800" },
  totalGeneral: "14000.000000",
}
```

Sin clave `porComponente`, `Object.entries(undefined)` lanza
`TypeError: Cannot convert undefined or null to object`, y `LimiteDeError` lo atrapa.

**Contra el backend real la pantalla funciona.** El defecto es del stub, escrito en `db5f1ed`
(2026-07-24) contra un contrato que `e44c608` cambió el 2026-09-05. Lleva roto desde entonces.

### El defecto de verdad no es el stub

El stub es una línea. **Lo grave es que el test no mira.**

```ts
test("08-presupuesto", async ({ page }, testInfo) => {
  // ...navega...
  await capturar(page, "08-presupuesto", testInfo);
});
```

Navega y fotografía. No asserta nada. Una pantalla completamente caída pasa el test, la foto de la
caída se commitea, y el gate sigue verde. Es la misma ceguera que el `057` cerró para los hooks y
el `063` para los errores, vista desde el lado de los E2E: **si nadie mira, el verde no significa
nada.**

## El arreglo

### Rebanada 1 — que las once capturas miren

Las once pruebas pasan por la **misma** función, `capturar(page, nombre, testInfo)` en
`e2e/screenshots.spec.ts:447`. Ahí va la guarda, una vez, no once veces:

```ts
// Una captura de una pantalla reventada es peor que ninguna: se commitea y el
// gate la da por buena. 08-presupuesto lo estuvo desde 2026-09-05 (plan 064).
await expect(page.getByText("Algo salió mal en esta sección.")).toHaveCount(0);
```

El texto sale de `src/components/comunes/LimiteDeError.tsx:28`. Si algún día cambia, este test se
vuelve inútil en silencio — así que **añade también un test de unidad** que compruebe que
`LimiteDeError` renderiza exactamente esa cadena. Dos líneas que evitan que la guarda se pudra.

**Este es el paso que importa.** Aunque el stub se arreglara y nada más, el siguiente error
boundary volvería a colarse.

### Rebanada 2 — el stub

Corrige la forma del stub de `resumen` en `e2e/screenshots.spec.ts` para que coincida con
`ResumenComponentesResponse`:

```ts
{
  porComponente: {
    EQUIPO: "4000.000000",
    MANO_OBRA: "6000.000000",
    MATERIAL: "3000.000000",
    TRANSPORTE: "1000.000000",
  },
  totalGeneral: "14000.000000",
  ivaReferencial: "1680.000000",
  totalConIva: "15680.000000",
}
```

**Comprueba las claves contra el backend** (`ResumenComponentesResponse` y quien lo construye en
`origin/main`) antes de darlas por buenas: `COMPONENTE_META` en `ResumenComponentes.tsx` dice qué
claves sabe pintar el frontend, y si no coinciden con las del backend saldrá la etiqueta cruda.
No lo adivines por el nombre.

Los otros diez stubs de ese archivo **no se han comprobado nunca contra el contrato**. Al arreglar
este, pasa los demás por el mismo cedazo: cualquier otro que no cuadre saldrá solo en cuanto la
rebanada 1 esté puesta.

### Rebanada 3 — regenerar

`pnpm run e2e:screenshots` y commitear las capturas que cambien. `08-presupuesto.png` debe pasar de
la pantalla de error a un resumen con cifras.

## Definición de hecho

- `pnpm run verify` y `pnpm run e2e` en verde.
- `capturar()` falla si hay un error boundary en la página, y hay **un test que lo demuestra**:
  revierte el stub de la rebanada 2 y `08-presupuesto` debe ponerse rojo.
- Un test de unidad ancla el texto de `LimiteDeError`.
- `screenshots/08-presupuesto.png` muestra el resumen de componentes, no el boundary. **Míralo**,
  no te fíes de que el test pase.
- Ningún otro stub de `e2e/screenshots.spec.ts` contradice a `src/api/contract.ts`.
