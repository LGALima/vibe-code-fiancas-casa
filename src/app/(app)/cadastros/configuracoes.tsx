"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { traduzirErroBanco } from "@/lib/supabase/erros";
import {
  configuracoesSchema,
  type ConfiguracoesDados,
  type ConfiguracoesEntrada,
} from "@/lib/validacoes/cadastros";

const DIAS = Array.from({ length: 28 }, (_, i) => i + 1);

export function Configuracoes({
  espacoId,
  diaInicioCiclo,
  moeda,
}: {
  espacoId: string;
  diaInicioCiclo: number;
  moeda: string;
}) {
  const router = useRouter();
  const [atualizando, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string }>();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ConfiguracoesEntrada, unknown, ConfiguracoesDados>({
    resolver: zodResolver(configuracoesSchema),
    defaultValues: { diaInicioCiclo },
  });

  async function salvar({ diaInicioCiclo: dia }: ConfiguracoesDados) {
    setMensagem(undefined);
    const { error } = await createClient()
      .from("configuracoes")
      .update({ dia_inicio_ciclo: dia })
      .eq("espaco_id", espacoId);
    if (error) {
      setMensagem({ tipo: "erro", texto: traduzirErroBanco(error) });
      return;
    }
    reset({ diaInicioCiclo: dia });
    iniciar(() => {
      router.refresh();
      setMensagem({ tipo: "ok", texto: "Configurações salvas." });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
        <CardDescription>Valem para os dois membros do espaço.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(salvar)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dia-inicio">Dia de início do ciclo</Label>
            <select
              id="dia-inicio"
              aria-invalid={errors.diaInicioCiclo ? true : undefined}
              aria-describedby="dia-inicio-ajuda"
              className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
              {...register("diaInicioCiclo")}
            >
              {DIAS.map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </select>
            <p id="dia-inicio-ajuda" className="text-xs text-muted-foreground">
              O dia em que costuma entrar a 2ª parte do salário. Vai de 1 a 28,
              para existir em todos os meses. Ciclos já criados não mudam.
            </p>
            {errors.diaInicioCiclo && (
              <p className="text-sm text-destructive">{errors.diaInicioCiclo.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Moeda</span>
            <span className="font-medium">{moeda === "BRL" ? "Real (R$)" : moeda}</span>
          </div>

          <Button
            type="submit"
            className="h-10"
            carregando={isSubmitting || atualizando}
            disabled={!isDirty}
          >
            {isSubmitting || atualizando ? "Salvando…" : "Salvar"}
          </Button>
          {mensagem && (
            <p
              role={mensagem.tipo === "erro" ? "alert" : "status"}
              className={mensagem.tipo === "erro" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
            >
              {mensagem.texto}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
