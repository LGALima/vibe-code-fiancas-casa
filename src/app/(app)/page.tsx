import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { IconeLink } from "@/components/icone-link";
import { Button } from "@/components/ui/button";
import {
  carregarCadastros,
  carregarCiclos,
  carregarLancamentosDoCiclo,
  carregarMembros,
  carregarResumo,
} from "@/lib/dados";
import { cicloInicial } from "@/lib/dominio/ciclos";
import { hoje } from "@/lib/dominio/datas";
import { obterEspacoAtivo } from "@/lib/espaco";
import { ListaLancamentos } from "./lista-lancamentos";
import { ResumoCiclo } from "./resumo-ciclo";
import { SeletorCiclo } from "./seletor-ciclo";

export default function InicioPage({ searchParams }: PageProps<"/">) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="sr-only">Início</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const espaco = await obterEspacoAtivo();
  if (!espaco) return null;
  const params = await searchParams;
  const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const pedido = primeiro(params.ciclo);

  const [ciclos, cadastros, membros] = await Promise.all([
    carregarCiclos(espaco.id),
    carregarCadastros(espaco.id),
    carregarMembros(espaco.id),
  ]);

  const dataHoje = hoje();
  const ciclo = ciclos.find((c) => c.id === pedido) ?? cicloInicial(ciclos, dataHoje);

  if (!ciclo) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Ainda não há ciclos. O ciclo é o seu fechamento de mês: o período em
          que você vê se o dinheiro sobrou ou faltou.
        </p>
        <Button nativeButton={false} render={<Link href="/ciclos" />}>
          <IconeLink />
          Criar o primeiro ciclo
        </Button>
      </div>
    );
  }

  // Filtros que chegam de Análises (tocar numa barra de categoria).
  const categoriaPedida = cadastros.categorias.some((c) => c.id === primeiro(params.categoria))
    ? primeiro(params.categoria)
    : undefined;
  const pessoaPedida = membros.some((m) => m.userId === primeiro(params.pessoa))
    ? primeiro(params.pessoa)
    : undefined;

  const [lancamentos, resumo] = await Promise.all([
    carregarLancamentosDoCiclo(espaco.id, ciclo.id),
    carregarResumo(ciclo.id),
  ]);

  return (
    <>
      <SeletorCiclo ciclos={ciclos} atualId={ciclo.id} />
      <ResumoCiclo resumo={resumo} ciclo={ciclo} hoje={dataHoje} />
      <ListaLancamentos
        // A chave inclui os filtros vindos da URL para reaplicá-los ao navegar.
        key={`${ciclo.id}:${categoriaPedida ?? ""}:${pessoaPedida ?? ""}`}
        lancamentos={lancamentos}
        categorias={cadastros.categorias}
        formas={cadastros.formas}
        membros={membros}
        userId={espaco.userId}
        hoje={dataHoje}
        filtrosIniciais={{ categoria: categoriaPedida ?? "", pessoa: pessoaPedida ?? "" }}
      />
      <Button
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 size-14 rounded-full shadow-lg md:right-8 md:bottom-8"
        nativeButton={false} render={<Link href="/lancar" aria-label="Lançar" />}
      >
        <IconeLink className="size-6">
          <Plus className="size-6" aria-hidden />
        </IconeLink>
      </Button>
    </>
  );
}
