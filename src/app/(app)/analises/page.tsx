import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IconeLink } from "@/components/icone-link";
import { Button } from "@/components/ui/button";
import type { Analise, PontoEvolucao, Visao } from "@/lib/analises";
import { carregarCadastros, carregarCiclos, carregarMembros } from "@/lib/dados";
import { cicloInicial } from "@/lib/dominio/ciclos";
import { hoje } from "@/lib/dominio/datas";
import { obterEspacoAtivo } from "@/lib/espaco";
import { createClient } from "@/lib/supabase/server";
import { FiltrosAnalise } from "./filtros";
import { Graficos } from "./graficos";

export const metadata: Metadata = { title: "Análises · Finanças da Casa" };

export default function AnalisesPage({ searchParams }: PageProps<"/analises">) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Análises</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Conteudo({ searchParams }: { searchParams: PageProps<"/analises">["searchParams"] }) {
  const espaco = await obterEspacoAtivo();
  if (!espaco) return null;
  const params = await searchParams;

  const [ciclos, cadastros, membros] = await Promise.all([
    carregarCiclos(espaco.id),
    carregarCadastros(espaco.id),
    carregarMembros(espaco.id),
  ]);

  const ciclo = ciclos.find((c) => c.id === primeiro(params.ciclo)) ?? cicloInicial(ciclos, hoje());
  if (!ciclo) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">Ainda não há ciclos para analisar.</p>
        <Button nativeButton={false} render={<Link href="/ciclos" />}>
          <IconeLink />
          Criar o primeiro ciclo
        </Button>
      </div>
    );
  }

  const visao: Visao = primeiro(params.visao) === "realizado" ? "realizado" : "previsto";
  const pedidoPessoa = primeiro(params.pessoa);
  const pessoa = membros.some((m) => m.userId === pedidoPessoa) ? pedidoPessoa! : null;

  const supabase = await createClient();
  const [analise, evolucao] = await Promise.all([
    supabase.rpc("analise_ciclo", { p_ciclo_id: ciclo.id, p_pessoa: pessoa ?? undefined }),
    supabase.rpc("evolucao_ciclos", { p_espaco_id: espaco.id, p_pessoa: pessoa ?? undefined }),
  ]);
  const erro = analise.error ?? evolucao.error;
  if (erro) throw new Error(`Não foi possível carregar as análises: ${erro.message}`);

  return (
    <>
      <FiltrosAnalise
        ciclos={ciclos.map((c) => ({ id: c.id, nome: c.nome }))}
        cicloId={ciclo.id}
        visao={visao}
        pessoa={pessoa}
        membros={membros}
        userId={espaco.userId}
      />
      <Graficos
        analise={analise.data as unknown as Analise}
        evolucao={(evolucao.data ?? []) as unknown as PontoEvolucao[]}
        visao={visao}
        pessoa={pessoa}
        formas={cadastros.formas}
      />
    </>
  );
}
