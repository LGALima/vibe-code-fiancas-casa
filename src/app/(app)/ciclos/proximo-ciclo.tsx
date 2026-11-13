"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatarData } from "@/lib/dominio/datas";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Item = {
  origem_id: string;
  situacao: "recorrente" | "parcela" | "parcela_encerrada";
  tipo: "gasto" | "ganho";
  descricao: string;
  estimativa: number;
  data: string;
  parcela_atual: number | null;
  total_parcelas: number | null;
};

type Previa = {
  nome: string;
  data_inicio: string;
  data_fim: string;
  conflito: string | null;
  recorrentes: number;
  parcelas: number;
  parcelas_encerradas: number;
  itens: Item[];
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** "12 recorrentes, 3 parcelas, 1 parcela encerrada" */
export function resumoDaPrevia(p: Pick<Previa, "recorrentes" | "parcelas" | "parcelas_encerradas">) {
  return [
    plural(p.recorrentes, "recorrente", "recorrentes"),
    plural(p.parcelas, "parcela", "parcelas"),
    plural(p.parcelas_encerradas, "parcela encerrada", "parcelas encerradas"),
  ].join(", ");
}

export function ProximoCiclo({ cicloBase }: { cicloBase: { id: string; nome: string } }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <Button onClick={() => setAberto(true)}>
        <CalendarPlus aria-hidden />
        Criar próximo ciclo
      </Button>
      {aberto && <Conteudo cicloBase={cicloBase} onConcluir={() => setAberto(false)} />}
    </Dialog>
  );
}

function Conteudo({
  cicloBase,
  onConcluir,
}: {
  cicloBase: { id: string; nome: string };
  onConcluir: () => void;
}) {
  const router = useRouter();
  const [usarUltimoReal, setUsarUltimoReal] = useState(false);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [erro, setErro] = useState<string>();
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    createClient()
      .rpc("previa_proximo_ciclo", { p_ciclo_id: cicloBase.id, p_usar_ultimo_real: usarUltimoReal })
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          setErro("Não foi possível montar a prévia. Tente de novo.");
          return;
        }
        setErro(undefined);
        setPrevia(data as unknown as Previa);
      });
    return () => {
      cancelado = true;
    };
  }, [cicloBase.id, usarUltimoReal]);

  async function criar() {
    setCriando(true);
    setErro(undefined);
    const { data, error } = await createClient().rpc("criar_proximo_ciclo", {
      p_ciclo_id: cicloBase.id,
      p_usar_ultimo_real: usarUltimoReal,
    });
    setCriando(false);
    if (error) {
      setErro(error.code === "P0001" ? error.message : "Não foi possível criar o ciclo. Tente de novo.");
      return;
    }
    onConcluir();
    router.push(`/?ciclo=${data}`);
    router.refresh();
  }

  const copiados = previa?.itens.filter((i) => i.situacao !== "parcela_encerrada") ?? [];
  const encerrados = previa?.itens.filter((i) => i.situacao === "parcela_encerrada") ?? [];

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Criar próximo ciclo</DialogTitle>
        <DialogDescription>
          A partir de {cicloBase.nome}. Os recorrentes entram como previstos, com a data
          um mês à frente.
        </DialogDescription>
      </DialogHeader>

      {!previa ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" aria-busy="true" aria-label="Montando a prévia" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-3">
            <p className="font-medium">{previa.nome}</p>
            <p className="text-sm text-muted-foreground">
              {formatarData(previa.data_inicio)} a {formatarData(previa.data_fim)}
            </p>
            <p className="mt-2 text-sm" aria-live="polite">
              {resumoDaPrevia(previa)}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="usar-ultimo-real" className="flex flex-col items-start gap-1">
              Usar o último valor real como estimativa
              <span className="text-xs font-normal text-muted-foreground">
                Senão, repete a estimativa anterior.
              </span>
            </Label>
            <Switch
              id="usar-ultimo-real"
              aria-label="Usar o último valor real como estimativa"
              checked={usarUltimoReal}
              onCheckedChange={(v) => setUsarUltimoReal(Boolean(v))}
            />
          </div>

          {previa.itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum lançamento recorrente: o ciclo será criado vazio.
            </p>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border text-sm">
              {[...copiados, ...encerrados].map((i) => {
                const encerrada = i.situacao === "parcela_encerrada";
                return (
                  <li
                    key={i.origem_id}
                    className={cn("flex items-center gap-2 px-3 py-2", encerrada && "text-muted-foreground")}
                  >
                    <Repeat className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("truncate", encerrada && "line-through")}>
                        {i.descricao}
                        {i.total_parcelas && (
                          <span className="ml-1.5 rounded bg-muted px-1 text-[11px] tabular-nums">
                            {i.parcela_atual}/{i.total_parcelas}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {encerrada ? "última parcela já paga — não entra" : formatarData(i.data)}
                      </span>
                    </span>
                    {!encerrada && (
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          i.tipo === "ganho" && "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {i.tipo === "ganho" ? "+" : ""}
                        {formatarBRL(Number(i.estimativa))}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {previa.conflito && (
            <p role="alert" className="text-sm text-destructive">
              {previa.conflito}
            </p>
          )}
        </div>
      )}

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}

      <DialogFooter className="sticky bottom-0 bg-popover">
        <Button
          className="h-10"
          onClick={criar}
          disabled={!previa || Boolean(previa.conflito) || criando}
        >
          {criando ? "Criando…" : previa ? `Criar ${previa.nome}` : "Criar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
