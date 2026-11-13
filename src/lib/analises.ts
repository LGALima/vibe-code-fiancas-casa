import type { TipoLancamento } from "@/lib/dominio/status";

/** Previsto = real, se houver; senão a estimativa. Realizado = só o real. */
export type Visao = "previsto" | "realizado";

export type Analise = {
  ciclo: { id: string; nome: string; data_inicio: string; data_fim: string };
  totais: {
    ganhos_previsto: number;
    ganhos_realizado: number;
    gastos_previsto: number;
    gastos_realizado: number;
    qtd_lancamentos: number;
  };
  por_categoria: {
    tipo: TipoLancamento;
    categoria_id: string;
    nome: string;
    cor: string | null;
    icone: string | null;
    previsto: number;
    realizado: number;
    qtd: number;
  }[];
  por_forma: {
    tipo: TipoLancamento;
    forma_id: string;
    nome: string;
    eh_credito: boolean;
    previsto: number;
    realizado: number;
    qtd: number;
  }[];
  por_dia: {
    dia: string;
    gastos_previsto: number;
    gastos_realizado: number;
    ganhos_previsto: number;
    ganhos_realizado: number;
    gastos_previsto_acumulado: number;
    gastos_realizado_acumulado: number;
  }[];
};

export type PontoEvolucao = {
  ciclo_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  ganhos_previsto: number;
  ganhos_realizado: number;
  gastos_previsto: number;
  gastos_realizado: number;
  saldo_previsto: number;
  saldo_realizado: number;
};

export const CORES_SERIES = [
  "var(--viz-1)",
  "var(--viz-2)",
  "var(--viz-3)",
  "var(--viz-4)",
  "var(--viz-5)",
  "var(--viz-6)",
  "var(--viz-7)",
  "var(--viz-8)",
] as const;

/**
 * Cor de cada forma de pagamento: posição fixa pela ordem do cadastro (nome),
 * para a mesma forma ter sempre a mesma cor, em qualquer ciclo ou filtro.
 */
export function corDaForma(formaId: string, todasAsFormas: readonly { id: string }[]): string {
  const i = todasAsFormas.findIndex((f) => f.id === formaId);
  return i < 0 ? "var(--muted-foreground)" : CORES_SERIES[i % CORES_SERIES.length];
}
