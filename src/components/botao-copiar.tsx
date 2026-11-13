"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [estado, setEstado] = useState<"ocioso" | "copiado" | "erro">("ocioso");

  useEffect(() => {
    if (estado === "ocioso") return;
    const t = setTimeout(() => setEstado("ocioso"), 2000);
    return () => clearTimeout(t);
  }, [estado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
    } catch {
      setEstado("erro");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10"
      onClick={copiar}
      aria-label={rotulo}
    >
      {estado === "copiado" ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite">
        {estado === "copiado" ? "Copiado!" : estado === "erro" ? "Não deu" : "Copiar"}
      </span>
    </Button>
  );
}
