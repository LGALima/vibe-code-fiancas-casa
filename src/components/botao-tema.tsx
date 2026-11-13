"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assinarTema,
  lerPreferencia,
  proximaPreferencia,
  salvarPreferencia,
  type PreferenciaTema,
} from "@/lib/tema";
import { cn } from "@/lib/utils";

const ROTULO: Record<PreferenciaTema, string> = {
  sistema: "Tema do sistema",
  claro: "Tema claro",
  escuro: "Tema escuro",
};

const ICONE = { sistema: Monitor, claro: Sun, escuro: Moon } as const;

/** Alterna sistema → claro → escuro. Com `comRotulo`, mostra o nome ao lado. */
export function BotaoTema({ comRotulo = false, className }: { comRotulo?: boolean; className?: string }) {
  const pref = useSyncExternalStore(assinarTema, lerPreferencia, () => "sistema" as const);
  const proxima = proximaPreferencia(pref);
  const Icone = ICONE[pref];

  return (
    <Button
      type="button"
      variant="ghost"
      size={comRotulo ? "sm" : "icon"}
      className={cn(comRotulo ? "justify-start" : "size-9", className)}
      onClick={() => salvarPreferencia(proxima)}
      aria-label={`${ROTULO[pref]}. Mudar para: ${ROTULO[proxima].toLowerCase()}`}
      title={`${ROTULO[pref]} (tocar para mudar)`}
    >
      <Icone aria-hidden />
      {comRotulo && <span>{ROTULO[pref]}</span>}
    </Button>
  );
}
