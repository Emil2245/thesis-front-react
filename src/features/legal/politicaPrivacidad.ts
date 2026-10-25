export const POLITICA_VERSION = "2026-10";

export interface SeccionPolitica {
  titulo: string;
  /** Un párrafo por elemento. `{contacto}` se reemplaza por el correo configurado. */
  parrafos: string[];
}

export const POLITICA_SECCIONES: SeccionPolitica[] = [
  {
    titulo: "Responsable",
    parrafos: [
      "Los autores del proyecto académico (Proyecto Integrador, UCE FICA – Computación): Emil Verkade y Kevin Andrade.",
    ],
  },
  {
    titulo: "Datos que tratamos",
    parrafos: [
      "Nombre, correo electrónico, contraseña (almacenada únicamente como hash bcrypt) y registros de actividad dentro de la plataforma.",
    ],
  },
  {
    titulo: "Finalidad y base legal",
    parrafos: [
      "Operar la plataforma de propuestas técnico-económicas: autenticar usuarios, enviar correos de verificación y recuperación, y auditar el uso. La base legal es tu consentimiento (LOPDP, art. 7), que otorgas al marcar la casilla al registrarte.",
    ],
  },
  {
    titulo: "Conservación y encargados",
    parrafos: [
      "Conservamos los datos mientras tu cuenta exista. Los datos se alojan con un proveedor de infraestructura que actúa como encargado del tratamiento.",
    ],
  },
  {
    titulo: "Tus derechos",
    parrafos: [
      "Puedes ejercer los derechos de acceso, rectificación, actualización, eliminación, oposición y portabilidad (LOPDP, arts. 12 a 24) escribiendo a {contacto}.",
    ],
  },
  {
    titulo: "Versión",
    parrafos: [
      `Versión ${POLITICA_VERSION}. Este texto es informativo y no constituye asesoría legal.`,
    ],
  },
];
