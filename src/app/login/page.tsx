import type { Metadata } from "next";
import { Suspense } from "react";
import { Wallet } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · Finanças da Casa",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Wallet className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Finanças da Casa
        </h1>
        <p className="text-sm text-muted-foreground">
          Entre para ver os ciclos e lançamentos.
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
