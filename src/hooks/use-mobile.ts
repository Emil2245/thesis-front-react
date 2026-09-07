import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const CONSULTA = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function suscribir(alCambiar: () => void) {
  const mql = window.matchMedia(CONSULTA);
  mql.addEventListener("change", alCambiar);
  return () => mql.removeEventListener("change", alCambiar);
}

/**
 * `useSyncExternalStore` es la primitiva de React para leer un store externo:
 * da el valor bueno ya en el primer render y se da de baja sola. La versión
 * anterior escuchaba la media query pero leía `window.innerWidth`, dos fuentes
 * que discrepan en el propio umbral (`innerWidth` cuenta la barra de scroll y
 * la media query no), y arrancaba en `false` hasta que corría el efecto.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(suscribir, () => window.matchMedia(CONSULTA).matches);
}
