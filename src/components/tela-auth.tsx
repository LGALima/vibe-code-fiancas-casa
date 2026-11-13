import type { ReactNode } from "react";
import { Wallet } from "lucide-react";
import { BotaoTema } from "@/components/botao-tema";

/** Moldura das telas de autenticação (login, recuperar e redefinir senha). */
export function TelaAuth({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <BotaoTema className="absolute top-3 right-3" />
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Wallet className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Finanças da Casa</h1>
      </div>
      {children}
    </main>
  );
}
