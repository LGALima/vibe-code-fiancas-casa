import {
  diasEntre,
  montar,
  partes,
  somarDias,
  somarMeses,
  type DataISO,
} from "./datas";

export type CicloDatas = {
  data_inicio: DataISO;
  data_fim: DataISO;
};

export type SugestaoCiclo = CicloDatas & { nome: string };

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Fim do ciclo: véspera do mesmo dia no mês seguinte (03/12 → 02/01). */
export function fimDoCiclo(inicio: DataISO): DataISO {
  return somarDias(somarMeses(inicio, 1), -1);
}

/**
 * Nome do ciclo pelo mês em que ele passa mais dias (o mês do meio do
 * período): 03/12/2026 a 02/01/2027 → "Dezembro/2026".
 */
export function nomeDoCiclo(inicio: DataISO, fim: DataISO): string {
  const meio = somarDias(inicio, Math.floor(diasEntre(inicio, fim) / 2));
  const { ano, mes } = partes(meio);
  return `${MESES[mes - 1]}/${ano}`;
}

/**
 * Ciclo "padrão" que contém a data, pelo dia de início configurado.
 * Dia 3: 10/12 → 03/12 a 02/01; 02/12 → 03/11 a 02/12.
 */
export function cicloPadraoDaData(data: DataISO, diaInicio: number): SugestaoCiclo {
  const { ano, mes, dia } = partes(data);
  const inicio = dia >= diaInicio ? montar(ano, mes, diaInicio) : montar(ano, mes - 1, diaInicio);
  const fim = fimDoCiclo(inicio);
  return { nome: nomeDoCiclo(inicio, fim), data_inicio: inicio, data_fim: fim };
}

export function contem(ciclo: CicloDatas, data: DataISO): boolean {
  return ciclo.data_inicio <= data && data <= ciclo.data_fim;
}

export function sobrepoe(a: CicloDatas, b: CicloDatas): boolean {
  return a.data_inicio <= b.data_fim && b.data_inicio <= a.data_fim;
}

/**
 * Ciclo ao qual uma data pertence. Se houver mais de um (datas sobrepostas),
 * vale o que começou por último. Devolve null se nenhum contém a data.
 */
export function cicloDaData<T extends CicloDatas>(ciclos: readonly T[], data: DataISO): T | null {
  let escolhido: T | null = null;
  for (const c of ciclos) {
    if (contem(c, data) && (!escolhido || c.data_inicio > escolhido.data_inicio)) {
      escolhido = c;
    }
  }
  return escolhido;
}

/**
 * Ciclo que a tela Início abre: o que contém hoje; senão o último que já
 * terminou; senão o primeiro que ainda vai começar.
 */
export function cicloInicial<T extends CicloDatas>(ciclos: readonly T[], hoje: DataISO): T | null {
  const atual = cicloDaData(ciclos, hoje);
  if (atual) return atual;
  const passados = ciclos.filter((c) => c.data_fim < hoje);
  if (passados.length > 0) {
    return passados.reduce((a, b) => (b.data_fim > a.data_fim ? b : a));
  }
  const futuros = ciclos.filter((c) => c.data_inicio > hoje);
  if (futuros.length > 0) {
    return futuros.reduce((a, b) => (b.data_inicio < a.data_inicio ? b : a));
  }
  return null;
}

/**
 * Sugestão para o formulário "Novo ciclo":
 * - se nenhum ciclo cobre hoje, o ciclo padrão de hoje;
 * - senão (ou se o padrão de hoje bater num ciclo existente), o ciclo que
 *   começa no dia seguinte ao fim do último ciclo.
 */
export function sugerirNovoCiclo(
  ciclos: readonly CicloDatas[],
  hoje: DataISO,
  diaInicio: number,
): SugestaoCiclo {
  const padrao = cicloPadraoDaData(hoje, diaInicio);
  if (!ciclos.some((c) => sobrepoe(c, padrao))) return padrao;

  const ultimoFim = ciclos.reduce((max, c) => (c.data_fim > max ? c.data_fim : max), ciclos[0].data_fim);
  const inicio = somarDias(ultimoFim, 1);
  const fim = fimDoCiclo(inicio);
  return { nome: nomeDoCiclo(inicio, fim), data_inicio: inicio, data_fim: fim };
}
