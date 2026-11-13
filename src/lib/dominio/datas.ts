/**
 * Datas do domínio são sempre strings "AAAA-MM-DD" (como o tipo `date` do
 * Postgres). Assim não há fuso horário no meio do caminho.
 */
export type DataISO = string;

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function partes(data: DataISO) {
  const m = RE_DATA.exec(data);
  if (!m) throw new Error(`Data inválida: ${data}`);
  return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

export function ehDataValida(data: string): boolean {
  const m = RE_DATA.exec(data);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === data;
}

/** Monta a data; mês de 1 a 12. Mês/dia fora do intervalo "transbordam" (13 → janeiro do ano seguinte). */
export function montar(ano: number, mes: number, dia: number): DataISO {
  return new Date(Date.UTC(ano, mes - 1, dia)).toISOString().slice(0, 10);
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function somarDias(data: DataISO, dias: number): DataISO {
  const { ano, mes, dia } = partes(data);
  return montar(ano, mes, dia + dias);
}

/** Soma meses mantendo o dia; se o mês não tem esse dia, usa o último (31/01 + 1 mês = 28/02). */
export function somarMeses(data: DataISO, meses: number): DataISO {
  const { ano, mes, dia } = partes(data);
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const a = alvo.getUTCFullYear();
  const m = alvo.getUTCMonth() + 1;
  return montar(a, m, Math.min(dia, diasNoMes(a, m)));
}

/** Diferença em dias (b - a). */
export function diasEntre(a: DataISO, b: DataISO): number {
  const pa = partes(a);
  const pb = partes(b);
  return Math.round(
    (Date.UTC(pb.ano, pb.mes - 1, pb.dia) - Date.UTC(pa.ano, pa.mes - 1, pa.dia)) / 86_400_000,
  );
}

/** Hoje no fuso de Brasília (o servidor pode estar em UTC). */
export function hoje(timeZone = "America/Sao_Paulo", agora = new Date()): DataISO {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** "12/12/2026" */
export function formatarData(data: DataISO): string {
  const { ano, mes, dia } = partes(data);
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

const DIAS_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** "sexta-feira, 12/12" — usado como título dos grupos da lista. */
export function formatarDiaDaLista(data: DataISO): string {
  const { ano, mes, dia } = partes(data);
  const semana = DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${semana}, ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}
