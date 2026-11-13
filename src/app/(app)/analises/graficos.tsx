"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { corDaForma, type Analise, type PontoEvolucao, type Visao } from "@/lib/analises";
import type { FormaOpcao } from "@/lib/dados";
import { formatarData, partes } from "@/lib/dominio/datas";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { cn } from "@/lib/utils";

// Ganhos e gastos têm sempre a mesma cor em todos os gráficos sem categoria.
// Verde e vermelho ficam só para o saldo.
const COR_GANHOS = "var(--viz-1)";
const COR_GASTOS = "var(--viz-2)";
const COR_NEUTRA = "#475569";

const moedaCurta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const eixoMoeda = (v: number) => moedaCurta.format(v);
const pct = (v: number) => `${Math.round(v * 100)}%`;

const EIXO = { fontSize: 11, fill: "var(--muted-foreground)" } as const;

type Props = {
  analise: Analise;
  evolucao: PontoEvolucao[];
  visao: Visao;
  pessoa: string | null;
  formas: FormaOpcao[];
};

export function Graficos({ analise, evolucao, visao, pessoa, formas }: Props) {
  const v = visao;
  const t = analise.totais;
  const rotuloVisao = v === "previsto" ? "previsto" : "realizado";

  const gastosCat = analise.por_categoria.filter((c) => c.tipo === "gasto");
  const ganhosCat = analise.por_categoria.filter((c) => c.tipo === "ganho");

  return (
    <div className="flex flex-col gap-4">
      <GastosPorCategoria
        dados={gastosCat}
        totalPrevisto={t.gastos_previsto}
        totalRealizado={t.gastos_realizado}
        visao={v}
        cicloId={analise.ciclo.id}
        pessoa={pessoa}
      />
      <GanhosPorCategoria
        dados={ganhosCat}
        total={v === "previsto" ? t.ganhos_previsto : t.ganhos_realizado}
        visao={v}
        rotuloVisao={rotuloVisao}
        cicloId={analise.ciclo.id}
        pessoa={pessoa}
      />
      <GastosPorDia analise={analise} visao={v} rotuloVisao={rotuloVisao} />
      <GanhosPorDia analise={analise} visao={v} rotuloVisao={rotuloVisao} />
      <PorForma
        titulo="Gastos por forma de pagamento"
        dados={analise.por_forma.filter((f) => f.tipo === "gasto")}
        total={v === "previsto" ? t.gastos_previsto : t.gastos_realizado}
        visao={v}
        rotuloVisao={rotuloVisao}
        formas={formas}
        vazio="Sem gastos neste ciclo."
      />
      <PorForma
        titulo="Ganhos por forma de pagamento"
        dados={analise.por_forma.filter((f) => f.tipo === "ganho")}
        total={v === "previsto" ? t.ganhos_previsto : t.ganhos_realizado}
        visao={v}
        rotuloVisao={rotuloVisao}
        formas={formas}
        vazio="Sem ganhos neste ciclo."
      />
      <Evolucao pontos={evolucao} visao={v} rotuloVisao={rotuloVisao} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Peças comuns
// ---------------------------------------------------------------------------

function Cartao({
  titulo,
  total,
  children,
  tabela,
}: {
  titulo: string;
  total?: ReactNode;
  children: ReactNode;
  tabela?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-3 text-card-foreground">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-medium">{titulo}</h2>
        {total && <div className="text-sm tabular-nums">{total}</div>}
      </header>
      {children}
      {tabela && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground select-none">
            Ver em tabela
          </summary>
          <div className="mt-2 overflow-x-auto">{tabela}</div>
        </details>
      )}
    </section>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function Total({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <span>
      <span className="text-xs text-muted-foreground">{rotulo} </span>
      <span className="font-semibold">{formatarBRL(valor)}</span>
    </span>
  );
}

type ItemTooltip = { name?: string | number; value?: unknown; color?: string; dataKey?: unknown };

/** Tooltip em português: título + uma linha por série, valor em R$. */
function TooltipBR({
  active,
  payload,
  label,
  titulo,
  rodape,
}: {
  active?: boolean;
  payload?: readonly ItemTooltip[];
  label?: unknown;
  titulo?: (label: unknown) => ReactNode;
  rodape?: ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{titulo ? titulo(label) : String(label)}</p>
      <ul className="flex flex-col gap-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
              {p.name}
            </span>
            <span className="font-medium tabular-nums">{formatarBRL(Number(p.value ?? 0))}</span>
          </li>
        ))}
      </ul>
      {rodape && <p className="mt-1 text-muted-foreground">{rodape}</p>}
    </div>
  );
}

function urlDaLista(cicloId: string, categoriaId: string, pessoa: string | null) {
  const p = new URLSearchParams({ ciclo: cicloId, categoria: categoriaId });
  if (pessoa) p.set("pessoa", pessoa);
  return `/?${p.toString()}`;
}

// ---------------------------------------------------------------------------
// Gastos por categoria: barras horizontais, previsto x realizado lado a lado
// ---------------------------------------------------------------------------

function GastosPorCategoria({
  dados,
  totalPrevisto,
  totalRealizado,
  visao,
  cicloId,
  pessoa,
}: {
  dados: Analise["por_categoria"];
  totalPrevisto: number;
  totalRealizado: number;
  visao: Visao;
  cicloId: string;
  pessoa: string | null;
}) {
  const router = useRouter();
  const linhas = useMemo(
    () => [...dados].sort((a, b) => b[visao] - a[visao] || a.nome.localeCompare(b.nome)),
    [dados, visao],
  );
  const abrir = (id: string) => router.push(urlDaLista(cicloId, id, pessoa));

  return (
    <Cartao
      titulo="Gastos por categoria"
      total={
        <span className="flex gap-3">
          <Total rotulo="Previsto" valor={totalPrevisto} />
          <Total rotulo="Realizado" valor={totalRealizado} />
        </span>
      }
      tabela={linhas.length > 0 && <TabelaCategorias linhas={linhas} cicloId={cicloId} pessoa={pessoa} duasColunas />}
    >
      {linhas.length === 0 ? (
        <Vazio>Sem gastos neste ciclo.</Vazio>
      ) : (
        <>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: COR_NEUTRA, opacity: 0.35 }} aria-hidden />
              Previsto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: COR_NEUTRA }} aria-hidden />
              Realizado
            </span>
            <span className="ml-auto">Toque numa barra para ver os lançamentos</span>
          </div>
          <div style={{ height: linhas.length * 46 + 28 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={linhas} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap={10}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tickFormatter={eixoMoeda} tick={EIXO} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" width={92} tick={{ ...EIXO, fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                  content={(p) => (
                    <TooltipBR {...p} titulo={(l) => String(l)} rodape="Toque para ver os lançamentos" />
                  )}
                />
                <Bar
                  dataKey="previsto"
                  name="Previsto"
                  barSize={10}
                  radius={[0, 4, 4, 0]}
                  className="cursor-pointer"
                  onClick={(d) => abrir((d.payload as Analise["por_categoria"][number]).categoria_id)}
                >
                  {linhas.map((c) => (
                    <Cell key={c.categoria_id} fill={c.cor ?? COR_NEUTRA} fillOpacity={0.35} />
                  ))}
                </Bar>
                <Bar
                  dataKey="realizado"
                  name="Realizado"
                  barSize={10}
                  radius={[0, 4, 4, 0]}
                  className="cursor-pointer"
                  onClick={(d) => abrir((d.payload as Analise["por_categoria"][number]).categoria_id)}
                >
                  {linhas.map((c) => (
                    <Cell key={c.categoria_id} fill={c.cor ?? COR_NEUTRA} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Cartao>
  );
}

function TabelaCategorias({
  linhas,
  cicloId,
  pessoa,
  duasColunas,
  visao,
}: {
  linhas: Analise["por_categoria"];
  cicloId: string;
  pessoa: string | null;
  duasColunas?: boolean;
  visao?: Visao;
}) {
  return (
    <table className="w-full text-xs tabular-nums">
      <thead className="text-muted-foreground">
        <tr className="text-left">
          <th className="py-1 font-normal">Categoria</th>
          {duasColunas ? (
            <>
              <th className="py-1 text-right font-normal">Previsto</th>
              <th className="py-1 text-right font-normal">Realizado</th>
            </>
          ) : (
            <th className="py-1 text-right font-normal">{visao === "realizado" ? "Realizado" : "Previsto"}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {linhas.map((c) => (
          <tr key={c.categoria_id} className="border-t">
            <td className="py-1">
              <Link href={urlDaLista(cicloId, c.categoria_id, pessoa)} className="underline-offset-2 hover:underline">
                {c.nome}
              </Link>
            </td>
            {duasColunas ? (
              <>
                <td className="py-1 text-right">{formatarBRL(c.previsto)}</td>
                <td className="py-1 text-right">{formatarBRL(c.realizado)}</td>
              </>
            ) : (
              <td className="py-1 text-right">{formatarBRL(c[visao ?? "previsto"])}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Ganhos por categoria: barras horizontais (visão escolhida)
// ---------------------------------------------------------------------------

function GanhosPorCategoria({
  dados,
  total,
  visao,
  rotuloVisao,
  cicloId,
  pessoa,
}: {
  dados: Analise["por_categoria"];
  total: number;
  visao: Visao;
  rotuloVisao: string;
  cicloId: string;
  pessoa: string | null;
}) {
  const router = useRouter();
  const linhas = useMemo(
    () => [...dados].filter((c) => c[visao] > 0).sort((a, b) => b[visao] - a[visao]),
    [dados, visao],
  );
  return (
    <Cartao
      titulo="Ganhos por categoria"
      total={<Total rotulo={rotuloVisao[0].toUpperCase() + rotuloVisao.slice(1)} valor={total} />}
      tabela={linhas.length > 0 && <TabelaCategorias linhas={linhas} cicloId={cicloId} pessoa={pessoa} visao={visao} />}
    >
      {linhas.length === 0 ? (
        <Vazio>Sem ganhos {rotuloVisao}s neste ciclo.</Vazio>
      ) : (
        <div style={{ height: linhas.length * 34 + 28 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={linhas} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={8}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tickFormatter={eixoMoeda} tick={EIXO} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={92} tick={{ ...EIXO, fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                content={(p) => <TooltipBR {...p} titulo={(l) => String(l)} rodape="Toque para ver os lançamentos" />}
              />
              <Bar
                dataKey={visao}
                name={rotuloVisao[0].toUpperCase() + rotuloVisao.slice(1)}
                barSize={12}
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(d) => router.push(urlDaLista(cicloId, (d.payload as Analise["por_categoria"][number]).categoria_id, pessoa))}
              >
                {linhas.map((c) => (
                  <Cell key={c.categoria_id} fill={c.cor ?? COR_NEUTRA} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Cartao>
  );
}

// ---------------------------------------------------------------------------
// Por dia
// ---------------------------------------------------------------------------

const diaCurto = (iso: unknown) => {
  const { dia, mes } = partes(String(iso));
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
};

function TabelaDias({ linhas, rotulo }: { linhas: { dia: string; valor: number }[]; rotulo: string }) {
  const comValor = linhas.filter((l) => l.valor !== 0);
  if (comValor.length === 0) return <p className="text-xs text-muted-foreground">Nenhum dia com valor.</p>;
  return (
    <table className="w-full text-xs tabular-nums">
      <thead className="text-muted-foreground">
        <tr className="text-left">
          <th className="py-1 font-normal">Dia</th>
          <th className="py-1 text-right font-normal">{rotulo}</th>
        </tr>
      </thead>
      <tbody>
        {comValor.map((l) => (
          <tr key={l.dia} className="border-t">
            <td className="py-1">{formatarData(l.dia)}</td>
            <td className="py-1 text-right">{formatarBRL(l.valor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GastosPorDia({ analise, visao, rotuloVisao }: { analise: Analise; visao: Visao; rotuloVisao: string }) {
  const chaveDia = visao === "previsto" ? "gastos_previsto" : "gastos_realizado";
  const chaveAcum = visao === "previsto" ? "gastos_previsto_acumulado" : "gastos_realizado_acumulado";
  const dados = analise.por_dia.map((d) => ({ dia: d.dia, valor: d[chaveDia], acumulado: d[chaveAcum] }));
  const totalPrevisto = analise.totais.gastos_previsto;
  const total = visao === "previsto" ? totalPrevisto : analise.totais.gastos_realizado;
  const maximo = Math.max(totalPrevisto, ...dados.map((d) => d.acumulado)) || 1;
  const Rotulo = rotuloVisao[0].toUpperCase() + rotuloVisao.slice(1);

  return (
    <Cartao
      titulo="Gastos por dia"
      total={<Total rotulo={Rotulo} valor={total} />}
      tabela={<TabelaDias linhas={dados} rotulo={Rotulo} />}
    >
      {total === 0 && totalPrevisto === 0 ? (
        <Vazio>Sem gastos neste ciclo.</Vazio>
      ) : (
        <>
          {/* Dois gráficos com o mesmo eixo de dias (nunca dois eixos Y no mesmo gráfico). */}
          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              Acumulado {rotuloVisao} x previsto do ciclo ({formatarBRL(totalPrevisto)})
            </p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="dia" tickFormatter={diaCurto} tick={EIXO} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tickFormatter={eixoMoeda} tick={EIXO} axisLine={false} tickLine={false} width={64} domain={[0, maximo * 1.08]} />
                  <ReferenceLine
                    y={totalPrevisto}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    label={{ value: "Previsto do ciclo", position: "insideTopLeft", fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                    content={(p) => <TooltipBR {...p} titulo={(l) => formatarData(String(l))} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="acumulado"
                    name={`Acumulado ${rotuloVisao}`}
                    stroke={COR_GASTOS}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Por dia</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="dia" tickFormatter={diaCurto} tick={EIXO} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tickFormatter={eixoMoeda} tick={EIXO} axisLine={false} tickLine={false} width={64} />
                  <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <TooltipBR {...p} titulo={(l) => formatarData(String(l))} />} />
                  <Bar dataKey="valor" name={`Gastos ${rotuloVisao}s`} fill={COR_GASTOS} radius={[4, 4, 0, 0]} maxBarSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </Cartao>
  );
}

function GanhosPorDia({ analise, visao, rotuloVisao }: { analise: Analise; visao: Visao; rotuloVisao: string }) {
  const chave = visao === "previsto" ? "ganhos_previsto" : "ganhos_realizado";
  const dados = analise.por_dia.map((d) => ({ dia: d.dia, valor: d[chave] }));
  const total = visao === "previsto" ? analise.totais.ganhos_previsto : analise.totais.ganhos_realizado;
  const Rotulo = rotuloVisao[0].toUpperCase() + rotuloVisao.slice(1);
  return (
    <Cartao titulo="Ganhos por dia" total={<Total rotulo={Rotulo} valor={total} />} tabela={<TabelaDias linhas={dados} rotulo={Rotulo} />}>
      {total === 0 ? (
        <Vazio>Sem ganhos {rotuloVisao}s neste ciclo.</Vazio>
      ) : (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="dia" tickFormatter={diaCurto} tick={EIXO} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tickFormatter={eixoMoeda} tick={EIXO} axisLine={false} tickLine={false} width={64} />
              <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <TooltipBR {...p} titulo={(l) => formatarData(String(l))} />} />
              <Bar dataKey="valor" name={`Ganhos ${rotuloVisao}s`} fill={COR_GANHOS} radius={[4, 4, 0, 0]} maxBarSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Cartao>
  );
}

// ---------------------------------------------------------------------------
// Por forma de pagamento: barra única empilhada em 100%
// ---------------------------------------------------------------------------

function PorForma({
  titulo,
  dados,
  total,
  visao,
  rotuloVisao,
  formas,
  vazio,
}: {
  titulo: string;
  dados: Analise["por_forma"];
  total: number;
  visao: Visao;
  rotuloVisao: string;
  formas: FormaOpcao[];
  vazio: string;
}) {
  const fatias = dados.filter((f) => f[visao] > 0).sort((a, b) => b[visao] - a[visao]);
  const Rotulo = rotuloVisao[0].toUpperCase() + rotuloVisao.slice(1);
  return (
    <Cartao titulo={titulo} total={<Total rotulo={Rotulo} valor={total} />}>
      {fatias.length === 0 || total <= 0 ? (
        <Vazio>{vazio}</Vazio>
      ) : (
        <>
          <div
            className="flex h-4 w-full gap-[2px] overflow-hidden rounded-[4px]"
            role="img"
            aria-label={`${titulo}: ${fatias.map((f) => `${f.nome} ${pct(f[visao] / total)}`).join(", ")}`}
          >
            {fatias.map((f) => (
              <div
                key={f.forma_id}
                title={`${f.nome}: ${formatarBRL(f[visao])} (${pct(f[visao] / total)})`}
                className="h-full"
                style={{ width: `${(f[visao] / total) * 100}%`, backgroundColor: corDaForma(f.forma_id, formas) }}
              />
            ))}
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {fatias.map((f) => (
              <li key={f.forma_id} className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: corDaForma(f.forma_id, formas) }} aria-hidden />
                <span className="flex flex-1 items-center gap-1.5">
                  {f.nome}
                  {f.eh_credito && (
                    <span className="flex items-center gap-1 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                      <CreditCard className="size-3" aria-hidden />
                      crédito
                    </span>
                  )}
                </span>
                <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{pct(f[visao] / total)}</span>
                <span className="w-24 text-right tabular-nums">{formatarBRL(f[visao])}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Cartao>
  );
}

// ---------------------------------------------------------------------------
// Evolução entre ciclos
// ---------------------------------------------------------------------------

const nomeCurto = (nome: string) => {
  const [mes, ano] = nome.split("/");
  return ano ? `${mes.slice(0, 3)}/${ano.slice(-2)}` : nome.slice(0, 8);
};

function PontoSaldo(props: { cx?: number; cy?: number; payload?: { saldo: number } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={payload.saldo >= 0 ? "var(--viz-positivo)" : "var(--viz-negativo)"}
      stroke="var(--card)"
      strokeWidth={2}
    />
  );
}

function Evolucao({ pontos, visao, rotuloVisao }: { pontos: PontoEvolucao[]; visao: Visao; rotuloVisao: string }) {
  const dados = pontos.map((p) => ({
    nome: p.nome,
    curto: nomeCurto(p.nome),
    ganhos: visao === "previsto" ? p.ganhos_previsto : p.ganhos_realizado,
    gastos: visao === "previsto" ? p.gastos_previsto : p.gastos_realizado,
    saldo: visao === "previsto" ? p.saldo_previsto : p.saldo_realizado,
  }));
  const series = [
    { chave: "ganhos", nome: "Ganhos", cor: COR_GANHOS },
    { chave: "gastos", nome: "Gastos", cor: COR_GASTOS },
    { chave: "saldo", nome: "Saldo", cor: "var(--foreground)" },
  ] as const;

  return (
    <Cartao
      titulo="Evolução entre ciclos"
      total={<span className="text-xs text-muted-foreground">Últimos {dados.length} · {rotuloVisao}</span>}
      tabela={
        dados.length > 0 && (
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="py-1 font-normal">Ciclo</th>
                <th className="py-1 text-right font-normal">Ganhos</th>
                <th className="py-1 text-right font-normal">Gastos</th>
                <th className="py-1 text-right font-normal">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((d) => (
                <tr key={d.nome} className="border-t">
                  <td className="py-1">{d.nome}</td>
                  <td className="py-1 text-right">{formatarBRL(d.ganhos)}</td>
                  <td className="py-1 text-right">{formatarBRL(d.gastos)}</td>
                  <td className={cn("py-1 text-right", d.saldo >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                    {formatarBRL(d.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    >
      {dados.length < 2 ? (
        <Vazio>A evolução aparece a partir de dois ciclos.</Vazio>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {series.map((s) => (
              <span key={s.chave} className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ backgroundColor: s.cor }} aria-hidden />
                {s.nome}
              </span>
            ))}
            <span className="flex items-center gap-1">
              (ponto
              <span className="size-2 rounded-full" style={{ backgroundColor: "var(--viz-positivo)" }} aria-hidden />
              positivo,
              <span className="size-2 rounded-full" style={{ backgroundColor: "var(--viz-negativo)" }} aria-hidden />
              negativo)
            </span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="curto" tick={EIXO} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tickFormatter={eixoMoeda} tick={EIXO} axisLine={false} tickLine={false} width={64} />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                <Tooltip
                  cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                  content={(p) => (
                    <TooltipBR
                      {...p}
                      titulo={() => (p.payload?.[0]?.payload as { nome?: string } | undefined)?.nome ?? ""}
                    />
                  )}
                />
                <Line type="monotone" dataKey="ganhos" name="Ganhos" stroke={COR_GANHOS} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="gastos" name="Gastos" stroke={COR_GASTOS} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="saldo" name="Saldo" stroke="var(--foreground)" strokeWidth={2} dot={<PontoSaldo />} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Cartao>
  );
}
