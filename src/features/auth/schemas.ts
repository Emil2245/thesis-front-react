import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[a-zA-Z]/, "La contraseña debe incluir al menos una letra")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número");

const confirmacion = <T extends { password: string; passwordConfirmacion: string }>(
  s: z.ZodType<T>,
) =>
  s.refine((d) => d.password === d.passwordConfirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmacion"],
  });

export const registroSchema = confirmacion(
  z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().email("Correo electrónico inválido"),
    password: passwordSchema,
    passwordConfirmacion: z.string(),
  }),
);

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
  recordarSesion: z.boolean().default(false),
});

export const restablecerSchema = confirmacion(
  z.object({ password: passwordSchema, passwordConfirmacion: z.string() }),
);

export const perfilSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
});

export const cambiarPasswordSchema = z
  .object({
    passwordActual: z.string().min(1, "Ingresa tu contraseña actual"),
    passwordNueva: passwordSchema,
    passwordConfirmacion: z.string(),
  })
  .refine((d) => d.passwordNueva === d.passwordConfirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmacion"],
  });
