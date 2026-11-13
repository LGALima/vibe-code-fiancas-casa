"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
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
import {
  fimDoCiclo,
  nomeDoCiclo,
  type SugestaoCiclo,
} from "@/lib/dominio/ciclos";
import { ehDataValida } from "@/lib/dominio/datas";
import { createClient } from "@/lib/supabase/client";
import { traduzirErroBanco } from "@/lib/supabase/erros";
import { cicloSchema, type CicloDados } from "@/lib/validacoes/ciclo";

type Existente = SugestaoCiclo & { id: string };

export function NovoCiclo({
  espacoId,
  sugestao,
  existentes,
}: {
  espacoId: string;
  sugestao: SugestaoCiclo;
  existentes: Existente[];
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <Button onClick={() => setAberto(true)}>
        <Plus aria-hidden />
        Novo ciclo
      </Button>
      {aberto && (
        <Formulario
          espacoId={espacoId}
          sugestao={sugestao}
          existentes={existentes}
          onConcluir={() => setAberto(false)}
        />
      )}
    </Dialog>
  );
}

function Formulario({
  espacoId,
  sugestao,
  existentes,
  onConcluir,
}: {
  espacoId: string;
  sugestao: SugestaoCiclo;
  existentes: Existente[];
  onConcluir: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  const schema = useMemo(() => cicloSchema(existentes), [existentes]);
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<CicloDados>({
    resolver: zodResolver(schema),
    defaultValues: sugestao,
  });

  // Ao mudar o início, acompanha fim e nome — a menos que a pessoa já os tenha editado.
  const inicioRegistrado = register("data_inicio", {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const inicio = e.target.value;
      if (!ehDataValida(inicio)) return;
      if (!getFieldState("data_fim").isDirty) {
        setValue("data_fim", fimDoCiclo(inicio));
      }
      if (!getFieldState("nome").isDirty) {
        setValue("nome", nomeDoCiclo(inicio, getValues("data_fim")));
      }
    },
  });

  async function salvar(dados: CicloDados) {
    setErro(undefined);
    const { data, error } = await createClient()
      .from("ciclos")
      .insert({ ...dados, espaco_id: espacoId })
      .select("id")
      .single();
    if (error) {
      setErro(traduzirErroBanco(error, "Já existe um ciclo assim."));
      return;
    }
    onConcluir();
    router.push(`/?ciclo=${data.id}`);
    router.refresh();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo ciclo</DialogTitle>
        <DialogDescription>
          Sugerido pelo dia de início configurado. Ajuste as datas se o salário
          entrou em outro dia.
        </DialogDescription>
      </DialogHeader>
      <form id="form-ciclo" onSubmit={handleSubmit(salvar)} noValidate className="flex flex-col gap-4">
        <Campo id="nome-ciclo" rotulo="Nome" autoComplete="off" erro={errors.nome?.message} {...register("nome")} />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            id="inicio-ciclo"
            rotulo="Início"
            type="date"
            erro={errors.data_inicio?.message}
            {...inicioRegistrado}
          />
          <Campo
            id="fim-ciclo"
            rotulo="Fim"
            type="date"
            erro={errors.data_fim?.message}
            {...register("data_fim")}
          />
        </div>
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
      </form>
      <DialogFooter>
        <Button type="submit" form="form-ciclo" className="h-10" disabled={isSubmitting}>
          {isSubmitting ? "Criando…" : "Criar ciclo"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
