import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { carregarCadastros, carregarCiclos } from "@/lib/dados";
import { cicloDaData, sugerirNovoCiclo } from "@/lib/dominio/ciclos";
import { formatarData, hoje } from "@/lib/dominio/datas";
import { obterEspacoAtivo } from "@/lib/espaco";
import { createClient } from "@/lib/supabase/server";
import { EditarCiclo, NovoCiclo, type CicloExistente } from "./formulario-ciclo";

export const metadata: Metadata = { title: "Ciclos · Finanças da Casa" };

export default function CiclosPage() {
  return (
    <section className="flex flex-col gap-4">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <Conteudo />
      </Suspense>
    </section>
  );
}

async function contarLancamentosPorCiclo(espacoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ciclos")
    .select("id, lancamentos(count)")
    .eq("espaco_id", espacoId);
  if (error) throw new Error(`Não foi possível contar os lançamentos: ${error.message}`);
  return new Map(data.map((c) => [c.id, c.lancamentos[0]?.count ?? 0]));
}

async function Conteudo() {
  const espaco = await obterEspacoAtivo();
  if (!espaco) return null;
  const [ciclos, { diaInicioCiclo }, contagem] = await Promise.all([
    carregarCiclos(espaco.id),
    carregarCadastros(espaco.id),
    contarLancamentosPorCiclo(espaco.id),
  ]);
  const dataHoje = hoje();
  const atual = cicloDaData(ciclos, dataHoje);
  const sugestao = sugerirNovoCiclo(ciclos, dataHoje, diaInicioCiclo);
  const existentes: CicloExistente[] = ciclos.map((c) => ({
    ...c,
    qtdLancamentos: contagem.get(c.id) ?? 0,
  }));

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Ciclos</h1>
        <NovoCiclo espacoId={espaco.id} sugestao={sugestao} existentes={existentes} />
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
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 font-medium">
                    {c.nome}
                    {atual?.id === c.id && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-normal text-primary-foreground">
                        atual
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatarData(c.data_inicio)} a {formatarData(c.data_fim)} ·{" "}
                    {c.qtdLancamentos === 1 ? "1 lançamento" : `${c.qtdLancamentos} lançamentos`}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
              <EditarCiclo espacoId={espaco.id} ciclo={c} existentes={existentes} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
