import type { Metadata } from "next";
import { Suspense } from "react";
import { Users } from "lucide-react";
import { BotaoCopiar } from "@/components/botao-copiar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { obterEspacoAtivo } from "@/lib/espaco";
import { createClient } from "@/lib/supabase/server";
import { Categorias, type Categoria } from "./categorias";
import { Configuracoes } from "./configuracoes";
import { FormasPagamento, type FormaPagamento } from "./formas-pagamento";

export const metadata: Metadata = { title: "Cadastros · Finanças da Casa" };

export default function CadastrosPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Cadastros</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <Conteudo />
      </Suspense>
    </section>
  );
}

const TIPOS = new Set(["gasto", "ganho", "ambos"]);

async function Conteudo() {
  const espaco = await obterEspacoAtivo();
  if (!espaco) return null;

  const supabase = await createClient();
  const [membros, categorias, formas, configuracoes] = await Promise.all([
    supabase
      .from("membros")
      .select("user_id, nome_exibicao, criado_em")
      .eq("espaco_id", espaco.id)
      .order("criado_em"),
    supabase
      .from("categorias")
      .select("id, nome, tipo, cor, icone, ativa, lancamentos(count)")
      .eq("espaco_id", espaco.id)
      .order("nome"),
    supabase
      .from("formas_pagamento")
      .select("id, nome, eh_credito, ativa, lancamentos(count)")
      .eq("espaco_id", espaco.id)
      .order("nome"),
    supabase
      .from("configuracoes")
      .select("dia_inicio_ciclo, moeda")
      .eq("espaco_id", espaco.id)
      .maybeSingle(),
  ]);

  const erro = membros.error ?? categorias.error ?? formas.error ?? configuracoes.error;
  if (erro) throw new Error(`Não foi possível carregar os cadastros: ${erro.message}`);

  const listaMembros = membros.data ?? [];
  const listaCategorias: Categoria[] = (categorias.data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: (TIPOS.has(c.tipo) ? c.tipo : "ambos") as Categoria["tipo"],
    cor: c.cor,
    icone: c.icone,
    ativa: c.ativa,
    emUso: (c.lancamentos[0]?.count ?? 0) > 0,
  }));
  const listaFormas: FormaPagamento[] = (formas.data ?? []).map((f) => ({
    id: f.id,
    nome: f.nome,
    ehCredito: f.eh_credito,
    ativa: f.ativa,
    emUso: (f.lancamentos[0]?.count ?? 0) > 0,
  }));

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{espaco.nome}</CardTitle>
          <CardDescription>
            Para convidar quem mora com você, mande este código. A pessoa cria a
            conta e escolhe &quot;Entrar com código&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <code
              className="flex h-10 flex-1 items-center justify-center rounded-lg border bg-muted font-mono text-lg font-semibold tracking-[0.3em]"
              aria-label={`Código de convite: ${espaco.codigoConvite.split("").join(" ")}`}
            >
              {espaco.codigoConvite}
            </code>
            <BotaoCopiar texto={espaco.codigoConvite} rotulo="Copiar código de convite" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4" aria-hidden />
              Membros
            </h2>
            <ul className="flex flex-col divide-y rounded-lg border">
              {listaMembros.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <span>{m.nome_exibicao ?? "Sem nome"}</span>
                  {m.user_id === espaco.userId && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      você
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Categorias espacoId={espaco.id} categorias={listaCategorias} />
      <FormasPagamento espacoId={espaco.id} formas={listaFormas} />
      <Configuracoes
        espacoId={espaco.id}
        diaInicioCiclo={configuracoes.data?.dia_inicio_ciclo ?? 3}
        moeda={configuracoes.data?.moeda ?? "BRL"}
      />
    </div>
  );
}
