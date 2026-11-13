import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaAuth } from "@/components/tela-auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · Finanças da Casa",
};

export default function LoginPage() {
  return (
    <TelaAuth>
      <Suspense>
        <LoginForm />
      </Suspense>
    </TelaAuth>
  );
}
