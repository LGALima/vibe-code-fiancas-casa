import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Informe o e-mail.")
  .pipe(z.email("E-mail inválido."));

const senhaNova = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

export const entrarSchema = z.object({
  email,
  senha: z.string().min(1, "Informe a senha."),
});
export type EntrarDados = z.infer<typeof entrarSchema>;

export const cadastroSchema = z
  .object({
    email,
    senha: senhaNova,
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, {
    message: "As senhas não conferem.",
    path: ["confirmacao"],
  });
export type CadastroDados = z.infer<typeof cadastroSchema>;

export const recuperarSenhaSchema = z.object({ email });
export type RecuperarSenhaDados = z.infer<typeof recuperarSenhaSchema>;

export const redefinirSenhaSchema = z
  .object({
    senha: senhaNova,
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, {
    message: "As senhas não conferem.",
    path: ["confirmacao"],
  });
export type RedefinirSenhaDados = z.infer<typeof redefinirSenhaSchema>;
