import { z } from "zod";
import { CORES, NOMES_ICONES } from "@/lib/cadastros";

const nome = (o_que: string) =>
  z
    .string()
    .trim()
    .min(1, `Informe o nome da ${o_que}.`)
    .max(40, "Use no máximo 40 caracteres.");

export const categoriaSchema = z.object({
  nome: nome("categoria"),
  tipo: z.enum(["gasto", "ganho", "ambos"], {
    error: "Escolha se é gasto, ganho ou ambos.",
  }),
  cor: z.enum(CORES, { error: "Escolha uma cor." }),
  icone: z.enum(NOMES_ICONES, { error: "Escolha um ícone." }),
});
export type CategoriaDados = z.infer<typeof categoriaSchema>;

export const formaPagamentoSchema = z.object({
  nome: nome("forma de pagamento"),
  ehCredito: z.boolean(),
});
export type FormaPagamentoDados = z.infer<typeof formaPagamentoSchema>;

export const configuracoesSchema = z.object({
  diaInicioCiclo: z.coerce
    .number({ error: "Informe um dia." })
    .int("Use um dia inteiro.")
    .min(1, "O dia vai de 1 a 28.")
    .max(28, "O dia vai de 1 a 28."),
});
export type ConfiguracoesEntrada = z.input<typeof configuracoesSchema>;
export type ConfiguracoesDados = z.output<typeof configuracoesSchema>;
