"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { sair } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Formulário de sair; o botão mostra "Saindo…" até a tela de login abrir. */
export function BotaoSair({ className, formClassName }: { className?: string; formClassName?: string }) {
  return (
    <form action={sair} className={formClassName}>
      <Botao className={className} />
    </form>
  );
}

function Botao({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" carregando={pending} className={cn(className)}>
      <LogOut aria-hidden />
      {pending ? "Saindo…" : "Sair"}
    </Button>
  );
}
