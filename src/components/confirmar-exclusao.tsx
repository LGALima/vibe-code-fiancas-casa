"use client";

import type { ReactNode } from "react";
import { Trash2, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConfirmarExclusaoProps = {
  /** Ex.: 'Excluir a categoria "Lazer"?' */
  titulo: string;
  /** O que mais some junto, se houver. "Não dá para desfazer." vem sempre no fim. */
  descricao?: ReactNode;
  /** Texto do botão de confirmar. Padrão: "Excluir". */
  rotuloConfirmar?: string;
  /** Texto do botão durante a ação. Padrão: "Excluindo…". */
  rotuloEmAndamento?: string;
  /** Frase final da descrição. Padrão: "Não dá para desfazer."; null tira. */
  aviso?: string | null;
  /** Ícone do botão de confirmar. Padrão: lixeira. */
  Icone?: LucideIcon;
  /** "perigo" (vermelho, padrão) para excluir/remover; "normal" para o resto. */
  variante?: "perigo" | "normal";
  excluindo: boolean;
  erro?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/**
 * Conteúdo da confirmação de exclusão, para usar dentro de um DialogContent
 * já aberto (troca o formulário pela pergunta). Não usa window.confirm, que
 * alguns navegadores embutidos e apps instalados bloqueiam em silêncio.
 */
export function PainelConfirmarExclusao({
  titulo,
  descricao,
  rotuloConfirmar = "Excluir",
  rotuloEmAndamento = "Excluindo…",
  aviso = "Não dá para desfazer.",
  Icone = Trash2,
  variante = "perigo",
  excluindo,
  erro,
  onConfirmar,
  onCancelar,
}: ConfirmarExclusaoProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {variante === "perigo" && (
            <TriangleAlert className="size-5 shrink-0 text-destructive" aria-hidden />
          )}
          {titulo}
        </DialogTitle>
        <DialogDescription>
          {descricao}
          {descricao && aviso ? " " : null}
          {aviso}
        </DialogDescription>
      </DialogHeader>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <DialogFooter className="gap-2">
        <Button variant="outline" className="h-10" onClick={onCancelar} disabled={excluindo}>
          Cancelar
        </Button>
        <Button
          className={variante === "perigo" ? "h-10 bg-destructive text-white hover:bg-destructive/90" : "h-10"}
          onClick={onConfirmar}
          carregando={excluindo}
        >
          <Icone aria-hidden />
          {excluindo ? rotuloEmAndamento : rotuloConfirmar}
        </Button>
      </DialogFooter>
    </>
  );
}

/** A mesma confirmação, num diálogo próprio (para telas que não estão num diálogo). */
export function DialogoConfirmarExclusao({
  aberto,
  ...props
}: ConfirmarExclusaoProps & { aberto: boolean }) {
  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (!valor && !props.excluindo) props.onCancelar();
      }}
    >
      {aberto && (
        <DialogContent>
          <PainelConfirmarExclusao {...props} />
        </DialogContent>
      )}
    </Dialog>
  );
}
