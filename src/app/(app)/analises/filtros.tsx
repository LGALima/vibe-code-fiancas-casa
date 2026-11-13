"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Escolha } from "@/components/escolha";
import { Label } from "@/components/ui/label";
import type { Visao } from "@/lib/analises";
import type { Membro } from "@/lib/dados";

const classeSelect =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Filtros numa linha acima dos gráficos; ficam na URL (dá para compartilhar). */
export function FiltrosAnalise({
  ciclos,
  cicloId,
  visao,
  pessoa,
  membros,
  userId,
}: {
  ciclos: { id: string; nome: string }[];
  cicloId: string;
  visao: Visao;
  pessoa: string | null;
  membros: Membro[];
  userId: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [atualizando, iniciar] = useTransition();

  function mudar(chave: string, valor: string | null) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    iniciar(() => router.replace(`/analises?${novo.toString()}`, { scroll: false }));
  }

  return (
    <div
      aria-busy={atualizando || undefined}
      className="relative flex flex-col gap-3 rounded-xl border p-3 md:grid md:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)] md:items-end md:gap-4"
    >
      {atualizando && (
        <span
          className="absolute top-2 right-3 flex items-center gap-1 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Atualizando…
        </span>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="filtro-ciclo" className="text-xs">
            Ciclo
          </Label>
          <select
            id="filtro-ciclo"
            className={classeSelect}
            value={cicloId}
            onChange={(e) => mudar("ciclo", e.target.value)}
          >
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="filtro-pessoa" className="text-xs">
            Pessoa
          </Label>
          <select
            id="filtro-pessoa"
            className={classeSelect}
            value={pessoa ?? ""}
            onChange={(e) => mudar("pessoa", e.target.value || null)}
          >
            <option value="">Todos</option>
            {membros.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userId === userId ? `Eu (${m.nome})` : m.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Escolha
        rotulo="Visão"
        opcoes={[
          { valor: "previsto", rotulo: "Previsto" },
          { valor: "realizado", rotulo: "Realizado" },
        ]}
        valor={visao}
        onChange={(v) => mudar("visao", v === "previsto" ? null : v)}
      />
    </div>
  );
}
