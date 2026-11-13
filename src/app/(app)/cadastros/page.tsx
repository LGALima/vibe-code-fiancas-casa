import type { Metadata } from "next";
import { Suspense } from "react";
import { CreditCard, Users } from "lucide-react";
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

async function Conteudo() {
  const espaco = await obterEspacoAtivo();
  if (!espaco) return null;

  const supabase = await createClient();
  const [membros, categorias, formas] = await Promise.all([
    supabase
      .from("membros")
      .select("user_id, nome_exibicao, criado_em")
      .eq("espaco_id", espaco.id)
      .order("criado_em"),
    supabase
      .from("categorias")
      .select("id, nome, tipo, cor")
      .eq("espaco_id", espaco.id)
      .eq("ativa", true)
      .order("nome"),
    supabase
      .from("formas_pagamento")
      .select("id, nome, eh_credito")
      .eq("espaco_id", espaco.id)
      .eq("ativa", true)
      .order("nome"),
  ]);

  const erro = membros.error ?? categorias.error ?? formas.error;
  if (erro) throw new Error(`Não foi possível carregar os cadastros: ${erro.message}`);
  const listaMembros = membros.data ?? [];
  const listaCategorias = categorias.data ?? [];
  const listaFormas = formas.data ?? [];

  return (
    <>
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

      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {listaCategorias.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: c.cor ?? "var(--muted-foreground)" }}
                  aria-hidden
                />
                {c.nome}
                <span className="text-xs text-muted-foreground">
                  {c.tipo === "ganho" ? "ganho" : c.tipo === "gasto" ? "gasto" : "ambos"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formas de pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {listaFormas.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
              >
                {f.eh_credito && <CreditCard className="size-3.5" aria-hidden />}
                {f.nome}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
