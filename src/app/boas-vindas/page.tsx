import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BotaoSair } from "@/components/botao-sair";
import { TelaAuth } from "@/components/tela-auth";
import { obterEspacoAtivo } from "@/lib/espaco";
import { BoasVindasForm } from "./boas-vindas-form";

export const metadata: Metadata = {
  title: "Boas-vindas · Finanças da Casa",
};

export default function BoasVindasPage() {
  return (
    <TelaAuth>
      <Suspense>
        <SemEspaco>
          <BoasVindasForm />
        </SemEspaco>
      </Suspense>
      <BotaoSair formClassName="mt-6" />
    </TelaAuth>
  );
}

/** Quem já tem espaço não precisa desta tela. */
async function SemEspaco({ children }: { children: React.ReactNode }) {
  const espaco = await obterEspacoAtivo();
  if (espaco) redirect("/");
  return children;
}
