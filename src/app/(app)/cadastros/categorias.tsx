"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Check, ChevronRight, Plus } from "lucide-react";
import { Campo } from "@/components/campo";
import { Escolha } from "@/components/escolha";
import { IconeCategoria } from "@/components/icone-categoria";
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
import {
  ICONES,
  NOMES_ICONES,
  PALETA,
  TIPOS_CATEGORIA,

  type NomeIcone,
} from "@/lib/cadastros";
import { createClient } from "@/lib/supabase/client";
import { traduzirErroBanco } from "@/lib/supabase/erros";
import {
  categoriaSchema,
  type CategoriaDados,
} from "@/lib/validacoes/cadastros";

export type Categoria = {
  id: string;
  nome: string;
  tipo: "gasto" | "ganho" | "ambos";
  cor: string | null;
  icone: string | null;
  ativa: boolean;
  emUso: boolean;
};

const ROTULO_TIPO = { gasto: "Gasto", ganho: "Ganho", ambos: "Ambos" } as const;

type Edicao = { modo: "nova" } | { modo: "editar"; categoria: Categoria };

export function Categorias({
  espacoId,
  categorias,
}: {
  espacoId: string;
  categorias: Categoria[];
}) {
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const ativas = categorias.filter((c) => c.ativa);
  const inativas = categorias.filter((c) => !c.ativa);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorias</CardTitle>
        <CardAction>
          <Button size="sm" onClick={() => setEdicao({ modo: "nova" })}>
            <Plus aria-hidden />
            Nova
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Lista
          categorias={ativas}
          vazia="Nenhuma categoria ativa."
          onEditar={(categoria) => setEdicao({ modo: "editar", categoria })}
        />
        {inativas.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground select-none">
              Desativadas ({inativas.length})
            </summary>
            <div className="mt-2">
              <Lista
                categorias={inativas}
                onEditar={(categoria) => setEdicao({ modo: "editar", categoria })}
              />
            </div>
          </details>
        )}
      </CardContent>

      <Dialog open={edicao !== null} onOpenChange={(aberto) => !aberto && setEdicao(null)}>
        {edicao && (
          <FormularioCategoria
            key={edicao.modo === "editar" ? edicao.categoria.id : "nova"}
            espacoId={espacoId}
            categoria={edicao.modo === "editar" ? edicao.categoria : undefined}
            onConcluir={() => setEdicao(null)}
          />
        )}
      </Dialog>
    </Card>
  );
}

function Lista({
  categorias,
  vazia,
  onEditar,
}: {
  categorias: Categoria[];
  vazia?: string;
  onEditar: (c: Categoria) => void;
}) {
  if (categorias.length === 0) {
    return vazia ? <p className="text-sm text-muted-foreground">{vazia}</p> : null;
  }
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {categorias.map((c) => {
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onEditar(c)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: c.cor ?? "var(--muted-foreground)" }}
              >
                <IconeCategoria nome={c.icone} className="size-4" />
              </span>
              <span className={c.ativa ? "flex-1" : "flex-1 text-muted-foreground line-through"}>
                {c.nome}
              </span>
              <span className="text-xs text-muted-foreground">{ROTULO_TIPO[c.tipo]}</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function FormularioCategoria({
  espacoId,
  categoria,
  onConcluir,
}: {
  espacoId: string;
  categoria?: Categoria;
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
  } = useForm<CategoriaDados>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: categoria
      ? {
          nome: categoria.nome,
          tipo: categoria.tipo,
          cor: categoria.cor ?? PALETA[0].valor,
          icone: (categoria.icone && categoria.icone in ICONES
            ? categoria.icone
            : "tag") as NomeIcone,
        }
      : { nome: "", tipo: "gasto", cor: PALETA[0].valor, icone: "tag" },
  });

  const duplicada = "Já existe uma categoria com esse nome neste espaço.";

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

  function salvar(dados: CategoriaDados) {
    const supabase = createClient();
    concluir("salvar", () =>
      categoria
        ? supabase.from("categorias").update(dados).eq("id", categoria.id)
        : supabase.from("categorias").insert({ ...dados, espaco_id: espacoId }),
    );
  }

  function alternarAtiva() {
    if (!categoria) return;
    concluir("alternar", () =>
      createClient()
        .from("categorias")
        .update({ ativa: !categoria.ativa })
        .eq("id", categoria.id),
    );
  }

  function excluir() {
    if (!categoria) return;
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"? Isso não pode ser desfeito.`)) {
      return;
    }
    concluir("excluir", () =>
      createClient().from("categorias").delete().eq("id", categoria.id),
    );
  }

  const travado = isSubmitting || ocupado;
  const emAndamento = (qual: typeof acao) => ocupado && acao === qual;
  const salvando = isSubmitting || emAndamento("salvar");

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{categoria ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        <DialogDescription>
          A cor e o ícone aparecem na lista de lançamentos e nos gráficos.
        </DialogDescription>
      </DialogHeader>

      <form id="form-categoria" onSubmit={handleSubmit(salvar)} noValidate className="flex flex-col gap-5">
        <Campo
          id="nome-categoria"
          rotulo="Nome"
          autoComplete="off"
          erro={errors.nome?.message}
          {...register("nome")}
        />

        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <Escolha
              rotulo="Tipo"
              opcoes={TIPOS_CATEGORIA}
              valor={field.value}
              onChange={field.onChange}
              erro={errors.tipo?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="cor"
          render={({ field }) => (
            <Escolha
              rotulo="Cor"
              variante="grade"
              className="grid-cols-5 sm:grid-cols-10"
              opcoes={PALETA.map((c) => ({
                valor: c.valor,
                rotulo: c.nome,
                conteudo: (
                  <span
                    className="flex size-7 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: c.valor }}
                  >
                    {field.value === c.valor && <Check className="size-4" aria-hidden />}
                  </span>
                ),
              }))}
              valor={field.value}
              onChange={field.onChange}
              erro={errors.cor?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="icone"
          render={({ field }) => (
            <Escolha
              rotulo="Ícone"
              variante="grade"
              className="sm:grid-cols-10"
              opcoes={NOMES_ICONES.map((nome) => {
                const { Icone, nome: rotulo } = ICONES[nome];
                return { valor: nome, rotulo, conteudo: <Icone className="size-5" aria-hidden /> };
              })}
              valor={field.value}
              onChange={field.onChange}
              erro={errors.icone?.message}
            />
          )}
        />

        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
      </form>

      <DialogFooter className="gap-2">
        {categoria && (
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
                ? categoria.ativa
                  ? "Desativando…"
                  : "Reativando…"
                : categoria.ativa
                  ? "Desativar"
                  : "Reativar"}
            </Button>
            {!categoria.emUso && (
              <Button
                type="button"
                variant="destructive"
                className="h-10"
                onClick={excluir}
                carregando={emAndamento("excluir")}
                disabled={travado}
              >
                {emAndamento("excluir") ? "Excluindo…" : "Excluir"}
              </Button>
            )}
          </div>
        )}
        <Button type="submit" form="form-categoria" className="h-10" carregando={salvando} disabled={travado}>
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
      {categoria?.emUso && (
        <p className="text-xs text-muted-foreground">
          Esta categoria já tem lançamentos, por isso só pode ser desativada. Ela
          some das opções de novos lançamentos, mas o histórico continua igual.
        </p>
      )}
    </DialogContent>
  );
}
