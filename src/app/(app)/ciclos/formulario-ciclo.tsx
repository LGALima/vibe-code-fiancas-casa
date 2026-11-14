"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Pencil, Plus, TriangleAlert } from "lucide-react";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fimDoCiclo, nomeDoCiclo, type SugestaoCiclo } from "@/lib/dominio/ciclos";
import { ehDataValida, formatarData } from "@/lib/dominio/datas";
import { createClient } from "@/lib/supabase/client";
import { traduzirErroBanco } from "@/lib/supabase/erros";
import { cicloSchema, type CicloDados } from "@/lib/validacoes/ciclo";

export type CicloExistente = SugestaoCiclo & { id: string; qtdLancamentos: number };

export function NovoCiclo({
  espacoId,
  sugestao,
  existentes,
  secundario = false,
}: {
  espacoId: string;
  sugestao: SugestaoCiclo;
  existentes: CicloExistente[];
  /** Quando já há ciclos, o principal é "Criar próximo ciclo". */
  secundario?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <Button variant={secundario ? "outline" : "default"} onClick={() => setAberto(true)}>
        <Plus aria-hidden />
        {secundario ? "Ciclo avulso" : "Novo ciclo"}
      </Button>
      {aberto && (
        <Formulario
          espacoId={espacoId}
          valores={sugestao}
          existentes={existentes}
          onConcluir={() => setAberto(false)}
        />
      )}
    </Dialog>
  );
}

export function EditarCiclo({
  espacoId,
  ciclo,
  existentes,
}: {
  espacoId: string;
  ciclo: CicloExistente;
  existentes: CicloExistente[];
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <Button
        variant="ghost"
        size="icon"
        className="size-10 shrink-0"
        onClick={() => setAberto(true)}
        aria-label={`Editar o ciclo ${ciclo.nome}`}
      >
        <Pencil aria-hidden />
      </Button>
      {aberto && (
        <Formulario
          espacoId={espacoId}
          ciclo={ciclo}
          valores={ciclo}
          existentes={existentes.filter((c) => c.id !== ciclo.id)}
          onConcluir={() => setAberto(false)}
        />
      )}
    </Dialog>
  );
}

function Formulario({
  espacoId,
  ciclo,
  valores,
  existentes,
  onConcluir,
}: {
  espacoId: string;
  /** Presente ao editar. */
  ciclo?: CicloExistente;
  valores: SugestaoCiclo;
  existentes: CicloExistente[];
  onConcluir: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  // Salvar/excluir e a atualização da tela ficam numa transição: o botão só
  // volta ao normal quando a tela já mostra o resultado.
  const [ocupado, iniciar] = useTransition();
  const [acao, setAcao] = useState<"salvar" | "excluir">("salvar");
  const schema = useMemo(() => cicloSchema(existentes), [existentes]);
  const {
    register,
    handleSubmit,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<CicloDados>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: valores.nome,
      data_inicio: valores.data_inicio,
      data_fim: valores.data_fim,
    },
  });

  // Num ciclo novo, mudar o início puxa fim e nome — a menos que a pessoa já
  // os tenha editado. Ao editar, cada campo fica como a pessoa deixar.
  const inicioRegistrado = register("data_inicio", {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (ciclo) return;
      const inicio = e.target.value;
      if (!ehDataValida(inicio)) return;
      if (!getFieldState("data_fim").isDirty) setValue("data_fim", fimDoCiclo(inicio));
      if (!getFieldState("nome").isDirty) setValue("nome", nomeDoCiclo(inicio));
    },
  });

  function mensagemDoBanco(error: Parameters<typeof traduzirErroBanco>[0]) {
    // Recusas do trigger (lançamentos sem ciclo) já vêm em português.
    return error.code === "P0001" ? error.message : traduzirErroBanco(error, "Já existe um ciclo assim.");
  }

  async function salvar(dados: CicloDados) {
    setErro(undefined);
    setAcao("salvar");
    const supabase = createClient();
    if (ciclo) {
      const { error } = await supabase.from("ciclos").update(dados).eq("id", ciclo.id);
      if (error) {
        setErro(mensagemDoBanco(error));
        return;
      }
      iniciar(() => {
        router.refresh();
        onConcluir();
      });
      return;
    }
    const { data, error } = await supabase
      .from("ciclos")
      .insert({ ...dados, espaco_id: espacoId })
      .select("id")
      .single();
    if (error) {
      setErro(mensagemDoBanco(error));
      return;
    }
    iniciar(() => {
      router.push(`/?ciclo=${data.id}`);
      router.refresh();
      onConcluir();
    });
  }

  function excluir() {
    if (!ciclo) return;
    setErro(undefined);
    setAcao("excluir");
    iniciar(async () => {
      const { error } = await createClient().from("ciclos").delete().eq("id", ciclo.id);
      if (error) {
        setErro(mensagemDoBanco(error));
        return;
      }
      iniciar(() => {
        router.refresh();
        onConcluir();
      });
    });
  }

  const excluindo = ocupado && acao === "excluir";
  const salvando = isSubmitting || (ocupado && acao === "salvar");

  if (ciclo && confirmandoExclusao) {
    const n = ciclo.qtdLancamentos;
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-destructive" aria-hidden />
            Excluir {ciclo.nome}?
          </DialogTitle>
          <DialogDescription>
            {n === 0
              ? "O ciclo não tem lançamentos."
              : `Isso apaga também ${n === 1 ? "o lançamento" : `os ${n} lançamentos`} deste ciclo (${formatarData(ciclo.data_inicio)} a ${formatarData(ciclo.data_fim)}).`}{" "}
            Não dá para desfazer.
          </DialogDescription>
        </DialogHeader>
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" className="h-10" onClick={() => setConfirmandoExclusao(false)} disabled={excluindo}>
            Cancelar
          </Button>
          <Button
            className="h-10 bg-destructive text-white hover:bg-destructive/90"
            onClick={excluir}
            carregando={excluindo}
          >
            {excluindo
              ? "Excluindo…"
              : n === 0
                ? "Excluir ciclo"
                : `Excluir ciclo e ${n} ${n === 1 ? "lançamento" : "lançamentos"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{ciclo ? "Editar ciclo" : "Novo ciclo"}</DialogTitle>
        <DialogDescription>
          {ciclo
            ? "Ao mudar as datas, os lançamentos passam para o ciclo que contém a data de cada um."
            : "Sugerido pelo dia de início configurado. Ajuste as datas se este mês fechar em outro dia."}
        </DialogDescription>
      </DialogHeader>
      <form id="form-ciclo" onSubmit={handleSubmit(salvar)} noValidate className="flex flex-col gap-4">
        <Campo id="nome-ciclo" rotulo="Nome" autoComplete="off" erro={errors.nome?.message} {...register("nome")} />
        <div className="grid grid-cols-2 gap-3">
          <Campo id="inicio-ciclo" rotulo="Início" type="date" erro={errors.data_inicio?.message} {...inicioRegistrado} />
          <Campo id="fim-ciclo" rotulo="Fim" type="date" erro={errors.data_fim?.message} {...register("data_fim")} />
        </div>
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
      </form>
      <DialogFooter className="gap-2">
        {ciclo && (
          <Button
            type="button"
            variant="destructive"
            className="h-10 sm:mr-auto"
            onClick={() => setConfirmandoExclusao(true)}
            disabled={salvando}
          >
            Excluir ciclo
          </Button>
        )}
        <Button type="submit" form="form-ciclo" className="h-10" carregando={salvando}>
          {salvando ? (ciclo ? "Salvando…" : "Criando…") : ciclo ? "Salvar" : "Criar ciclo"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
