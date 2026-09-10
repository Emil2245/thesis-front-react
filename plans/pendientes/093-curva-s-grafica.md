# Plan 093: Curva S gráfica

## 01. Estado y dependencia

Depende del Plan 090. `CurvaSChart.tsx` hoy presenta los puntos como tabla; el backend ya entrega la serie completa en `CronogramaVistasResponse.curvaS`, por lo que puede visualizarse sin recalcular la programación.

## 02. Resultado observable

El panel **Curva S** muestra una gráfica SVG responsive de la distribución programada acumulada por período. Cada punto permite consultar período, porcentaje acumulado y monto acumulado; una tabla accesible conserva el detalle exacto.

## 03. Límite semántico explícito

La gráfica representa **programación acumulada**, no avance ejecutado. No usa textos como «avance real», «programado vs. real», SPI, forecast o desviación temporal porque el backend no expone ejecución física/financiera real. Añadir una segunda serie real requiere primero contrato y plan backend canónicos.

## 04. Fuentes canónicas

- `CurvaSResponse` y `PuntoCurvaSResponse` del backend y `VistasCronogramaResourceIT`.
- Entrevista N05 e imagen de Curva S aportada por el usuario, usada solo como referencia visual.
- [visx accessibility guidance](https://github.com/airbnb/visx/blob/master/packages/visx-a11y/Readme.md), como referencia no normativa para etiquetado y alternativa tabular.

No se añade visx, Recharts, D3 ni otra librería. SVG/HTML nativos son suficientes para la serie actual y evitan introducir un modelo gráfico que derive dominio.

## 05. Serie y geometría

- Eje X: períodos ordinales `M1…Mn` o `S1…Sn`, nunca fechas.
- Eje Y principal: `porcentajeAcumulado`, con escala visual 0–100.
- El monto acumulado se muestra en tooltip/detalle y tabla; no se mezcla en el mismo eje.
- La línea y sus puntos salen en el mismo orden de `curvaS.puntos[]`.
- Convertir Decimal a número para coordenadas es geometría efímera de presentación: no altera, suma, redondea, persiste ni devuelve valores al servidor.
- `parseFloat` y `toFixed` permanecen prohibidos fuera de `src/lib/decimal.ts`.

## 06. Accesibilidad e interacción

El SVG usa `role="img"`, nombre accesible, `<title>` y `<desc>`. La serie no depende solo de color: línea, puntos y estados de foco tienen forma/contraste. Los puntos son navegables por teclado o se acompañan de una lista accesible sincronizada. El tooltip nunca contiene información exclusiva. La tabla completa permanece en un `<details>` rotulado y navegable.

## 07. Alcance incluido

- Sustituir la tabla como presentación primaria por un SVG responsive.
- Ejes, grid mínimo, línea, puntos, foco/hover y detalle del punto.
- Formato español de porcentaje y moneda mediante helpers existentes.
- Tabla alternativa con todos los campos originales.
- Empty state para serie vacía y comportamiento definido para un solo punto.
- Pruebas de orden, valores, a11y y ausencia de segunda serie ficticia.

## 08. Fuera de alcance

No avance real, línea base comparativa, SPI, forecast, interpolación de datos faltantes, fechas, zoom/pan, edición, cálculos monetarios, exportación de imagen ni librería gráfica.

## 09. Archivos candidatos

`src/features/cronograma/components/CurvaSChart.tsx`; helper presentacional de escala SVG bajo `src/features/cronograma/components/` o `src/lib/` solo si está libre de dominio; pruebas del componente/página; captura E2E/manual.

## 10. TDD focal

**RED:** `role=img` y nombre; un punto SVG por `puntos[]` en orden; detalle usa strings del payload; tabla alternativa conserva parcial/acumulado y monto; serie vacía; ausencia de «avance real»/SPI; navegación por teclado. **GREEN:** SVG mínimo. **TRIANGULATE:** 1, 2 y 120 puntos, 0.0000/100.0000 y montos grandes. **REFACTOR:** separar escala visual de formato sin crear cálculo de negocio.

## 11. Implementación ordenada

1. Congelar semántica y tabla alternativa con pruebas.
2. Implementar escala y path desde la serie recibida.
3. Añadir ejes/etiquetas responsive.
4. Añadir puntos, foco/hover y detalle redundante accesible.
5. Integrar en el tab y validar temas/viewport.
6. Ejecutar guardas ADR9 y axe.

## 12. Aceptación verificable

La gráfica es visible y responsive; llega a los puntos entregados sin derivar otra serie; período/porcentaje/monto pueden consultarse con mouse y teclado; la tabla conserva el payload; no existe lenguaje de ejecución real; no se instala dependencia.

## 13. Verificación

`pnpm exec vitest run src/test/features/cronograma/components/CurvaSChart.test.tsx src/test/features/cronograma/pages/CronogramaPage.test.tsx`; `pnpm run typecheck`; `pnpm run lint`; `pnpm run guard:adr9`; Playwright/axe en desktop y viewport estrecho; `git diff --check`.

## 14. STOP y rollback

STOP si se solicita comparar con avance real sin contrato, si la geometría termina recalculando importes/avances o si el SVG no ofrece alternativa accesible. Rollback al componente tabular previo sin tocar DTO/hook.

## 15. Riesgos y controles

Tooltips solo con hover excluyen teclado: foco y tabla redundante. Muchos labels saturan el eje: reducir etiquetas visuales sin omitir puntos ni datos accesibles. Doble eje induce lectura engañosa: porcentaje como único eje y monto en detalle.

## 16. Handoff

Entregar al Plan 089 evidencia de correspondencia punto→payload, teclado/axe, capturas responsive y confirmación de que no existe serie real ficticia.

## 17. Invariantes

Serie del servidor; porcentaje acumulado programado; períodos ordinales; geometría no es dominio; Decimal preservado; tabla alternativa; sin dependencia nueva.
