import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";
import { PaginaVazia } from "@/components/pagina-vazia";

export const metadata: Metadata = { title: "Análises · Finanças da Casa" };

export default function AnalisesPage() {
  return (
    <PaginaVazia
      titulo="Análises"
      descricao="Aqui vão ficar os gráficos por categoria, dia e forma de pagamento."
      Icone={ChartColumn}
    />
  );
}
