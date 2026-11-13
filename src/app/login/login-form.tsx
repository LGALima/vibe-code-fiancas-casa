"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { destinoSeguro } from "@/lib/destino-seguro";
import { createClient } from "@/lib/supabase/client";
import { traduzirErroAuth } from "@/lib/supabase/erros";
import {
  cadastroSchema,
  entrarSchema,
  type CadastroDados,
  type EntrarDados,
} from "@/lib/validacoes/auth";
import { cn } from "@/lib/utils";

type Modo = "entrar" | "cadastrar";

const ERROS_DA_URL: Record<string, string> = {
  "link-invalido": "O link é inválido ou expirou. Tente de novo.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = destinoSeguro(searchParams.get("next"));
  const erroDaUrl = searchParams.get("erro");

  const [modo, setModo] = useState<Modo>("entrar");
  const [emailConfirmacao, setEmailConfirmacao] = useState<string | null>(null);

  if (emailConfirmacao) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Confirme seu e-mail</CardTitle>
          <CardDescription>
            Enviamos um link de confirmação para{" "}
            <strong className="text-foreground">{emailConfirmacao}</strong>.
            Abra o link para ativar a conta e depois entre com sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="h-10 w-full"
            onClick={() => {
              setEmailConfirmacao(null);
              setModo("entrar");
            }}
          >
            Voltar para entrar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div
          role="tablist"
          aria-label="Entrar ou criar conta"
          className="mb-2 grid grid-cols-2 rounded-lg bg-muted p-1"
        >
          {(
            [
              ["entrar", "Entrar"],
              ["cadastrar", "Criar conta"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={modo === valor}
              onClick={() => setModo(valor)}
              className={cn(
                "h-9 rounded-md text-sm font-medium transition-colors",
                modo === valor
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <CardTitle>{modo === "entrar" ? "Entrar" : "Criar conta"}</CardTitle>
        <CardDescription>
          {modo === "entrar"
            ? "Use o e-mail e a senha da sua conta."
            : "Cadastre um e-mail e uma senha para acessar o app."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {modo === "entrar" ? (
          <EntrarForm
            next={next}
            erroInicial={erroDaUrl ? ERROS_DA_URL[erroDaUrl] : undefined}
          />
        ) : (
          <CadastroForm next={next} onEnviado={setEmailConfirmacao} />
        )}
      </CardContent>
    </Card>
  );
}

function EntrarForm({
  next,
  erroInicial,
}: {
  next: string;
  erroInicial?: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | undefined>(erroInicial);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EntrarDados>({ resolver: zodResolver(entrarSchema) });

  async function entrar({ email, senha }: EntrarDados) {
    setErro(undefined);
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) {
      setErro(traduzirErroAuth(error));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(entrar)}
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
      <div className="flex flex-col gap-2">
        <Campo
          id="senha"
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          erro={errors.senha?.message}
          {...register("senha")}
        />
        <Link
          href="/recuperar-senha"
          className="self-end text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Entrando…" : "Entrar"}
      </Button>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </form>
  );
}

function CadastroForm({
  next,
  onEnviado,
}: {
  next: string;
  onEnviado: (email: string) => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroDados>({ resolver: zodResolver(cadastroSchema) });

  async function cadastrar({ email, senha }: CadastroDados) {
    setErro(undefined);
    const confirmacao = new URL("/auth/callback", window.location.origin);
    if (next !== "/") confirmacao.searchParams.set("next", next);

    const { data, error } = await createClient().auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: confirmacao.toString() },
    });
    if (error) {
      setErro(traduzirErroAuth(error));
      return;
    }
    // Com confirmação de e-mail ligada, um e-mail já cadastrado volta sem
    // identidades (o Supabase não revela que a conta existe).
    if (data.user && data.user.identities?.length === 0) {
      setErro("Já existe uma conta com este e-mail. Tente entrar.");
      return;
    }
    if (data.session) {
      // Confirmação de e-mail desligada no Supabase: já entra direto.
      router.replace(next);
      router.refresh();
      return;
    }
    onEnviado(email);
  }

  return (
    <form
      onSubmit={handleSubmit(cadastrar)}
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
      <Campo
        id="senha"
        rotulo="Senha"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
        erro={errors.senha?.message}
        {...register("senha")}
      />
      <Campo
        id="confirmacao"
        rotulo="Confirme a senha"
        type="password"
        autoComplete="new-password"
        erro={errors.confirmacao?.message}
        {...register("confirmacao")}
      />
      <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Criando conta…" : "Criar conta"}
      </Button>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </form>
  );
}
