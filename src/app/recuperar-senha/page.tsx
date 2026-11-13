import type { Metadata } from "next";
import { TelaAuth } from "@/components/tela-auth";
import { RecuperarSenhaForm } from "./recuperar-senha-form";

export const metadata: Metadata = {
  title: "Recuperar senha · Finanças da Casa",
};

export default function RecuperarSenhaPage() {
  return (
    <TelaAuth>
      <RecuperarSenhaForm />
    </TelaAuth>
  );
}
