import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import type { CicloDatas } from "@/lib/dominio/ciclos";
import { formatarBRL } from "@/lib/dominio/dinheiro";
import {
  diasRestantes,
  podeGastarPorDia,
  progressoDoPrevisto,
  type Resumo,
} from "@/lib/dominio/resumo";
import { cn } from "@/lib/utils";

const corDoSaldo = (valor: number) =>
  valor > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : valor < 0
      ? "text-red-600 dark:text-red-400"
      : "text-foreground";

export function ResumoCiclo({
  resumo,
  ciclo,
  hoje,
}: {
  resumo: Resumo;
  ciclo: CicloDatas;
  hoje: string;
}) {
  const dias = diasRestantes(ciclo, hoje);
  const porDia = podeGastarPorDia(resumo.saldo_previsto, dias);

  return (
    <section aria-label="Resumo do ciclo" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Cartao titulo="Ganhos" Icone={ArrowUpRight} corIcone="text-emerald-600 dark:text-emerald-400">
        <Valores previsto={resumo.ganhos_previsto} realizado={resumo.ganhos_realizado} />
        <Medidor
          tipo="ganhos"
          progresso={progressoDoPrevisto(resumo.ganhos_realizado, resumo.ganhos_previsto)}
        />
      </Cartao>

      <Cartao titulo="Gastos" Icone={ArrowDownRight} corIcone="text-red-600 dark:text-red-400">
        <Valores previsto={resumo.gastos_previsto} realizado={resumo.gastos_realizado} />
        <Medidor
          tipo="gastos"
          progresso={progressoDoPrevisto(resumo.gastos_realizado, resumo.gastos_previsto)}
        />
      </Cartao>

      <Cartao titulo="Saldo líquido" Icone={Scale} className="col-span-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Previsto</span>
            <span className={cn("text-xl font-semibold tabular-nums", corDoSaldo(resumo.saldo_previsto))}>
              {formatarBRL(resumo.saldo_previsto)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Realizado</span>
            <span className={cn("text-xl font-semibold tabular-nums", corDoSaldo(resumo.saldo_realizado))}>
              {formatarBRL(resumo.saldo_realizado)}
            </span>
          </div>
        </div>
        <div className="mt-3 border-t pt-3">
          {porDia === null ? (
            <p className="text-sm text-muted-foreground">Ciclo encerrado.</p>
          ) : (
            <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
              <span className="text-muted-foreground">Pode gastar por dia até o fim do ciclo</span>
              <span className={cn("font-semibold tabular-nums", corDoSaldo(porDia))}>
                {formatarBRL(porDia)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  · {dias} {dias === 1 ? "dia" : "dias"}
                </span>
              </span>
            </p>
          )}
        </div>
      </Cartao>
    </section>
  );
}

/**
 * Barra "x% do previsto". Passar de 100% é ruim nos gastos (fica vermelho) e
 * bom nos ganhos (fica verde).
 */
function Medidor({ tipo, progresso }: { tipo: "ganhos" | "gastos"; progresso: number }) {
  const passou = progresso > 1;
  const cor = !passou
    ? { barra: "bg-primary", texto: "text-muted-foreground" }
    : tipo === "gastos"
      ? { barra: "bg-red-500", texto: "text-red-600 dark:text-red-400" }
      : { barra: "bg-emerald-500", texto: "text-emerald-600 dark:text-emerald-400" };
  const pct = Math.round(progresso * 100);

  return (
    <div className="mt-auto flex flex-col gap-1 pt-2">
      <div
        role="progressbar"
        aria-label={`${tipo === "gastos" ? "Gastos" : "Ganhos"} realizados em relação ao previsto`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(progresso, 1) * 100)}
        aria-valuetext={`${pct}% do previsto`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-all", cor.barra)}
          style={{ width: `${Math.min(progresso, 1) * 100}%` }}
        />
      </div>
      <span className={cn("text-[11px] tabular-nums", cor.texto)}>
        {pct}% do previsto{passou ? " — acima do previsto" : ""}
      </span>
    </div>
  );
}

function Cartao({
  titulo,
  Icone,
  corIcone,
  className,
  children,
}: {
  titulo: string;
  Icone: typeof Scale;
  corIcone?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col rounded-xl border bg-card p-3 text-card-foreground", className)}>
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
        <Icone className={cn("size-4", corIcone)} aria-hidden />
        {titulo}
      </h2>
      {children}
    </div>
  );
}

function Valores({ previsto, realizado }: { previsto: number; realizado: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">Previsto</span>
      <span className="text-lg font-semibold tabular-nums">{formatarBRL(previsto)}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        Realizado {formatarBRL(realizado)}
      </span>
    </div>
  );
}
