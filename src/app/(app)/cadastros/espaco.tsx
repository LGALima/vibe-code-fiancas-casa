"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, RefreshCw, UserMinus, Users } from "lucide-react";
import { BotaoCopiar } from "@/components/botao-copiar";
import { DialogoConfirmarExclusao } from "@/components/confirmar-exclusao";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { traduzirErroBanco } from "@/lib/supabase/erros";

export type MembroEspaco = {
  userId: string;
  nome: string | null;
  papel: "dono" | "membro";
};

type Pergunta = { tipo: "codigo" } | { tipo: "remover"; membro: MembroEspaco };

/** Mensagens das funções do banco já vêm em português (P0001/P0002/42501). */
function mensagemDoErro(error: Parameters<typeof traduzirErroBanco>[0]) {
  return ["P0001", "P0002", "42501"].includes(error.code ?? "")
    ? error.message
    : traduzirErroBanco(error);
}

export function CartaoEspaco({
  espacoId,
  nome,
  codigoConvite,
  userId,
  membros,
}: {
  espacoId: string;
  nome: string;
  codigoConvite: string;
  userId: string;
  membros: MembroEspaco[];
}) {
  const router = useRouter();
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [erro, setErro] = useState<string>();
  // A transição só termina com a tela já atualizada (código novo, lista nova).
  const [ocupado, iniciar] = useTransition();
  const souDono = membros.some((m) => m.userId === userId && m.papel === "dono");
  const dono = membros.find((m) => m.papel === "dono");
  const nomeDe = (m: MembroEspaco) => m.nome ?? "Sem nome";

  function fechar() {
    setErro(undefined);
    setPergunta(null);
  }

  function confirmar() {
    if (!pergunta) return;
    setErro(undefined);
    iniciar(async () => {
      const supabase = createClient();
      const { error } =
        pergunta.tipo === "codigo"
          ? await supabase.rpc("gerar_novo_codigo_convite", { p_espaco_id: espacoId })
          : await supabase.rpc("remover_membro", {
              p_espaco_id: espacoId,
              p_user_id: pergunta.membro.userId,
            });
      if (error) {
        setErro(mensagemDoErro(error));
        return;
      }
      iniciar(() => {
        router.refresh();
        setPergunta(null);
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{nome}</CardTitle>
        <CardDescription>
          Para convidar quem mora com você, mande este código. A pessoa cria a
          conta e escolhe &quot;Entrar com código&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <code
              className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-lg border bg-muted font-mono text-lg font-semibold tracking-[0.3em]"
              aria-label={`Código de convite: ${codigoConvite.split("").join(" ")}`}
            >
              {codigoConvite}
            </code>
            <BotaoCopiar texto={codigoConvite} rotulo="Copiar código de convite" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-muted-foreground"
            onClick={() => setPergunta({ tipo: "codigo" })}
          >
            <RefreshCw aria-hidden />
            Gerar novo código
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4" aria-hidden />
            Membros
          </h2>
          <ul className="flex flex-col divide-y rounded-lg border">
            {membros.map((m) => {
              const euMesmo = m.userId === userId;
              return (
                <li key={m.userId} className="flex min-h-12 items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{nomeDe(m)}</span>
                  {m.papel === "dono" && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                      <Crown className="size-3" aria-hidden />
                      dono
                    </span>
                  )}
                  {euMesmo && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      você
                    </span>
                  )}
                  {souDono && !euMesmo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPergunta({ tipo: "remover", membro: m })}
                      aria-label={`Remover ${nomeDe(m)} do espaço`}
                    >
                      <UserMinus aria-hidden />
                      Remover
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {!souDono && membros.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Só {dono ? nomeDe(dono) : "o dono do espaço"} pode remover membros.
            </p>
          )}
        </div>
      </CardContent>

      <DialogoConfirmarExclusao
        aberto={pergunta?.tipo === "codigo"}
        variante="normal"
        Icone={RefreshCw}
        titulo="Gerar um novo código de convite?"
        descricao={`O código ${codigoConvite} para de funcionar. Quem já é membro continua no espaço; para convidar alguém, mande o código novo.`}
        aviso={null}
        rotuloConfirmar="Gerar novo código"
        rotuloEmAndamento="Gerando…"
        excluindo={ocupado}
        erro={erro}
        onConfirmar={confirmar}
        onCancelar={fechar}
      />
      <DialogoConfirmarExclusao
        aberto={pergunta?.tipo === "remover"}
        Icone={UserMinus}
        titulo={pergunta?.tipo === "remover" ? `Remover ${nomeDe(pergunta.membro)} do espaço?` : ""}
        descricao={
          pergunta?.tipo === "remover"
            ? `${nomeDe(pergunta.membro)} perde o acesso aos ciclos, lançamentos e cadastros deste espaço. Os lançamentos que a pessoa fez continuam aqui. O código de convite também muda, para não dar para voltar com o código antigo.`
            : undefined
        }
        aviso="Para voltar, a pessoa vai precisar de um novo convite."
        rotuloConfirmar="Remover"
        rotuloEmAndamento="Removendo…"
        excluindo={ocupado}
        erro={erro}
        onConfirmar={confirmar}
        onCancelar={fechar}
      />
    </Card>
  );
}
