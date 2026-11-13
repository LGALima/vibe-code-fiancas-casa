import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { PaginaVazia } from "@/components/pagina-vazia";

export const metadata: Metadata = { title: "Cadastros · Finanças da Casa" };

export default function CadastrosPage() {
  return (
    <PaginaVazia
      titulo="Cadastros"
      descricao="Aqui vão ficar categorias, formas de pagamento e configurações."
      Icone={ListChecks}
    />
  );
}
