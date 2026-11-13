"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Ciclo } from "@/lib/dados";
import { formatarData } from "@/lib/dominio/datas";

/** Ciclos chegam do mais recente para o mais antigo. */
export function SeletorCiclo({ ciclos, atualId }: { ciclos: Ciclo[]; atualId: string }) {
  const router = useRouter();
  const i = ciclos.findIndex((c) => c.id === atualId);
  const atual = ciclos[i];
  const anterior = ciclos[i + 1];
  const proximo = ciclos[i - 1];
  // Até o ciclo escolhido aparecer, a seta gira e a data vira "Carregando…".
  const [carregando, iniciar] = useTransition();
  const [origem, setOrigem] = useState<"anterior" | "proximo" | "lista">("lista");
  const ir = (id: string, de: typeof origem) => {
    setOrigem(de);
    iniciar(() => router.push(`/?ciclo=${id}`));
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-10"
        disabled={!anterior}
        carregando={carregando && origem === "anterior"}
        onClick={() => anterior && ir(anterior.id, "anterior")}
        aria-label={anterior ? `Ciclo anterior: ${anterior.nome}` : "Não há ciclo anterior"}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <label className="relative flex flex-1 flex-col items-center">
        <span className="sr-only">Ciclo</span>
        <select
          value={atualId}
          onChange={(e) => ir(e.target.value, "lista")}
          className="w-full cursor-pointer appearance-none bg-transparent text-center text-lg font-semibold tracking-tight outline-none focus-visible:underline"
        >
          {ciclos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        {carregando ? (
          <span className="text-xs text-muted-foreground" aria-live="polite">
            Carregando…
          </span>
        ) : (
          atual && (
            <span className="text-xs text-muted-foreground">
              {formatarData(atual.data_inicio)} a {formatarData(atual.data_fim)}
            </span>
          )
        )}
      </label>
      <Button
        variant="ghost"
        size="icon"
        className="size-10"
        disabled={!proximo}
        carregando={carregando && origem === "proximo"}
        onClick={() => proximo && ir(proximo.id, "proximo")}
        aria-label={proximo ? `Próximo ciclo: ${proximo.nome}` : "Não há próximo ciclo"}
      >
        <ChevronRight aria-hidden />
      </Button>
    </div>
  );
}
