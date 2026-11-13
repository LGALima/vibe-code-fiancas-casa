"use client";

import type { ReactNode } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
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
  excluindo,
  erro,
  onConfirmar,
  onCancelar,
}: ConfirmarExclusaoProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <TriangleAlert className="size-5 shrink-0 text-destructive" aria-hidden />
          {titulo}
        </DialogTitle>
        <DialogDescription>
          {descricao}
          {descricao ? " " : null}
          Não dá para desfazer.
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
          className="h-10 bg-destructive text-white hover:bg-destructive/90"
          onClick={onConfirmar}
          carregando={excluindo}
        >
          <Trash2 aria-hidden />
          {excluindo ? "Excluindo…" : rotuloConfirmar}
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
