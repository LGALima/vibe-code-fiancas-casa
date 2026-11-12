import type { Metadata } from "next";
import { RefreshCw } from "lucide-react";
import { PaginaVazia } from "@/components/pagina-vazia";

export const metadata: Metadata = { title: "Ciclos · Finanças da Casa" };

export default function CiclosPage() {
  return (
    <PaginaVazia
      titulo="Ciclos"
      descricao="Aqui vai ficar a lista de ciclos e o botão para criar o próximo."
      Icone={RefreshCw}
    />
  );
}
