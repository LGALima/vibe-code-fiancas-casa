import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { sair } from "@/app/(app)/actions";
import { TelaAuth } from "@/components/tela-auth";
import { Button } from "@/components/ui/button";
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
      <form action={sair} className="mt-6">
        <Button type="submit" variant="ghost" size="sm">
          <LogOut aria-hidden />
          Sair
        </Button>
      </form>
    </TelaAuth>
  );
}

/** Quem já tem espaço não precisa desta tela. */
async function SemEspaco({ children }: { children: React.ReactNode }) {
  const espaco = await obterEspacoAtivo();
  if (espaco) redirect("/");
  return children;
}
