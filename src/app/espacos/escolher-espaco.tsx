"use client";

import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { CriarOuEntrarEspaco } from "@/components/formularios-espaco";
import { ListaEspacos, type EspacoOpcao } from "@/components/seletor-espaco";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EscolherEspaco({
  espacos,
  ultimoId,
  destino,
  nomeExibicaoPadrao,
}: {
  espacos: EspacoOpcao[];
  ultimoId: string | null;
  destino: string;
  nomeExibicaoPadrao: string;
}) {
  const [novo, setNovo] = useState(false);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{novo ? "Novo espaço" : "Qual espaço você quer usar?"}</CardTitle>
        <CardDescription>
          {novo
            ? "Crie um espaço separado ou entre no de outra pessoa com o código de convite."
            : "Dá para trocar depois: toque no nome do espaço, no topo da tela (celular) ou na barra lateral (computador)."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {novo ? (
          <>
            <CriarOuEntrarEspaco
              nomeEspacoPadrao=""
              nomeExibicaoPadrao={nomeExibicaoPadrao}
            />
            <Button variant="ghost" className="h-9 self-start" onClick={() => setNovo(false)}>
              <ArrowLeft aria-hidden />
              Voltar para a lista
            </Button>
          </>
        ) : (
          <>
            <ListaEspacos
              espacos={espacos}
              ativoId={ultimoId}
              destino={destino}
              rotuloAtivo="Último usado"
            />
            <Button variant="outline" className="h-10" onClick={() => setNovo(true)}>
              <Plus aria-hidden />
              Criar ou entrar em outro espaço
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
