# Plan 062 — La subida de archivos está rota y el banner de CI es un fantasma

**Status:** TODO
**Escrito contra:** frontend `ad4c0f3` · backend `origin/main` @ `c337950`
**Origen:** hallazgos del plan `057`, que es add-tests-only y no podía arreglarlos
**Esfuerzo:** S (1–2 h) · **Riesgo:** BAJO — dos arreglos independientes, ambos revertibles
**Ola:** 3-bis, entre el `057` y el `028`

Dos defectos de producción verificados leyendo el código, que **ningún plan del roadmap cubre**.
No comparten causa: van juntos porque los dos son pequeños y no se pisan.

---

## Rebanada 1 — axios convierte todo `FormData` en JSON

### El defecto

`src/api/client.ts` fija un `Content-Type` por defecto en la instancia:

```ts
export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});
```

Con **axios 1.19**, el `transformRequest` por defecto hace esto:

```js
if (utils.isFormData(data)) {
  return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
}
```

Como la cabecera dice `application/json`, `hasJSONContentType` es `true` y **todo `FormData`
sale serializado a JSON**, sin el archivo y sin el `boundary` de multipart. El servidor recibe un
objeto JSON donde esperaba `multipart/form-data`.

Rompe las dos únicas subidas de archivo del repo:

| Sitio | Qué sube |
|---|---|
| `src/features/insumos/hooks/useImportCsv.ts` ← `AsistenteImportCsv.tsx` (`handleImportar`) | el CSV de insumos |
| `src/features/proyectos/hooks/useProyecto.ts` (`useSubirLogo`) | el logo del proyecto |

**Por qué el gate no lo vio:** los handlers MSW nunca miraban el cuerpo de estas dos peticiones,
así que los tests pasaban con el archivo perdido. Es exactamente la clase de agujero que el `057`
cerró para las mutaciones JSON y que aquí sigue abierto porque el cuerpo no es JSON.

### El arreglo

**Borrar la cabecera por defecto.** Axios ya pone `application/json` solo cuando el cuerpo es un
objeto plano, y deja que el navegador ponga `multipart/form-data; boundary=…` cuando es `FormData`.
Fijarla a mano es lo que rompe el caso multipart.

```ts
export const http = axios.create({
  baseURL: API_BASE_URL,
});
```

No añadas un `Content-Type` condicional ni un `post` especial para archivos: la ausencia de la
cabecera **es** el arreglo. Una línea menos.

### El test rojo primero

En `src/test/`, un test que compruebe que el cuerpo que llega al handler **sigue siendo
`FormData`** y trae el archivo. Con `soloCampos` no vale: hay que mirar el cuerpo real.

```ts
// El handler MSW debe poder leer el archivo. Hoy recibe {"archivo":{}} en JSON.
http.post("*/proyectos/:id/insumos/importar", async ({ request }) => {
  const cuerpo = await request.formData();
  const archivo = cuerpo.get("archivo");
  return HttpResponse.json({
    creados: archivo instanceof File ? 1 : 0,
    actualizados: 0,
    errores: [],
  });
});
```

Con el `Content-Type` puesto, `request.formData()` lanza o devuelve vacío y el test falla.
**Confírmalo rojo antes de tocar `client.ts`.**

Escribe el mismo test para `useSubirLogo` con `PUT /proyectos/{id}/logo`.

### Ojo al quitar la cabecera

Quitarla cambia **todas** las peticiones, no solo las dos de archivo. Corre `pnpm run verify`
entero después: si algún handler dependía de la cabecera, sale ahí. No la reintroduzcas por
endpoint sin comprobar primero que el fallo es real.

---

## Rebanada 2 — el banner `CI_NO_CONFIGURADO` no puede aparecer nunca

### El defecto

`ResumenProyectoPage.tsx` pinta esto:

```tsx
{(proyecto.alertas?.length ?? 0) > 0 && (
  <Alert variant="destructive">
    ...
    {proyecto.alertas?.includes("CI_NO_CONFIGURADO") && (
      <span>Porcentaje de indirectos no configurado. <Link …>Configurar ahora</Link></span>
    )}
  </Alert>
)}
```

Verificado contra `origin/main @ c337950`:

- `ProyectoResponse` son 13 campos y **ninguno es `alertas`**.
- **`CI_NO_CONFIGURADO` no aparece en ningún archivo del backend.**
- `ProyectoDetalleResponse = ProyectoResponse & { alertas?: string[] }` en `src/api/contract.ts`
  es un tipo inventado en el frontend, no traducido de nada.
- `src/test/fixtures/proyectos.ts` sirve `alertas: ["CI_NO_CONFIGURADO"]`, y
  `ResumenProyectoPage.test.tsx` comprueba que el banner sale.

**El banner no puede aparecer en producción.** El test está verde porque el fixture inventa el
campo: prueba el fixture, no el producto.

### La decisión

**Tomada por el humano el 2026-09-06: calcularlo en el cliente.** El aviso es útil y el dato ya
está en el frontend — no hace falta backend.

### El arreglo

El predicado es `porcentajeIndirecto == null`. Verificado en el motor del backend
(`Motor.java:110-112`): el %CI del proyecto es un `BigDecimal` nullable y `null` significa
**no configurado**, no cero.

```ts
const { data: parametros } = useParametros(proyectoId);
const ciSinConfigurar = parametros != null && parametros.porcentajeIndirecto == null;
```

`useParametros` ya existe en `src/features/proyectos/hooks/useParametros.ts` y pega a
`GET /proyectos/{id}/parametros`. **Reúsalo, no escribas otro hook.**

Sustituye la condición del bloque `<Alert>` por `ciSinConfigurar`. El texto y el enlace a
`/proyectos/{id}/parametros` se quedan como están: son correctos.

**Usa `== null`, no `!porcentajeIndirecto`.** Un %CI configurado a `0` es una decisión válida del
usuario y no debe disparar el aviso.

### Limpieza que va con esto

- Borra `alertas` de `ProyectoDetalleResponse` en `src/api/contract.ts`. Si el tipo se queda sin
  nada propio, borra el tipo y usa `ProyectoResponse` en sus usos.
- Borra `alertas: ["CI_NO_CONFIGURADO"]` de `src/test/fixtures/proyectos.ts`.
- Reescribe `ResumenProyectoPage.test.tsx`: el caso pasa a montar la página con unos parámetros
  cuyo `porcentajeIndirecto` es `null` y comprobar que sale el aviso; y un segundo caso con
  `porcentajeIndirecto: 0.22` que comprueba que **no** sale.

### El test rojo primero

El caso de `porcentajeIndirecto: null` falla hoy: la página no mira los parámetros.

---

## Definición de hecho

- `pnpm run verify` en verde.
- `src/api/client.ts` no fija `Content-Type`.
- Dos tests —CSV y logo— que leen el cuerpo con `request.formData()` y comprueban que llega un
  `File`. Fallan si se reintroduce la cabecera.
- Cero `alertas` en `src/api/contract.ts` y en `src/test/fixtures/proyectos.ts`.
- El aviso de %CI sale con `porcentajeIndirecto: null` y **no** sale con `porcentajeIndirecto: 0`.
- `grep -rn CI_NO_CONFIGURADO src/` devuelve solo lo que quede en `ResumenProyectoPage` si decides
  conservar la constante como etiqueta interna; si no la conservas, cero.
