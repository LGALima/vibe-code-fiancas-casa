"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ChevronRight, CreditCard, Plus } from "lucide-react";
import { Campo } from "@/components/campo";
import { PainelConfirmarExclusao } from "@/components/confirmar-exclusao";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { createClient } from "@/lib/supabase/client";
import { traduzirErroBanco } from "@/lib/supabase/erros";
import {
  formaPagamentoSchema,
  type FormaPagamentoDados,
} from "@/lib/validacoes/cadastros";

export type FormaPagamento = {
  id: string;
  nome: string;
  ehCredito: boolean;
  ativa: boolean;
  emUso: boolean;
};

type Edicao = { modo: "nova" } | { modo: "editar"; forma: FormaPagamento };

export function FormasPagamento({
  espacoId,
  formas,
}: {
  espacoId: string;
  formas: FormaPagamento[];
}) {
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const ativas = formas.filter((f) => f.ativa);
  const inativas = formas.filter((f) => !f.ativa);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formas de pagamento</CardTitle>
        <CardAction>
          <Button size="sm" onClick={() => setEdicao({ modo: "nova" })}>
            <Plus aria-hidden />
            Nova
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Lista
          formas={ativas}
          vazia="Nenhuma forma de pagamento ativa."
          onEditar={(forma) => setEdicao({ modo: "editar", forma })}
        />
        {inativas.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground select-none">
              Desativadas ({inativas.length})
            </summary>
            <div className="mt-2">
              <Lista formas={inativas} onEditar={(forma) => setEdicao({ modo: "editar", forma })} />
            </div>
          </details>
        )}
      </CardContent>

      <Dialog open={edicao !== null} onOpenChange={(aberto) => !aberto && setEdicao(null)}>
        {edicao && (
          <Formulario
            key={edicao.modo === "editar" ? edicao.forma.id : "nova"}
            espacoId={espacoId}
            forma={edicao.modo === "editar" ? edicao.forma : undefined}
            onConcluir={() => setEdicao(null)}
          />
        )}
      </Dialog>
    </Card>
  );
}

function Lista({
  formas,
  vazia,
  onEditar,
}: {
  formas: FormaPagamento[];
  vazia?: string;
  onEditar: (f: FormaPagamento) => void;
}) {
  if (formas.length === 0) {
    return vazia ? <p className="text-sm text-muted-foreground">{vazia}</p> : null;
  }
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {formas.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            onClick={() => onEditar(f)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted"
          >
            <span className={f.ativa ? "flex-1" : "flex-1 text-muted-foreground line-through"}>
              {f.nome}
            </span>
            {f.ehCredito && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <CreditCard className="size-3" aria-hidden />
                crédito
              </span>
            )}
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Formulario({
  espacoId,
  forma,
  onConcluir,
}: {
  espacoId: string;
  forma?: FormaPagamento;
  onConcluir: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  // A transição só termina com a lista já atualizada: até lá o botão da ação
  // mostra que está trabalhando e o diálogo continua aberto.
  const [ocupado, iniciar] = useTransition();
  const [acao, setAcao] = useState<"salvar" | "alternar" | "excluir">("salvar");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormaPagamentoDados>({
    resolver: zodResolver(formaPagamentoSchema),
    defaultValues: forma
      ? { nome: forma.nome, ehCredito: forma.ehCredito }
      : { nome: "", ehCredito: false },
  });

  const duplicada = "Já existe uma forma de pagamento com esse nome neste espaço.";

  function concluir(
    qual: typeof acao,
    executar: () => PromiseLike<{ error: Parameters<typeof traduzirErroBanco>[0] | null }>,
  ) {
    setErro(undefined);
    setAcao(qual);
    iniciar(async () => {
      const { error } = await executar();
      if (error) {
        setErro(traduzirErroBanco(error, duplicada));
        return;
      }
      iniciar(() => {
        router.refresh();
        onConcluir();
      });
    });
  }

  function salvar({ nome, ehCredito }: FormaPagamentoDados) {
    const supabase = createClient();
    const dados = { nome, eh_credito: ehCredito };
    concluir("salvar", () =>
      forma
        ? supabase.from("formas_pagamento").update(dados).eq("id", forma.id)
        : supabase.from("formas_pagamento").insert({ ...dados, espaco_id: espacoId }),
    );
  }

  function alternarAtiva() {
    if (!forma) return;
    concluir("alternar", () =>
      createClient()
        .from("formas_pagamento")
        .update({ ativa: !forma.ativa })
        .eq("id", forma.id),
    );
  }

  // Primeiro troca o formulário pela pergunta; só exclui depois do "Excluir".
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  function excluir() {
    if (!forma) return;
    concluir("excluir", () => createClient().from("formas_pagamento").delete().eq("id", forma.id));
  }

  const travado = isSubmitting || ocupado;
  const emAndamento = (qual: typeof acao) => ocupado && acao === qual;
  const salvando = isSubmitting || emAndamento("salvar");

  if (forma && confirmandoExclusao) {
    return (
      <DialogContent>
        <PainelConfirmarExclusao
          titulo={`Excluir a forma de pagamento "${forma.nome}"?`}
          rotuloConfirmar="Excluir forma de pagamento"
          excluindo={emAndamento("excluir")}
          erro={erro}
          onConfirmar={excluir}
          onCancelar={() => {
            setErro(undefined);
            setConfirmandoExclusao(false);
          }}
        />
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{forma ? "Editar forma de pagamento" : "Nova forma de pagamento"}</DialogTitle>
        <DialogDescription>
          Marque &quot;É crédito&quot; para ver o peso do cartão nos gráficos.
        </DialogDescription>
      </DialogHeader>

      <form id="form-forma" onSubmit={handleSubmit(salvar)} noValidate className="flex flex-col gap-5">
        <Campo
          id="nome-forma"
          rotulo="Nome"
          autoComplete="off"
          erro={errors.nome?.message}
          {...register("nome")}
        />
        <Controller
          control={control}
          name="ehCredito"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-3">
              <Label htmlFor="eh-credito" className="flex flex-col items-start gap-1">
                É crédito
                <span className="text-xs font-normal text-muted-foreground">
                  Mostra o peso do cartão nos gráficos.
                </span>
              </Label>
              <Switch
                id="eh-credito"
                aria-label="É crédito"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(Boolean(v))}
              />
            </div>
          )}
        />
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
      </form>

      <DialogFooter className="gap-2">
        {forma && (
          <div className="flex flex-1 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={alternarAtiva}
              carregando={emAndamento("alternar")}
              disabled={travado}
            >
              {emAndamento("alternar")
                ? forma.ativa
                  ? "Desativando…"
                  : "Reativando…"
                : forma.ativa
                  ? "Desativar"
                  : "Reativar"}
            </Button>
            {!forma.emUso && (
              <Button
                type="button"
                variant="destructive"
                className="h-10"
                onClick={() => {
                  setErro(undefined);
                  setConfirmandoExclusao(true);
                }}
                disabled={travado}
              >
                Excluir
              </Button>
            )}
          </div>
        )}
        <Button type="submit" form="form-forma" className="h-10" carregando={salvando} disabled={travado}>
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
      {forma?.emUso && (
        <p className="text-xs text-muted-foreground">
          Esta forma de pagamento já tem lançamentos, por isso só pode ser desativada.
        </p>
      )}
    </DialogContent>
  );
}
