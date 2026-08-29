import type { InsumoUsoResponse } from "./contract";

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errores?: Array<{ campo: string; mensaje: string }>;
  [k: string]: unknown;
}

export interface InsumoEnUsoProblem extends Problem {
  usos: InsumoUsoResponse[];
}

export const PROBLEM_TYPES = [
  "validacion",
  "credenciales-invalidas",
  "email-no-verificado",
  "cuenta-desactivada",
  "token-invalido-o-expirado",
  "cooldown-activo",
  "codigo-duplicado",
  "insumo-en-uso",
  "apu-referenciado",
  "version-vigente-protegida",
  "reduccion-periodos-requiere-confirmacion",
  "export-bloqueado",
  "csv-invalido",
  "fila-protegida",
  "no-encontrado",
] as const;

export type ProblemType = (typeof PROBLEM_TYPES)[number];

export class ApiError extends Error {
  problem: Problem;
  status: number;

  constructor(problem: Problem, status: number) {
    super(problem.title);
    this.name = "ApiError";
    this.problem = problem;
    this.status = status;
  }
  get slug(): string {
    // El servidor puede responder un cuerpo sin `type` (o vacío): `request.ts`
    // no valida, así que el cast lo deja pasar. Sin guarda, esto revienta.
    return this.problem.type?.replace(/^\/problemas\//, "") ?? "";
  }
  is(t: ProblemType): boolean {
    return this.slug === t;
  }
  get camposConError(): Array<{ campo: string; mensaje: string }> {
    return this.problem.errores ?? [];
  }
}

export function problemDesconocido(status: number, detail?: string): Problem {
  return {
    type: "/problemas/no-encontrado",
    title: "Ocurrió un error inesperado",
    status,
    detail,
  };
}
