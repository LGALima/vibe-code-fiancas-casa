"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  Clock,
  Copy,
  Pencil,
  SlidersHorizontal,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconeCategoria } from "@/components/icone-categoria";
import { PainelConfirmarExclusao } from "@/components/confirmar-exclusao";
import type { CategoriaOpcao, FormaOpcao, Lancamento, Membro } from "@/lib/dados";
import { formatarData, formatarDiaDaLista } from "@/lib/dominio/datas";
import {
  formatarBRL,
  formatarDiferenca,
  lerValor,
  mascararCentavos,
  mascararColado,
} from "@/lib/dominio/dinheiro";
import {
  ROTULO_STATUS,
  aguardaConfirmacao,
  avaliarDiferenca,
  resumirPendentes,
  calcularStatus,
  diferenca,
  type Status,
} from "@/lib/dominio/status";
import { createClient } from "@/lib/supabase/client";
import { traduzirErroBanco } from "@/lib/supabase/erros";
import { cn } from "@/lib/utils";

type Filtros = {
  tipo: "" | "gasto" | "ganho";
  categoria: string;
  forma: string;
  status: "" | Status;
  pessoa: string;
  /** Só os previstos com data até hoje ainda sem valor real. */
  pendentes: boolean;
};

const SEM_FILTRO: Filtros = {
  tipo: "",
  categoria: "",
  forma: "",
  status: "",
  pessoa: "",
  pendentes: false,
};

type Props = {
  lancamentos: Lancamento[];
  categorias: CategoriaOpcao[];
  formas: FormaOpcao[];
  membros: Membro[];
  userId: string;
  /** Data de hoje (aaaa-mm-dd), para saber o que já devia ter sido confirmado. */
  hoje: string;
  /** Filtros que já chegam aplicados (ex.: vindo de um gráfico em Análises). */
  filtrosIniciais?: Partial<Filtros>;
};

export function ListaLancamentos({
  lancamentos,
  categorias,
  formas,
  membros,
  userId,
  hoje,
  filtrosIniciais,
}: Props) {
  const [filtros, setFiltros] = useState<Filtros>({ ...SEM_FILTRO, ...filtrosIniciais });
  const [mostrarFiltros, setMostrarFiltros] = useState(
    Object.values(filtrosIniciais ?? {}).some(Boolean),
  );
  const [selecionado, setSelecionado] = useState<Lancamento | null>(null);
  const [confirmando, setConfirmando] = useState<Lancamento | null>(null);

  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const formaPorId = useMemo(() => new Map(formas.map((f) => [f.id, f])), [formas]);
  const nomePorUsuario = useMemo(
    () => new Map(membros.map((m) => [m.userId, m.userId === userId ? "Você" : m.nome])),
    [membros, userId],
  );

  const filtrados = lancamentos.filter(
    (l) =>
      (!filtros.tipo || l.tipo === filtros.tipo) &&
      (!filtros.categoria || l.categoria_id === filtros.categoria) &&
      (!filtros.forma || l.forma_pagamento_id === filtros.forma) &&
      (!filtros.status || calcularStatus(l) === filtros.status) &&
      (!filtros.pessoa || l.criado_por === filtros.pessoa) &&
      (!filtros.pendentes || aguardaConfirmacao(l, hoje)),
  );
  const pendentes = useMemo(() => resumirPendentes(lancamentos, hoje), [lancamentos, hoje]);

  const grupos = useMemo(() => {
    const porDia = new Map<string, Lancamento[]>();
    for (const l of filtrados) {
      porDia.set(l.data, [...(porDia.get(l.data) ?? []), l]);
    }
    return [...porDia.entries()];
  }, [filtrados]);

  const ativos = Object.values(filtros).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      {pendentes.quantidade > 0 && (
        <AvisoPendentes
          pendentes={pendentes}
          filtrando={filtros.pendentes}
          onAlternar={() => setFiltros({ ...filtros, pendentes: !filtros.pendentes })}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {filtrados.length === lancamentos.length
            ? `${lancamentos.length} lançamento${lancamentos.length === 1 ? "" : "s"}`
            : `${filtrados.length} de ${lancamentos.length}`}
        </h2>
        <div className="flex gap-1">
          {ativos > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFiltros(SEM_FILTRO)}>
              <X aria-hidden />
              Limpar
            </Button>
          )}
          <Button
            variant={mostrarFiltros || ativos > 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => setMostrarFiltros((v) => !v)}
            aria-expanded={mostrarFiltros}
          >
            <SlidersHorizontal aria-hidden />
            Filtros{ativos > 0 ? ` (${ativos})` : ""}
          </Button>
        </div>
      </div>

      {mostrarFiltros && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
          <Filtro
            rotulo="Tipo"
            valor={filtros.tipo}
            onChange={(v) => setFiltros({ ...filtros, tipo: v as Filtros["tipo"] })}
            opcoes={[
              ["gasto", "Gasto"],
              ["ganho", "Ganho"],
            ]}
          />
          <Filtro
            rotulo="Status"
            valor={filtros.status}
            onChange={(v) => setFiltros({ ...filtros, status: v as Filtros["status"] })}
            opcoes={Object.entries(ROTULO_STATUS)}
          />
          <Filtro
            rotulo="Categoria"
            valor={filtros.categoria}
            onChange={(v) => setFiltros({ ...filtros, categoria: v })}
            opcoes={categorias.map((c) => [c.id, c.nome])}
          />
          <Filtro
            rotulo="Forma de pagamento"
            valor={filtros.forma}
            onChange={(v) => setFiltros({ ...filtros, forma: v })}
            opcoes={formas.map((f) => [f.id, f.nome])}
          />
          <Filtro
            rotulo="Pessoa"
            valor={filtros.pessoa}
            onChange={(v) => setFiltros({ ...filtros, pessoa: v })}
            opcoes={membros.map((m) => [m.userId, m.userId === userId ? `${m.nome} (você)` : m.nome])}
          />
        </div>
      )}

      {lancamentos.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhum lançamento neste ciclo.{" "}
          <Link href="/lancar" className="underline">
            Lançar o primeiro
          </Link>
        </div>
      ) : filtrados.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum lançamento com esses filtros.
        </p>
      ) : (
        grupos.map(([data, itens]) => (
          <section key={data} className="flex flex-col gap-1">
            <h3 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {formatarDiaDaLista(data)}
            </h3>
            <ul className="flex flex-col divide-y rounded-xl border">
              {itens.map((l) => (
                <Item
                  key={l.id}
                  lancamento={l}
                  categoria={categoriaPorId.get(l.categoria_id)}
                  forma={formaPorId.get(l.forma_pagamento_id)}
                  pessoa={l.criado_por ? nomePorUsuario.get(l.criado_por) : undefined}
                  pendente={aguardaConfirmacao(l, hoje)}
                  onAbrir={() => setSelecionado(l)}
                  onConfirmar={() => setConfirmando(l)}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      <Dialog open={selecionado !== null} onOpenChange={(a) => !a && setSelecionado(null)}>
        {selecionado && (
          <Acoes
            lancamento={selecionado}
            onConfirmar={() => {
              setConfirmando(selecionado);
              setSelecionado(null);
            }}
            onFechar={() => setSelecionado(null)}
          />
        )}
      </Dialog>

      <Dialog open={confirmando !== null} onOpenChange={(a) => !a && setConfirmando(null)}>
        {confirmando && (
          <ConfirmarValor key={confirmando.id} lancamento={confirmando} onFechar={() => setConfirmando(null)} />
        )}
      </Dialog>
    </div>
  );
}

/** Aviso no topo da lista: previstos cuja data já chegou e ainda sem valor real. */
function AvisoPendentes({
  pendentes: p,
  filtrando,
  onAlternar,
}: {
  pendentes: ReturnType<typeof resumirPendentes>;
  filtrando: boolean;
  onAlternar: () => void;
}) {
  const um = p.quantidade === 1;
  const diaMes = p.maisAntigo ? formatarData(p.maisAntigo).slice(0, 5) : "";
  const valores = [
    p.gastos > 0 && `${formatarBRL(p.gastos)} em gastos`,
    p.ganhos > 0 && `${formatarBRL(p.ganhos)} em ganhos`,
  ].filter(Boolean);

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 sm:flex-row sm:items-center dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="flex min-w-0 flex-1 gap-2.5">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-semibold">
            {um
              ? "Existe 1 lançamento não confirmado"
              : `Existem ${p.quantidade} lançamentos não confirmados`}
          </p>
          <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
            {um ? "Já passou da data" : `Já passaram da data (desde ${diaMes})`} e
            {um ? " está" : " estão"} sem valor real
            {valores.length > 0 && `: ${valores.join(" e ")}`}. Confirme quanto foi de
            verdade para o saldo do ciclo ficar certo.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-9 shrink-0 self-end border-amber-400 bg-transparent text-amber-900 hover:bg-amber-100 sm:self-auto dark:border-amber-600 dark:text-amber-100 dark:hover:bg-amber-900/40"
        onClick={onAlternar}
        aria-pressed={filtrando}
      >
        {filtrando ? "Mostrar todos" : um ? "Mostrar só ele" : "Mostrar só esses"}
      </Button>
    </div>
  );
}

function Filtro({
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: [string, string][];
}) {
  const id = `filtro-${rotulo.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs">
        {rotulo}
      </Label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">Todos</option>
        {opcoes.map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}

function Item({
  lancamento: l,
  categoria,
  forma,
  pessoa,
  pendente,
  onAbrir,
  onConfirmar,
}: {
  lancamento: Lancamento;
  categoria?: CategoriaOpcao;
  forma?: FormaOpcao;
  pessoa?: string;
  /** Previsto com data até hoje e sem valor real: fica em destaque. */
  pendente: boolean;
  onAbrir: () => void;
  onConfirmar: () => void;
}) {
  const status = calcularStatus(l);
  const dif = diferenca(l);
  const avaliacao = avaliarDiferenca(l.tipo, dif);
  const valor = l.valor_real ?? l.estimativa ?? 0;
  const previsto = status === "previsto";

  return (
    <li
      className={cn(
        "flex items-center gap-2 pr-2",
        pendente && "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
      )}
    >
      <button
        type="button"
        onClick={onAbrir}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left outline-none hover:bg-muted/40 focus-visible:bg-muted"
        aria-label={`${l.descricao}, ${pendente ? "não confirmado" : ROTULO_STATUS[status]}, ${formatarBRL(valor)}. Abrir ações.`}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-white",
            previsto && !pendente && "opacity-50",
          )}
          style={{ backgroundColor: categoria?.cor ?? "#475569" }}
        >
          <IconeCategoria nome={categoria?.icone} className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "flex items-center gap-1.5 truncate text-sm font-medium",
              previsto && !pendente && "text-muted-foreground italic",
            )}
          >
            {previsto && <Clock className="size-3.5 shrink-0" aria-label="Previsto" />}
            <span className="truncate">{l.descricao}</span>
            {l.total_parcelas && (
              <span className="shrink-0 rounded bg-muted px-1 text-[11px] font-normal text-muted-foreground not-italic tabular-nums">
                {l.parcela_atual}/{l.total_parcelas}
              </span>
            )}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {[categoria?.nome, forma?.nome, pessoa].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              previsto && !pendente && "font-normal text-muted-foreground italic",
              !previsto && l.tipo === "ganho" && "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {l.tipo === "ganho" ? "+" : ""}
            {formatarBRL(valor)}
          </span>
          {status === "realizado" && dif !== null && dif !== 0 && (
            <span
              className={cn(
                "text-[11px] tabular-nums",
                avaliacao === "favoravel" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
              )}
            >
              {formatarDiferenca(dif)} vs. previsto
            </span>
          )}
          {pendente && (
            <span className="rounded-full bg-amber-200/70 px-1.5 text-[11px] font-medium text-amber-900 dark:bg-amber-800/50 dark:text-amber-200">
              não confirmado
            </span>
          )}
          {status === "nao_planejado" && (
            <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              extra
            </span>
          )}
        </span>
      </button>
      {previsto && (
        <Button
          variant={pendente ? "default" : "outline"}
          size="sm"
          className="h-8 shrink-0"
          onClick={onConfirmar}
        >
          Confirmar
        </Button>
      )}
    </li>
  );
}

function Acoes({
  lancamento: l,
  onConfirmar,
  onFechar,
}: {
  lancamento: Lancamento;
  onConfirmar: () => void;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  // A transição só termina quando a lista já voltou atualizada: até lá o
  // botão mostra "Excluindo…" e o diálogo continua aberto.
  const [excluindo, iniciar] = useTransition();
  const status = calcularStatus(l);

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  function excluir() {
    setErro(undefined);
    iniciar(async () => {
      const { error } = await createClient().from("lancamentos").delete().eq("id", l.id);
      if (error) {
        setErro(traduzirErroBanco(error));
        return;
      }
      iniciar(() => {
        router.refresh();
        onFechar();
      });
    });
  }

  if (confirmandoExclusao) {
    return (
      <DialogContent>
        <PainelConfirmarExclusao
          titulo={`Excluir "${l.descricao}"?`}
          descricao={`${formatarData(l.data)}${l.valor_real !== null ? ` · ${formatarBRL(l.valor_real)}` : l.estimativa !== null ? ` · ${formatarBRL(l.estimativa)}` : ""}.`}
          rotuloConfirmar="Excluir lançamento"
          excluindo={excluindo}
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
        <DialogTitle>{l.descricao}</DialogTitle>
        <DialogDescription>
          {ROTULO_STATUS[status]} · {formatarData(l.data)}
          {l.estimativa !== null && ` · estimativa ${formatarBRL(l.estimativa)}`}
          {l.valor_real !== null && ` · real ${formatarBRL(l.valor_real)}`}
          {l.observacao && ` · ${l.observacao}`}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        {status === "previsto" && (
          <Button className="h-11 justify-start" onClick={onConfirmar}>
            <Clock aria-hidden />
            Confirmar valor
          </Button>
        )}
        <BotaoAbrir href={`/lancar?editar=${l.id}`} Icone={Pencil} rotulo="Editar" carregandoRotulo="Abrindo…" desativado={excluindo} onAberto={onFechar} />
        <BotaoAbrir href={`/lancar?duplicar=${l.id}`} Icone={Copy} rotulo="Duplicar" carregandoRotulo="Abrindo…" desativado={excluindo} onAberto={onFechar} />
        <Button variant="destructive" className="h-11 justify-start" onClick={() => setConfirmandoExclusao(true)}>
          <Trash2 aria-hidden />
          Excluir
        </Button>
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>
    </DialogContent>
  );
}

/**
 * Botão que abre outra tela (Editar, Duplicar). Mostra "Abrindo…" até a tela
 * carregar e só então fecha o diálogo.
 */
function BotaoAbrir({
  href,
  Icone,
  rotulo,
  carregandoRotulo,
  desativado,
  onAberto,
}: {
  href: string;
  Icone: LucideIcon;
  rotulo: string;
  carregandoRotulo: string;
  desativado?: boolean;
  onAberto: () => void;
}) {
  const router = useRouter();
  const [abrindo, iniciar] = useTransition();
  return (
    <Button
      variant="outline"
      className="h-11 justify-start"
      carregando={abrindo}
      disabled={desativado}
      onClick={() =>
        iniciar(() => {
          router.push(href);
          onAberto();
        })
      }
    >
      <Icone aria-hidden />
      {abrindo ? carregandoRotulo : rotulo}
    </Button>
  );
}

function ConfirmarValor({ lancamento: l, onFechar }: { lancamento: Lancamento; onFechar: () => void }) {
  const router = useRouter();
  const [outro, setOutro] = useState("");
  const [erro, setErro] = useState<string>();
  const [salvando, iniciar] = useTransition();
  const [qual, setQual] = useState<"previsto" | "outro">("previsto");
  const estimativa = l.estimativa ?? 0;

  function confirmar(valor: number, origem: "previsto" | "outro") {
    setErro(undefined);
    setQual(origem);
    iniciar(async () => {
      const { error } = await createClient()
        .from("lancamentos")
        .update({ valor_real: valor })
        .eq("id", l.id);
      if (error) {
        setErro(traduzirErroBanco(error));
        return;
      }
      iniciar(() => {
        router.refresh();
        onFechar();
      });
    });
  }

  function confirmarOutro(e: React.FormEvent) {
    e.preventDefault();
    const valor = lerValor(outro);
    if (valor === null) {
      setErro("Digite um valor válido. Ex.: 120,50");
      return;
    }
    confirmar(valor, "outro");
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirmar valor</DialogTitle>
        <DialogDescription>{l.descricao}: quanto foi de verdade?</DialogDescription>
      </DialogHeader>
      <Button
        className="h-12 text-base"
        onClick={() => confirmar(estimativa, "previsto")}
        carregando={salvando && qual === "previsto"}
        disabled={salvando}
      >
        {salvando && qual === "previsto" ? "Confirmando…" : `Foi ${formatarBRL(estimativa)}, como previsto`}
      </Button>
      <form onSubmit={confirmarOutro} className="flex flex-col gap-2">
        <Label htmlFor="outro-valor">Ou digite o valor real</Label>
        <div className="flex gap-2">
          <Input
            id="outro-valor"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0,00"
            className="h-11 text-lg tabular-nums"
            value={outro}
            // Mesma máscara do Lançar: 7890 vira 78,90.
            onChange={(e) => setOutro(mascararCentavos(e.target.value))}
            onPaste={(e) => {
              e.preventDefault();
              setOutro(mascararColado(e.clipboardData.getData("text")));
            }}
          />
          <Button
            type="submit"
            variant="outline"
            className="h-11"
            carregando={salvando && qual === "outro"}
            disabled={salvando || !outro.trim()}
          >
            {salvando && qual === "outro" ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </DialogContent>
  );
}
