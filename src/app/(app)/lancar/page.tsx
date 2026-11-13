import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarCadastros, carregarCiclos, carregarLancamento } from "@/lib/dados";
import { hoje } from "@/lib/dominio/datas";
import { obterEspacoAtivo } from "@/lib/espaco";
import { FormularioLancamento } from "./formulario-lancamento";

export const metadata: Metadata = { title: "Lançar · Finanças da Casa" };

export default function LancarPage({ searchParams }: PageProps<"/lancar">) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

function primeiro(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/lancar">["searchParams"] }) {
  const espaco = await obterEspacoAtivo();
  if (!espaco) return null;
  const params = await searchParams;
  const editarId = primeiro(params.editar);
  const duplicarId = primeiro(params.duplicar);
  const origemId = editarId ?? duplicarId;

  const [ciclos, cadastros, lancamento] = await Promise.all([
    carregarCiclos(espaco.id),
    carregarCadastros(espaco.id),
    origemId ? carregarLancamento(espaco.id, origemId) : Promise.resolve(null),
  ]);

  const titulo = editarId ? "Editar lançamento" : duplicarId ? "Duplicar lançamento" : "Lançar";

  if (origemId && !lancamento) {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        <p className="text-sm text-muted-foreground">
          Lançamento não encontrado.{" "}
          <Link href="/lancar" className="underline">
            Fazer um novo
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
      {ciclos.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Antes de lançar, crie o primeiro ciclo em{" "}
          <Link href="/ciclos" className="underline">
            Ciclos
          </Link>
          .
        </p>
      ) : (
        <FormularioLancamento
          key={origemId ?? "novo"}
          espacoId={espaco.id}
          hoje={hoje()}
          ciclos={ciclos}
          categorias={cadastros.categorias}
          formas={cadastros.formas}
          origem={
            lancamento
              ? { modo: editarId ? "editar" : "duplicar", lancamento }
              : undefined
          }
        />
      )}
    </>
  );
}
