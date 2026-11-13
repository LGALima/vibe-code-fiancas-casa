"use client";

import { useState } from "react";
import Link from "next/link";
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
  recuperarSenhaSchema,
  type RecuperarSenhaDados,
} from "@/lib/validacoes/auth";

export function RecuperarSenhaForm() {
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const [erro, setErro] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecuperarSenhaDados>({
    resolver: zodResolver(recuperarSenhaSchema),
  });

  async function enviar({ email }: RecuperarSenhaDados) {
    setErro(undefined);
    const retorno = new URL("/auth/callback", window.location.origin);
    retorno.searchParams.set("next", "/redefinir-senha");

    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: retorno.toString(),
    });
    if (error) {
      setErro(traduzirErroAuth(error));
      return;
    }
    setEnviadoPara(email);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          {enviadoPara ? (
            <>
              Se existir uma conta com{" "}
              <strong className="text-foreground">{enviadoPara}</strong>, você
              vai receber um link para criar uma nova senha. Abra o link neste
              mesmo navegador.
            </>
          ) : (
            "Informe o e-mail da conta. Vamos enviar um link para você criar uma nova senha."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!enviadoPara && (
          <form
            onSubmit={handleSubmit(enviar)}
            noValidate
            className="flex flex-col gap-4"
          >
            <Campo
              id="email"
              rotulo="E-mail"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              erro={errors.email?.message}
              {...register("email")}
            />
            <Button
              type="submit"
              className="h-10 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando…" : "Enviar link"}
            </Button>
            {erro && (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            )}
          </form>
        )}
        <Link
          href="/login"
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Voltar para entrar
        </Link>
      </CardContent>
    </Card>
  );
}
