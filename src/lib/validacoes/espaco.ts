import { z } from "zod";

const nomeExibicao = z
  .string()
  .trim()
  .min(1, "Informe como você quer aparecer para o outro membro.")
  .max(40, "Use no máximo 40 caracteres.");

export const criarEspacoSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Dê um nome para o espaço.")
    .max(60, "Use no máximo 60 caracteres."),
  nomeExibicao,
});
export type CriarEspacoDados = z.infer<typeof criarEspacoSchema>;

export const entrarEspacoSchema = z.object({
  codigo: z
    .string()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .pipe(
      z
        .string()
        .min(1, "Informe o código de convite.")
        .regex(/^[A-Z0-9]{6,32}$/, "Código inválido. Confira com quem te convidou."),
    ),
  nomeExibicao,
});
export type EntrarEspacoEntrada = z.input<typeof entrarEspacoSchema>;
export type EntrarEspacoDados = z.output<typeof entrarEspacoSchema>;
