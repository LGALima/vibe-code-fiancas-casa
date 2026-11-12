"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { destinoSeguro } from "@/lib/destino-seguro";
import { createClient } from "@/lib/supabase/client";

type Estado =
  | { tipo: "ocioso" }
  | { tipo: "enviando" }
  | { tipo: "enviado"; email: string }
  | { tipo: "erro"; mensagem: string };

const ERROS: Record<string, string> = {
  "link-invalido": "O link de acesso é inválido ou expirou. Peça um novo.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = destinoSeguro(searchParams.get("next"));
  const erroDaUrl = searchParams.get("erro");

  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>(() =>
    erroDaUrl
      ? {
          tipo: "erro",
          mensagem:
            ERROS[erroDaUrl] ?? "Não foi possível entrar. Tente de novo.",
        }
      : { tipo: "ocioso" },
  );
  const [entrandoComGoogle, setEntrandoComGoogle] = useState(false);

  function urlDeRetorno() {
    const url = new URL("/auth/callback", window.location.origin);
    if (next !== "/") url.searchParams.set("next", next);
    return url.toString();
  }

  async function enviarLinkMagico(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEstado({ tipo: "enviando" });

    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: urlDeRetorno() },
    });

    if (error) {
      setEstado({
        tipo: "erro",
        mensagem:
          "Não foi possível enviar o link. Confira o e-mail e tente de novo.",
      });
      return;
    }
    setEstado({ tipo: "enviado", email });
  }

  async function entrarComGoogle() {
    setEntrandoComGoogle(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlDeRetorno() },
    });
    if (error) {
      setEntrandoComGoogle(false);
      setEstado({
        tipo: "erro",
        mensagem: "Não foi possível entrar com o Google. Tente de novo.",
      });
    }
  }

  if (estado.tipo === "enviado") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Confira seu e-mail</CardTitle>
          <CardDescription>
            Enviamos um link de acesso para{" "}
            <strong className="text-foreground">{estado.email}</strong>. Abra o
            link neste mesmo navegador para entrar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="h-10 w-full"
            onClick={() => setEstado({ tipo: "ocioso" })}
          >
            Usar outro e-mail
          </Button>
        </CardContent>
      </Card>
    );
  }

  const enviando = estado.tipo === "enviando";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Receba um link de acesso por e-mail ou use sua conta Google.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={enviarLinkMagico} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              required
              className="h-10 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={enviando}
            />
          </div>
          <Button type="submit" className="h-10 w-full" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar link de acesso"}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          onClick={entrarComGoogle}
          disabled={entrandoComGoogle}
        >
          <GoogleIcon />
          {entrandoComGoogle ? "Abrindo o Google…" : "Entrar com Google"}
        </Button>

        {estado.tipo === "erro" && (
          <p role="alert" className="text-sm text-destructive">
            {estado.mensagem}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
