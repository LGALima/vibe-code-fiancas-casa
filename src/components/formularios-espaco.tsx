"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { House, KeyRound } from "lucide-react";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useNavegar } from "@/lib/use-navegar";
import { cn } from "@/lib/utils";
import {
  criarEspacoSchema,
  entrarEspacoSchema,
  type CriarEspacoDados,
  type EntrarEspacoDados,
  type EntrarEspacoEntrada,
} from "@/lib/validacoes/espaco";

type Modo = "criar" | "entrar";

type PropsForm = {
  /**
   * Roda quando o Início do espaço novo já carregou (ex.: fechar o diálogo).
   * O espaço criado ou em que a pessoa entrou já fica ativo.
   */
  onConcluir?: () => void;
  nomeEspacoPadrao?: string;
  nomeExibicaoPadrao?: string;
};

/** Abas "Criar espaço" / "Entrar com código" com o formulário de cada uma. */
export function CriarOuEntrarEspaco({
  rotuloCriar = "Criar espaço",
  ...props
}: PropsForm & { rotuloCriar?: string }) {
  const [modo, setModo] = useState<Modo>("criar");

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Criar ou entrar em um espaço" className="grid grid-cols-2 gap-2">
        {(
          [
            ["criar", rotuloCriar, House],
            ["entrar", "Entrar com código", KeyRound],
          ] as const
        ).map(([valor, rotulo, Icone]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={modo === valor}
            onClick={() => setModo(valor)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
              modo === valor
                ? "border-primary bg-primary/5 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icone className="size-5" aria-hidden />
            {rotulo}
          </button>
        ))}
      </div>

      {modo === "criar" ? <CriarEspacoForm {...props} /> : <EntrarEspacoForm {...props} />}
    </div>
  );
}

function CriarEspacoForm({ onConcluir, nomeEspacoPadrao, nomeExibicaoPadrao }: PropsForm) {
  const { navegar, navegando } = useNavegar();
  const [erro, setErro] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CriarEspacoDados>({
    resolver: zodResolver(criarEspacoSchema),
    defaultValues: { nome: nomeEspacoPadrao ?? "Nossa casa", nomeExibicao: nomeExibicaoPadrao ?? "" },
  });

  async function criar({ nome, nomeExibicao }: CriarEspacoDados) {
    setErro(undefined);
    const { error } = await createClient().rpc("criar_espaco", {
      p_nome: nome,
      p_nome_exibicao: nomeExibicao,
    });
    if (error) {
      setErro("Não foi possível criar o espaço. Tente de novo.");
      return;
    }
    navegar("/", { substituir: true, junto: onConcluir });
  }

  return (
    <form
      onSubmit={handleSubmit(criar)}
      noValidate
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-muted-foreground">
        Já vem com categorias e formas de pagamento prontas. Depois é só
        mandar o código de convite (fica em Cadastros) para quem vai usar com você.
      </p>
      <Campo
        id="nome"
        rotulo="Nome do espaço"
        autoComplete="off"
        erro={errors.nome?.message}
        {...register("nome")}
      />
      <Campo
        id="nomeExibicao"
        rotulo="Seu nome"
        placeholder="Como você vai aparecer"
        autoComplete="given-name"
        erro={errors.nomeExibicao?.message}
        {...register("nomeExibicao")}
      />
      <Button type="submit" className="h-10 w-full" carregando={isSubmitting || navegando}>
        {isSubmitting || navegando ? "Criando…" : "Criar espaço"}
      </Button>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </form>
  );
}

function EntrarEspacoForm({ onConcluir, nomeExibicaoPadrao }: PropsForm) {
  const { navegar, navegando } = useNavegar();
  const [erro, setErro] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EntrarEspacoEntrada, unknown, EntrarEspacoDados>({
    resolver: zodResolver(entrarEspacoSchema),
    defaultValues: { codigo: "", nomeExibicao: nomeExibicaoPadrao ?? "" },
  });

  async function entrar({ codigo, nomeExibicao }: EntrarEspacoDados) {
    setErro(undefined);
    const { error } = await createClient().rpc("entrar_no_espaco", {
      p_codigo: codigo,
      p_nome_exibicao: nomeExibicao,
    });
    if (error) {
      setErro(
        error.code === "P0002"
          ? "Código de convite inválido. Confira com quem te convidou."
          : "Não foi possível entrar no espaço. Tente de novo.",
      );
      return;
    }
    navegar("/", { substituir: true, junto: onConcluir });
  }

  return (
    <form
      onSubmit={handleSubmit(entrar)}
      noValidate
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-muted-foreground">
        Peça o código para quem criou o espaço. Ele fica em Cadastros.
      </p>
      <Campo
        id="codigo"
        rotulo="Código de convite"
        placeholder="Ex.: A1B2C3D4"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="h-10 font-mono text-base tracking-widest uppercase"
        erro={errors.codigo?.message}
        {...register("codigo")}
      />
      <Campo
        id="nomeExibicao"
        rotulo="Seu nome"
        placeholder="Como você vai aparecer"
        autoComplete="given-name"
        erro={errors.nomeExibicao?.message}
        {...register("nomeExibicao")}
      />
      <Button type="submit" className="h-10 w-full" carregando={isSubmitting || navegando}>
        {isSubmitting || navegando ? "Entrando…" : "Entrar no espaço"}
      </Button>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </form>
  );
}
