import { onTestFinished } from "vitest";
import { server } from "./server";

/**
 * La suite miraba siempre la *respuesta* del mock, que por construcción está
 * bien, así que ninguno de los defectos de ruta, método o nombre de campo del
 * handoff podía salir en rojo (plan 057). Esto captura la *petición*.
 *
 * Se engancha al emisor de MSW en vez de redeclarar handlers con `server.use`,
 * para que el test siga usando el handler real —incluidas sus validaciones de
 * cuerpo— en lugar de uno permisivo escrito al vuelo.
 */
export type Peticion = {
  metodo: string;
  ruta: string;
  url: URL;
  cuerpo: unknown;
};

export function espiar(): Peticion[] {
  const peticiones: Peticion[] = [];
  const oyente = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    // El registro se apunta ya, para que el orden y el número de peticiones
    // sean deterministas; el cuerpo se rellena en cuanto se puede leer, así
    // que las aserciones sobre `cuerpo` van dentro de `waitFor`.
    const entrada: Peticion = {
      metodo: request.method,
      ruta: url.pathname,
      url,
      cuerpo: undefined,
    };
    peticiones.push(entrada);
    void request
      .clone()
      .json()
      .then(
        (c) => {
          entrada.cuerpo = c;
        },
        () => {},
      );
  };
  server.events.on("request:start", oyente);
  onTestFinished(() => server.events.removeListener("request:start", oyente));
  return peticiones;
}

/** La última petición que casa con el método y un trozo de ruta. */
export function ultima(peticiones: Peticion[], metodo: string, ruta: string | RegExp) {
  const casa = (p: Peticion) =>
    p.metodo === metodo && (typeof ruta === "string" ? p.ruta.endsWith(ruta) : ruta.test(p.ruta));
  return peticiones.filter(casa).at(-1);
}

/**
 * Cuerpo deliberadamente inválido, para los tests que comprueban que el seam
 * rechaza un campo de más o mal nombrado: por definición tienen que mandar algo
 * que el DTO no admite.
 *
 * Antes esto se escribía `as never`, que silencia al compilador sin decir por
 * qué: un `as never` intencionado y uno olvidado eran indistinguibles a la
 * vista y al `grep`. Los doce que había en la suite resultaron ser todos
 * intencionados, pero sólo se supo quitándolos uno a uno (plan 060).
 */
export const cuerpoInvalido = <T>(cuerpo: unknown): T => cuerpo as T;
