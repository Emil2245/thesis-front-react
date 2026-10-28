/**
 * «N actividad(es) con distribución incompleta». Con brecha de dinero, un contador 0 sería
 * engañoso (un back anterior lo calculaba solo con mapas vacíos), así que no se muestra.
 */
export function textoActividadesIncompletas(n: number | undefined): string | null {
  if (n === undefined || n < 1) return null;
  return `${n} ${n === 1 ? "actividad con distribución incompleta" : "actividades con distribución incompleta"}`;
}
