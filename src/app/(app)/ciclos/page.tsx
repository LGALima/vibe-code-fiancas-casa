import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { carregarCadastros, carregarCiclos } from "@/lib/dados";
import { cicloDaData, sugerirNovoCiclo } from "@/lib/dominio/ciclos";
import { formatarData, hoje } from "@/lib/dominio/datas";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { RESUMO_ZERADO, resumoDaLinha, type Resumo } from "@/lib/dominio/resumo";
import { obterEspacoAtivo } from "@/lib/espaco";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { EditarCiclo, NovoCiclo, type CicloExistente } from "./formulario-ciclo";
import { ProximoCiclo } from "./proximo-ciclo";

export const metadata: Metadata = { title: "Ciclos · Finanças da Casa" };

export default function CiclosPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <Conteudo />
      </Suspense>
    </section>
  );
}

/** Totais e quantidade de lançamentos de cada ciclo (view resumo_ciclo). */
async function carregarResumos(espacoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumo_ciclo")
    .select(
      "ciclo_id, ganhos_previsto, ganhos_realizado, gastos_previsto, gastos_realizado, saldo_previsto, saldo_realizado, qtd_lancamentos",
    )
    .eq("espaco_id", espacoId);
  if (error) throw new Error(`Não foi possível carregar os totais: ${error.message}`);
  return new Map(
    data.map((r) => [r.ciclo_id, { resumo: resumoDaLinha(r), qtd: r.qtd_lancamentos ?? 0 }]),
  );
}

const corDoSaldo = (v: number) =>
  v > 0 ? "text-emerald-600 dark:text-emerald-400" : v < 0 ? "text-red-600 dark:text-red-400" : "";

async function Conteudo() {
  const espaco = await obterEspacoAtivo();
  if (!espaco) return null;
  const [ciclos, { diaInicioCiclo }, resumos] = await Promise.all([
    carregarCiclos(espaco.id),
    carregarCadastros(espaco.id),
    carregarResumos(espaco.id),
  ]);
  const dataHoje = hoje();
  const atual = cicloDaData(ciclos, dataHoje);
  const sugestao = sugerirNovoCiclo(ciclos, dataHoje, diaInicioCiclo);
  const existentes: (CicloExistente & { resumo: Resumo })[] = ciclos.map((c) => ({
    ...c,
    qtdLancamentos: resumos.get(c.id)?.qtd ?? 0,
    resumo: resumos.get(c.id)?.resumo ?? RESUMO_ZERADO,
  }));
  // Ciclos chegam do mais recente para o mais antigo: o próximo sai do primeiro.
  const ultimo = existentes[0];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Ciclos</h1>
        <div className="flex gap-2">
          <NovoCiclo
            espacoId={espaco.id}
            sugestao={sugestao}
            existentes={existentes}
            secundario={Boolean(ultimo)}
          />
          {ultimo && <ProximoCiclo cicloBase={{ id: ultimo.id, nome: ultimo.nome }} />}
        </div>
      </div>

      {existentes.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhum ciclo ainda. Crie o primeiro: ele vai do dia {diaInicioCiclo} até a
          véspera do mesmo dia no mês seguinte.
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {existentes.map((c) => (
            <li key={c.id} className="flex items-center pr-1">
              <Link
                href={`/?ciclo=${c.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 outline-none hover:bg-muted/50 focus-visible:bg-muted"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    {c.nome}
                    {atual?.id === c.id && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-normal text-primary-foreground">
                        atual
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatarData(c.data_inicio)} a {formatarData(c.data_fim)} ·{" "}
                    {c.qtdLancamentos === 1 ? "1 lançamento" : `${c.qtdLancamentos} lançamentos`}
                  </span>
                  <span className="flex flex-wrap gap-x-3 text-xs tabular-nums">
                    <span>
                      <span className="text-muted-foreground">Ganhos </span>
                      {formatarBRL(c.resumo.ganhos_previsto)}
                    </span>
                    <span>
                      <span className="text-muted-foreground">Gastos </span>
                      {formatarBRL(c.resumo.gastos_previsto)}
                    </span>
                    <span>
                      <span className="text-muted-foreground">Saldo </span>
                      <span className={cn("font-medium", corDoSaldo(c.resumo.saldo_previsto))}>
                        {formatarBRL(c.resumo.saldo_previsto)}
                      </span>
                    </span>
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
              <EditarCiclo espacoId={espaco.id} ciclo={c} existentes={existentes} />
            </li>
          ))}
        </ul>
      )}
      {existentes.length > 0 && (
        <p className="text-xs text-muted-foreground">Totais previstos (real, quando houver; senão a estimativa).</p>
      )}
    </>
  );
}
