import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { BotaoAjuda } from "@/components/ajuda";
import { BotaoSair } from "@/components/botao-sair";
import { BotaoTema } from "@/components/botao-tema";
import { BarraInferior, LinksLaterais } from "@/components/navegacao";
import { SeletorEspaco } from "@/components/seletor-espaco";
import { carregarMeusEspacos, obterEspacoAtivo } from "@/lib/espaco";
import { nomeExibicaoSugerido } from "@/lib/espacos";
import { cn } from "@/lib/utils";

/**
 * O espaço em uso fica sempre à vista: no cabeçalho (celular) e na barra
 * lateral (computador).
 * Celular (< 768px): cabeçalho em cima, conteúdo em uma coluna e barra embaixo.
 * Computador (>= 768px): barra lateral fixa à esquerda e conteúdo mais largo.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Computador */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-background px-4 py-6 md:flex">
        <Marca />
        <Suspense fallback={<EspacoCarregando variante="lateral" />}>
          <EspacoAtual variante="lateral" />
        </Suspense>
        <LinksLaterais />
        <div className="mt-auto flex flex-col gap-1">
          <BotaoAjuda comRotulo className="h-9 w-full px-3" />
          <BotaoTema comRotulo className="h-9 w-full px-3" />
          <BotaoSair className="h-9 w-full justify-start px-3" />
        </div>
      </aside>

      {/* Celular */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-2 px-4">
          <Suspense fallback={<EspacoCarregando variante="cabecalho" />}>
            <EspacoAtual variante="cabecalho" />
          </Suspense>
          <div className="flex shrink-0 items-center gap-1">
            <BotaoAjuda />
            <BotaoTema />
            <BotaoSair />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md min-w-0 flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:max-w-6xl md:px-8 md:pt-8 md:pb-10">
        <Suspense fallback={<Carregando />}>
          <ExigirEspaco>{children}</ExigirEspaco>
        </Suspense>
      </main>

      <BarraInferior />
    </div>
  );
}

function Marca() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Wallet className="size-4" aria-hidden />
      </span>
      Finanças da Casa
    </span>
  );
}

/** O espaço em uso, destacado, com a troca de espaço ao tocar. */
async function EspacoAtual({ variante }: { variante: "lateral" | "cabecalho" }) {
  const meus = await carregarMeusEspacos();
  if (!meus?.ativoId) return null;
  return (
    <SeletorEspaco
      variante={variante}
      espacos={meus.espacos.map(({ id, nome }) => ({ id, nome }))}
      ativoId={meus.ativoId}
      nomeExibicaoPadrao={nomeExibicaoSugerido(meus.espacos)}
    />
  );
}

function EspacoCarregando({ variante }: { variante: "lateral" | "cabecalho" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-xl bg-muted",
        variante === "lateral" ? "h-14 w-full" : "h-9 w-36",
      )}
    />
  );
}

/** Sem espaço ainda (primeiro login): vai escolher entre criar ou entrar. */
async function ExigirEspaco({ children }: { children: ReactNode }) {
  const espaco = await obterEspacoAtivo();
  if (!espaco) redirect("/boas-vindas");
  return children;
}

function Carregando() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando">
      <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
