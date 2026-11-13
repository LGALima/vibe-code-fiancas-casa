"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { traduzirErroAuth } from "@/lib/supabase/erros";
import {
  redefinirSenhaSchema,
  type RedefinirSenhaDados,
} from "@/lib/validacoes/auth";

export function RedefinirSenhaForm() {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RedefinirSenhaDados>({
    resolver: zodResolver(redefinirSenhaSchema),
  });

  async function salvar({ senha }: RedefinirSenhaDados) {
    setErro(undefined);
    const { error } = await createClient().auth.updateUser({
      password: senha,
    });
    if (error) {
      setErro(traduzirErroAuth(error));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Criar nova senha</CardTitle>
        <CardDescription>Escolha a nova senha da sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(salvar)}
          noValidate
          className="flex flex-col gap-4"
        >
          <Campo
            id="senha"
            rotulo="Nova senha"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
            erro={errors.senha?.message}
            {...register("senha")}
          />
          <Campo
            id="confirmacao"
            rotulo="Confirme a nova senha"
            type="password"
            autoComplete="new-password"
            erro={errors.confirmacao?.message}
            {...register("confirmacao")}
          />
          <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar nova senha"}
          </Button>
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
