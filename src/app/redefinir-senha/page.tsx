import type { Metadata } from "next";
import { TelaAuth } from "@/components/tela-auth";
import { RedefinirSenhaForm } from "./redefinir-senha-form";

export const metadata: Metadata = {
  title: "Nova senha · Finanças da Casa",
};

/**
 * Protegida pelo proxy: só chega aqui quem abriu o link de recuperação
 * (que cria a sessão em /auth/callback) ou quem já está logado.
 */
export default function RedefinirSenhaPage() {
  return (
    <TelaAuth>
      <RedefinirSenhaForm />
    </TelaAuth>
  );
}
