import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { sair } from "@/app/(app)/actions";
import { TelaAuth } from "@/components/tela-auth";
import { Button } from "@/components/ui/button";
import { destinoSeguro } from "@/lib/destino-seguro";
import { carregarMeusEspacos } from "@/lib/espaco";
import { nomeExibicaoSugerido } from "@/lib/espacos";
import { EscolherEspaco } from "./escolher-espaco";

export const metadata: Metadata = {
  title: "Escolha o espaço · Finanças da Casa",
};

/** Logo depois do login: a pessoa escolhe em qual espaço vai trabalhar. */
export default function EspacosPage({ searchParams }: PageProps<"/espacos">) {
  return (
    <TelaAuth>
      <Suspense fallback={<div className="h-64 w-full max-w-sm animate-pulse rounded-xl bg-muted" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
      <form action={sair} className="mt-6">
        <Button type="submit" variant="ghost" size="sm">
          <LogOut aria-hidden />
          Sair
        </Button>
      </form>
    </TelaAuth>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/espacos">, "searchParams">) {
  const { next } = await searchParams;
  const destino = destinoSeguro(typeof next === "string" ? next : null);
  const meus = await carregarMeusEspacos();
  if (!meus) redirect("/login");
  // Primeiro acesso: ainda não há espaço para escolher.
  if (meus.espacos.length === 0) redirect("/boas-vindas");

  return (
    <EscolherEspaco
      espacos={meus.espacos.map(({ id, nome }) => ({ id, nome }))}
      ultimoId={meus.ativoId}
      destino={destino}
      nomeExibicaoPadrao={nomeExibicaoSugerido(meus.espacos)}
    />
  );
}
