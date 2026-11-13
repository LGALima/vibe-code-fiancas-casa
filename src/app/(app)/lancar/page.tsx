import type { Metadata } from "next";
import { PlusCircle } from "lucide-react";
import { PaginaVazia } from "@/components/pagina-vazia";

export const metadata: Metadata = { title: "Lançar · Finanças da Casa" };

export default function LancarPage() {
  return (
    <PaginaVazia
      titulo="Lançar"
      descricao="Aqui vai ficar o formulário rápido de gasto ou ganho."
      Icone={PlusCircle}
    />
  );
}
