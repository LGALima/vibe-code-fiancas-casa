"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CreditCard } from "lucide-react";
import { Campo } from "@/components/campo";
import { Escolha } from "@/components/escolha";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconeCategoria } from "@/components/icone-categoria";
import type { CategoriaOpcao, Ciclo, FormaOpcao, Lancamento } from "@/lib/dados";
import { valorParaCampo } from "@/lib/dominio/dinheiro";
import { createClient } from "@/lib/supabase/client";
import { traduzirErroBanco } from "@/lib/supabase/erros";
import { cn } from "@/lib/utils";
import {
  lancamentoSchema,
  type LancamentoDados,
  type LancamentoEntrada,
} from "@/lib/validacoes/lancamento";

const CHAVE_ULTIMA_FORMA = "financas:ultima-forma";

type Props = {
  espacoId: string;
  hoje: string;
  ciclos: Ciclo[];
  categorias: CategoriaOpcao[];
  formas: FormaOpcao[];
  /** Lançamento existente: editar (modo "editar") ou copiar (modo "duplicar"). */
  origem?: { modo: "editar" | "duplicar"; lancamento: Lancamento };
};

function lerUltimaForma(): string | null {
  try {
    return window.localStorage.getItem(CHAVE_ULTIMA_FORMA);
  } catch {
    return null;
  }
}

function salvarUltimaForma(id: string) {
  try {
    window.localStorage.setItem(CHAVE_ULTIMA_FORMA, id);
  } catch {
    // Sem armazenamento local: tudo bem, só não lembra a última forma.
  }
}

function formaPadrao(formas: FormaOpcao[]): string {
  const ativas = formas.filter((f) => f.ativa);
  return (ativas.find((f) => f.nome.toLowerCase() === "pix") ?? ativas[0])?.id ?? "";
}

export function FormularioLancamento({ espacoId, hoje, ciclos, categorias, formas, origem }: Props) {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  const [semCiclo, setSemCiclo] = useState(false);
  const editando = origem?.modo === "editar" ? origem.lancamento : null;
  const base = origem?.lancamento;

  const schema = useMemo(() => lancamentoSchema(ciclos), [ciclos]);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LancamentoEntrada, unknown, LancamentoDados>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: base?.tipo ?? "gasto",
      descricao: base?.descricao ?? "",
      estimativa: valorParaCampo(base?.estimativa),
      valorReal: valorParaCampo(base?.valor_real),
      categoriaId: base?.categoria_id ?? "",
      formaId: base?.forma_pagamento_id ?? formaPadrao(formas),
      data: origem?.modo === "editar" ? base!.data : hoje,
      recorrente: base?.recorrente ?? false,
      parcelado: base?.total_parcelas != null,
      totalParcelas: base?.total_parcelas ? String(base.total_parcelas) : "",
      parcelaAtual: base?.parcela_atual ? String(base.parcela_atual) : "1",
      observacao: base?.observacao ?? "",
    },
  });

  // Num lançamento novo, volta para a última forma de pagamento usada.
  useEffect(() => {
    if (origem) return;
    const ultima = lerUltimaForma();
    if (ultima && formas.some((f) => f.id === ultima && f.ativa)) {
      setValue("formaId", ultima);
    }
  }, [origem, formas, setValue]);

  const tipo = useWatch({ control, name: "tipo" });
  const parcelado = useWatch({ control, name: "parcelado" });
  const categoriaId = useWatch({ control, name: "categoriaId" });
  const [maisOpcoes, setMaisOpcoes] = useState(
    Boolean(base && (base.recorrente || base.total_parcelas || base.observacao)),
  );

  const categoriasDoTipo = categorias.filter(
    (c) => (c.ativa || c.id === base?.categoria_id) && (c.tipo === tipo || c.tipo === "ambos"),
  );
  const formasVisiveis = formas.filter((f) => f.ativa || f.id === base?.forma_pagamento_id);

  // Trocar Gasto/Ganho tira a categoria se ela não servir para o novo tipo.
  useEffect(() => {
    const atual = categorias.find((c) => c.id === getValues("categoriaId"));
    if (atual && atual.tipo !== "ambos" && atual.tipo !== tipo) {
      setValue("categoriaId", "");
    }
  }, [tipo, categorias, getValues, setValue]);

  // Descrição automática: se ela é só o nome da categoria anterior, some ao
  // trocar de categoria (e o nome da nova entra no lugar ao salvar).
  function limparDescricaoAutomatica() {
    const anterior = categorias.find((c) => c.id === getValues("categoriaId"))?.nome;
    if (anterior && getValues("descricao").trim() === anterior) {
      setValue("descricao", "");
    }
  }

  async function salvar(d: LancamentoDados) {
    setErro(undefined);
    setSemCiclo(false);
    const categoria = categorias.find((c) => c.id === d.categoriaId);
    const grupoAtual = editando?.grupo_id ?? null;
    const registro = {
      tipo: d.tipo,
      descricao: d.descricao || categoria?.nome || "Lançamento",
      estimativa: d.estimativa,
      valor_real: d.valorReal,
      categoria_id: d.categoriaId,
      forma_pagamento_id: d.formaId,
      data: d.data,
      ciclo_id: d.cicloId,
      recorrente: d.recorrente,
      total_parcelas: d.totalParcelas,
      parcela_atual: d.parcelaAtual,
      grupo_id: d.parcelado ? (grupoAtual ?? crypto.randomUUID()) : null,
      observacao: d.observacao,
    };

    const supabase = createClient();
    const { error } = editando
      ? await supabase.from("lancamentos").update(registro).eq("id", editando.id)
      : await supabase.from("lancamentos").insert({ ...registro, espaco_id: espacoId });

    if (error) {
      if (error.message.startsWith("Não há ciclo")) {
        setSemCiclo(true);
        setErro(error.message);
      } else {
        setErro(traduzirErroBanco(error));
      }
      return;
    }
    salvarUltimaForma(d.formaId);
    router.push(`/?ciclo=${d.cicloId}`);
    router.refresh();
  }

  async function excluir() {
    if (!editando) return;
    if (!window.confirm(`Excluir "${editando.descricao}"? Isso não pode ser desfeito.`)) return;
    const { error } = await createClient().from("lancamentos").delete().eq("id", editando.id);
    if (error) {
      setErro(traduzirErroBanco(error));
      return;
    }
    router.push(`/?ciclo=${editando.ciclo_id}`);
    router.refresh();
  }

  if (categorias.every((c) => !c.ativa) || formas.every((f) => !f.ativa)) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Cadastre ao menos uma categoria e uma forma de pagamento em{" "}
        <Link href="/cadastros" className="underline">
          Cadastros
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(salvar)} noValidate className="flex flex-col gap-5">
      <Controller
        control={control}
        name="tipo"
        render={({ field }) => (
          <Escolha
            rotulo="Tipo"
            opcoes={[
              { valor: "gasto", rotulo: "Gasto" },
              { valor: "ganho", rotulo: "Ganho" },
            ]}
            valor={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <Campo
          id="valor-real"
          rotulo="Valor real"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          autoFocus={!origem}
          className="h-12 text-xl font-semibold tabular-nums"
          erro={errors.valorReal?.message}
          {...register("valorReal")}
        />
        <Campo
          id="estimativa"
          rotulo="Estimativa"
          inputMode="decimal"
          autoComplete="off"
          placeholder="opcional"
          className="h-12 text-xl tabular-nums"
          erro={errors.estimativa?.message}
          {...register("estimativa")}
        />
      </div>

      <Controller
        control={control}
        name="categoriaId"
        render={({ field }) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Categoria</legend>
            <div role="radiogroup" aria-label="Categoria" className="grid grid-cols-3 gap-2">
              {categoriasDoTipo.map((c) => {
                const ativo = field.value === c.id;
                const cor = c.cor ?? "#475569";
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    aria-label={c.nome}
                    onClick={() => {
                      if (c.id !== field.value) limparDescricaoAutomatica();
                      field.onChange(c.id);
                    }}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      ativo ? "text-white" : "bg-background hover:bg-muted",
                    )}
                    style={ativo ? { backgroundColor: cor, borderColor: cor } : { borderColor: `${cor}55` }}
                  >
                    <IconeCategoria nome={c.icone} className="size-5" style={ativo ? undefined : { color: cor }} />
                    <span className="line-clamp-2 text-center leading-tight">{c.nome}</span>
                  </button>
                );
              })}
            </div>
            {errors.categoriaId && (
              <p className="text-sm text-destructive">{errors.categoriaId.message}</p>
            )}
          </fieldset>
        )}
      />

      <Controller
        control={control}
        name="formaId"
        render={({ field }) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Forma de pagamento</legend>
            <div role="radiogroup" aria-label="Forma de pagamento" className="flex flex-wrap gap-2">
              {formasVisiveis.map((f) => {
                const ativo = field.value === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => field.onChange(f.id)}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      ativo
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {f.ehCredito && <CreditCard className="size-3.5" aria-hidden />}
                    {f.nome}
                  </button>
                );
              })}
            </div>
            {errors.formaId && <p className="text-sm text-destructive">{errors.formaId.message}</p>}
          </fieldset>
        )}
      />

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Campo
          id="descricao"
          rotulo="Descrição"
          autoComplete="off"
          placeholder={
            categorias.find((c) => c.id === categoriaId)?.nome ?? "Usa o nome da categoria"
          }
          erro={errors.descricao?.message}
          {...register("descricao")}
        />
        <Campo
          id="data"
          rotulo="Data"
          type="date"
          className="h-10 w-[9.5rem] text-base"
          erro={errors.data?.message}
          {...register("data")}
        />
      </div>

      {!maisOpcoes ? (
        <button
          type="button"
          onClick={() => setMaisOpcoes(true)}
          className="self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Recorrente, parcelado e observação
        </button>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border p-3">
          <Controller
            control={control}
            name="parcelado"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="parcelado" className="flex flex-col items-start gap-1">
                  Parcelado
                  <span className="text-xs font-normal text-muted-foreground">
                    Uma parcela por ciclo.
                  </span>
                </Label>
                <Switch
                  id="parcelado"
                  aria-label="Parcelado"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(Boolean(v))}
                />
              </div>
            )}
          />
          {parcelado && (
            <div className="grid grid-cols-2 gap-3">
              <Campo
                id="parcela-atual"
                rotulo="Parcela atual"
                inputMode="numeric"
                erro={errors.parcelaAtual?.message}
                {...register("parcelaAtual")}
              />
              <Campo
                id="total-parcelas"
                rotulo="Total de parcelas"
                inputMode="numeric"
                placeholder="Ex.: 10"
                erro={errors.totalParcelas?.message}
                {...register("totalParcelas")}
              />
            </div>
          )}
          <Controller
            control={control}
            name="recorrente"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="recorrente" className="flex flex-col items-start gap-1">
                  Recorrente
                  <span className="text-xs font-normal text-muted-foreground">
                    {parcelado
                      ? "Parcelado é sempre recorrente."
                      : "Copiado como previsto ao criar o próximo ciclo."}
                  </span>
                </Label>
                <Switch
                  id="recorrente"
                  aria-label="Recorrente"
                  checked={parcelado || field.value}
                  disabled={parcelado}
                  onCheckedChange={(v) => field.onChange(Boolean(v))}
                />
              </div>
            )}
          />
          <Campo
            id="observacao"
            rotulo="Observação"
            autoComplete="off"
            placeholder="Ex.: emprestei para o João"
            erro={errors.observacao?.message}
            {...register("observacao")}
          />
        </div>
      )}

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}{" "}
          {semCiclo && (
            <Link href="/ciclos" className="underline">
              Ir para Ciclos
            </Link>
          )}
        </p>
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex gap-2 bg-background/95 py-2 backdrop-blur">
        {editando && (
          <Button type="button" variant="destructive" className="h-12" onClick={excluir} disabled={isSubmitting}>
            Excluir
          </Button>
        )}
        <Button type="submit" className="h-12 flex-1 text-base" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : editando ? "Salvar alterações" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
