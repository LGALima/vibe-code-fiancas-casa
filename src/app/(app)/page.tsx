import { House } from "lucide-react";
import { PaginaVazia } from "@/components/pagina-vazia";

export default function InicioPage() {
  return (
    <PaginaVazia
      titulo="Início"
      descricao="Aqui vão aparecer os totais do ciclo atual e os lançamentos."
      Icone={House}
    />
  );
}
