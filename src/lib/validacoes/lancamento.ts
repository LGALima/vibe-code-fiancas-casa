import { z } from "zod";
import { cicloDaData, type CicloDatas } from "@/lib/dominio/ciclos";
import { ehDataValida, formatarData } from "@/lib/dominio/datas";
import { lerValor } from "@/lib/dominio/dinheiro";

const MAX_PARCELAS = 120;

/**
 * Valida o formulário de lançamento. Os campos chegam como texto (do jeito
 * que a pessoa digitou) e saem prontos para o banco.
 */
export function lancamentoSchema<C extends CicloDatas & { id: string }>(ciclos: readonly C[]) {
  return z
    .object({
      tipo: z.enum(["gasto", "ganho"]),
      descricao: z.string().trim().max(80, "Use no máximo 80 caracteres."),
      estimativa: z.string(),
      valorReal: z.string(),
      categoriaId: z.string().min(1, "Escolha uma categoria."),
      formaId: z.string().min(1, "Escolha a forma de pagamento."),
      data: z.string().min(1, "Informe a data.").refine(ehDataValida, "Data inválida."),
      recorrente: z.boolean(),
      parcelado: z.boolean(),
      totalParcelas: z.string(),
      parcelaAtual: z.string(),
      observacao: z.string().trim().max(200, "Use no máximo 200 caracteres."),
    })
    .superRefine((v, ctx) => {
      const estimativa = lerValor(v.estimativa);
      const real = lerValor(v.valorReal);
      if (v.estimativa.trim() && estimativa === null) {
        ctx.addIssue({ code: "custom", path: ["estimativa"], message: "Valor inválido. Ex.: 120,50" });
      }
      if (v.valorReal.trim() && real === null) {
        ctx.addIssue({ code: "custom", path: ["valorReal"], message: "Valor inválido. Ex.: 120,50" });
      }
      if (!v.estimativa.trim() && !v.valorReal.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["valorReal"],
          message: "Informe o valor real. Ele é obrigatório quando não há estimativa.",
        });
      }

      if (v.parcelado) {
        const total = Number(v.totalParcelas);
        const atual = Number(v.parcelaAtual);
        const totalOk = Number.isInteger(total) && total >= 2 && total <= MAX_PARCELAS;
        if (!totalOk) {
          ctx.addIssue({
            code: "custom",
            path: ["totalParcelas"],
            message: `O total de parcelas vai de 2 a ${MAX_PARCELAS}.`,
          });
        }
        if (!Number.isInteger(atual) || atual < 1 || (totalOk && atual > total)) {
          ctx.addIssue({
            code: "custom",
            path: ["parcelaAtual"],
            message: "A parcela atual vai de 1 até o total de parcelas.",
          });
        }
      }

      if (ehDataValida(v.data) && !cicloDaData(ciclos, v.data)) {
        ctx.addIssue({
          code: "custom",
          path: ["data"],
          message: `Não há ciclo para ${formatarData(v.data)}. Crie o ciclo na tela Ciclos.`,
        });
      }
    })
    .transform((v) => {
      const ciclo = cicloDaData(ciclos, v.data)!;
      return {
        ...v,
        cicloId: ciclo.id,
        estimativa: lerValor(v.estimativa),
        valorReal: lerValor(v.valorReal),
        // Parcelado implica recorrente: a próxima parcela vai para o próximo ciclo.
        recorrente: v.parcelado || v.recorrente,
        totalParcelas: v.parcelado ? Number(v.totalParcelas) : null,
        parcelaAtual: v.parcelado ? Number(v.parcelaAtual) : null,
        observacao: v.observacao || null,
      };
    });
}

export type LancamentoEntrada = z.input<ReturnType<typeof lancamentoSchema>>;
export type LancamentoDados = z.output<ReturnType<typeof lancamentoSchema>>;
