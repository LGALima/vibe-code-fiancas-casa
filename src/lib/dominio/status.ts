export type Status = "previsto" | "realizado" | "nao_planejado";
export type TipoLancamento = "gasto" | "ganho";

export const ROTULO_STATUS: Record<Status, string> = {
  previsto: "Previsto",
  realizado: "Realizado",
  nao_planejado: "Não planejado",
};

type Valores = { estimativa: number | null; valor_real: number | null };

/**
 * Status calculado (nunca digitado):
 * - Previsto: só estimativa;
 * - Realizado: estimativa e valor real;
 * - Não planejado: só valor real.
 */
export function calcularStatus({ estimativa, valor_real }: Valores): Status {
  if (valor_real === null) {
    if (estimativa === null) {
      throw new Error("Lançamento sem estimativa e sem valor real.");
    }
    return "previsto";
  }
  return estimativa === null ? "nao_planejado" : "realizado";
}

/** valor real − estimativa, só para Realizado; null nos outros casos. */
export function diferenca({ estimativa, valor_real }: Valores): number | null {
  if (estimativa === null || valor_real === null) return null;
  return Math.round((valor_real - estimativa) * 100) / 100;
}

/**
 * A diferença foi boa ou ruim? Gasto: gastar menos é bom.
 * Ganho: receber mais é bom.
 */
export function avaliarDiferenca(
  tipo: TipoLancamento,
  dif: number | null,
): "favoravel" | "desfavoravel" | "neutra" {
  if (dif === null || dif === 0) return "neutra";
  const bom = tipo === "gasto" ? dif < 0 : dif > 0;
  return bom ? "favoravel" : "desfavoravel";
}

/** Valor que entra no total "previsto" do ciclo: o real, se houver; senão a estimativa. */
export function valorPrevisto({ estimativa, valor_real }: Valores): number {
  return valor_real ?? estimativa ?? 0;
}
