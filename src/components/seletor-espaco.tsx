"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { trocarEspaco } from "@/app/(app)/actions";
import { CriarOuEntrarEspaco } from "@/components/formularios-espaco";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type EspacoOpcao = { id: string; nome: string };

/** Quadradinho com a inicial do espaço (a "cara" dele no app). */
export function InicialEspaco({ nome, className }: { nome: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground uppercase",
        className,
      )}
    >
      {nome.trim().charAt(0) || "?"}
    </span>
  );
}

/**
 * Lista de espaços para escolher. `ativoId` aparece destacado como "Em uso".
 * Ao escolher, salva como espaço ativo e vai para `destino`.
 */
export function ListaEspacos({
  espacos,
  ativoId,
  destino,
  aoEscolherOAtivo,
  rotuloAtivo = "Em uso",
}: {
  espacos: EspacoOpcao[];
  ativoId: string | null;
  destino?: string;
  /** Escolher o que já está em uso: por padrão salva e navega do mesmo jeito. */
  aoEscolherOAtivo?: () => void;
  rotuloAtivo?: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [escolhido, setEscolhido] = useState<string>();
  const [erro, setErro] = useState<string>();

  function escolher(id: string) {
    if (id === ativoId && aoEscolherOAtivo) {
      aoEscolherOAtivo();
      return;
    }
    setErro(undefined);
    setEscolhido(id);
    iniciar(async () => {
      const r = await trocarEspaco(id, destino);
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {espacos.map((e) => {
          const ativo = e.id === ativoId;
          const carregando = pendente && escolhido === e.id;
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => escolher(e.id)}
                disabled={pendente}
                aria-current={ativo ? "true" : undefined}
                aria-busy={carregando || undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70",
                  ativo ? "border-primary bg-primary/5" : "hover:bg-muted",
                )}
              >
                <InicialEspaco nome={e.nome} />
                <span className="min-w-0 flex-1 truncate font-medium">{e.nome}</span>
                {carregando ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Abrindo…
                  </span>
                ) : ativo ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Check className="size-4" aria-hidden />
                    {rotuloAtivo}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}

/**
 * Mostra o espaço em uso (bem destacado) e, ao tocar, abre a troca de espaço,
 * com a opção de criar um novo ou entrar com código.
 */
export function SeletorEspaco({
  espacos,
  ativoId,
  nomeExibicaoPadrao,
  variante,
}: {
  espacos: EspacoOpcao[];
  ativoId: string;
  nomeExibicaoPadrao: string;
  variante: "lateral" | "cabecalho";
}) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"lista" | "novo">("lista");
  const atual = espacos.find((e) => e.id === ativoId);
  const nome = atual?.nome ?? "Espaço";

  function abrir(valor: boolean) {
    setAberto(valor);
    if (valor) setModo("lista");
  }

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
      <button
        type="button"
        onClick={() => abrir(true)}
        aria-label={`Espaço em uso: ${nome}. Trocar de espaço`}
        className={cn(
          "flex min-w-0 items-center gap-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          variante === "lateral"
            ? "w-full rounded-xl border border-primary/30 bg-primary/5 p-2.5 hover:bg-primary/10"
            : "-ml-1 rounded-lg px-1 py-1 hover:bg-muted",
        )}
      >
        <InicialEspaco nome={nome} className={variante === "cabecalho" ? "size-7" : undefined} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] leading-tight font-medium tracking-wide text-muted-foreground uppercase">
            Espaço
          </span>
          <span className="truncate text-sm leading-tight font-semibold">{nome}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {aberto && (
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          {modo === "lista" ? (
            <>
              <DialogHeader>
                <DialogTitle>Trocar de espaço</DialogTitle>
                <DialogDescription>
                  Cada espaço tem os próprios ciclos, lançamentos e cadastros.
                </DialogDescription>
              </DialogHeader>
              <ListaEspacos
                espacos={espacos}
                ativoId={ativoId}
                aoEscolherOAtivo={() => setAberto(false)}
              />
              <Button variant="outline" className="h-10" onClick={() => setModo("novo")}>
                <Plus aria-hidden />
                Criar ou entrar em outro espaço
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Novo espaço</DialogTitle>
                <DialogDescription>
                  Crie um espaço separado (outra casa, uma viagem, uma reforma) ou
                  entre no de outra pessoa com o código de convite.
                </DialogDescription>
              </DialogHeader>
              <CriarOuEntrarEspaco
                nomeEspacoPadrao=""
                nomeExibicaoPadrao={nomeExibicaoPadrao}
                onConcluir={() => setAberto(false)}
              />
              <Button variant="ghost" className="h-9 self-start" onClick={() => setModo("lista")}>
                <ArrowLeft aria-hidden />
                Voltar para a lista
              </Button>
            </>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
