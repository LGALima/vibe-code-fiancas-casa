"use client";

import { useRouter } from "next/navigation";
import { CriarOuEntrarEspaco } from "@/components/formularios-espaco";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BoasVindasForm() {
  const router = useRouter();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Boas-vindas!</CardTitle>
        <CardDescription>
          O espaço é a sua casa: vocês dois entram nele e veem os mesmos
          ciclos, lançamentos e cadastros.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CriarOuEntrarEspaco
          rotuloCriar="Criar meu espaço"
          onConcluir={() => {
            router.replace("/");
            router.refresh();
          }}
        />
      </CardContent>
    </Card>
  );
}
