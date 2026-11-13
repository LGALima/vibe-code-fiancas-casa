import type { CicloDatas } from "./ciclos";
import { diasEntre, type DataISO } from "./datas";

export type Resumo = {
  ganhos_previsto: number;
  ganhos_realizado: number;
  gastos_previsto: number;
  gastos_realizado: number;
  saldo_previsto: number;
  saldo_realizado: number;
};

export const RESUMO_ZERADO: Resumo = {
  ganhos_previsto: 0,
  ganhos_realizado: 0,
  gastos_previsto: 0,
  gastos_realizado: 0,
  saldo_previsto: 0,
  saldo_realizado: 0,
};

/**
 * Dias que faltam no ciclo, contando hoje.
 * Ciclo que ainda não começou: todos os dias dele. Ciclo encerrado: 0.
 */
export function diasRestantes(ciclo: CicloDatas, hoje: DataISO): number {
  if (hoje > ciclo.data_fim) return 0;
  const desde = hoje < ciclo.data_inicio ? ciclo.data_inicio : hoje;
  return diasEntre(desde, ciclo.data_fim) + 1;
}

/**
 * "Pode gastar por dia até o fim do ciclo" = saldo previsto ÷ dias restantes.
 * Arredonda para baixo no centavo (melhor sobrar do que faltar).
 * null quando o ciclo já acabou.
 */
export function podeGastarPorDia(saldoPrevisto: number, dias: number): number | null {
  if (dias <= 0) return null;
  const centavos = Math.round(saldoPrevisto * 100);
  return Math.floor(centavos / dias) / 100;
}

/**
 * Quanto do previsto (de gastos ou de ganhos) já foi realizado (0,5 = metade).
 * Pode passar de 1 quando o realizado estoura o previsto.
 */
export function progressoDoPrevisto(realizado: number, previsto: number): number {
  if (previsto <= 0) return realizado > 0 ? 1 : 0;
  return realizado / previsto;
}

/** Converte a linha da view (colunas anuláveis) em números. */
export function resumoDaLinha(linha: Partial<Record<keyof Resumo, number | null>> | null): Resumo {
  if (!linha) return RESUMO_ZERADO;
  return {
    ganhos_previsto: Number(linha.ganhos_previsto ?? 0),
    ganhos_realizado: Number(linha.ganhos_realizado ?? 0),
    gastos_previsto: Number(linha.gastos_previsto ?? 0),
    gastos_realizado: Number(linha.gastos_realizado ?? 0),
    saldo_previsto: Number(linha.saldo_previsto ?? 0),
    saldo_realizado: Number(linha.saldo_realizado ?? 0),
  };
}
