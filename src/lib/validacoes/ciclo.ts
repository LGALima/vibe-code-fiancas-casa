import { z } from "zod";
import { sobrepoe, type CicloDatas } from "@/lib/dominio/ciclos";
import { ehDataValida, formatarData } from "@/lib/dominio/datas";

const data = (rotulo: string) =>
  z
    .string()
    .min(1, `Informe a data de ${rotulo}.`)
    .refine(ehDataValida, `Data de ${rotulo} inválida.`);

/** Valida o ciclo novo contra os que já existem (não pode sobrepor). */
export function cicloSchema(existentes: readonly (CicloDatas & { nome: string })[]) {
  return z
    .object({
      nome: z
        .string()
        .trim()
        .min(1, "Dê um nome para o ciclo.")
        .max(40, "Use no máximo 40 caracteres."),
      data_inicio: data("início"),
      data_fim: data("fim"),
    })
    .refine((c) => c.data_fim >= c.data_inicio, {
      message: "O fim precisa ser no mesmo dia do início ou depois.",
      path: ["data_fim"],
    })
    .superRefine((c, ctx) => {
      if (c.data_fim < c.data_inicio) return;
      const conflito = existentes.find((e) => sobrepoe(e, c));
      if (conflito) {
        ctx.addIssue({
          code: "custom",
          path: ["data_inicio"],
          message: `As datas batem com o ciclo ${conflito.nome} (${formatarData(conflito.data_inicio)} a ${formatarData(conflito.data_fim)}).`,
        });
      }
    });
}

export type CicloDados = z.infer<ReturnType<typeof cicloSchema>>;
