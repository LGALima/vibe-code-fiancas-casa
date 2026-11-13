"use client";

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
  const ir = (id: string) => router.push(`/?ciclo=${id}`);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-10"
        disabled={!anterior}
        onClick={() => anterior && ir(anterior.id)}
        aria-label={anterior ? `Ciclo anterior: ${anterior.nome}` : "Não há ciclo anterior"}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <label className="relative flex flex-1 flex-col items-center">
        <span className="sr-only">Ciclo</span>
        <select
          value={atualId}
          onChange={(e) => ir(e.target.value)}
          className="w-full cursor-pointer appearance-none bg-transparent text-center text-lg font-semibold tracking-tight outline-none focus-visible:underline"
        >
          {ciclos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        {atual && (
          <span className="text-xs text-muted-foreground">
            {formatarData(atual.data_inicio)} a {formatarData(atual.data_fim)}
          </span>
        )}
      </label>
      <Button
        variant="ghost"
        size="icon"
        className="size-10"
        disabled={!proximo}
        onClick={() => proximo && ir(proximo.id)}
        aria-label={proximo ? `Próximo ciclo: ${proximo.nome}` : "Não há próximo ciclo"}
      >
        <ChevronRight aria-hidden />
      </Button>
    </div>
  );
}
