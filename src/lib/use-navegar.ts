"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Navega dentro de uma transição: `navegando` fica true até a nova tela
 * aparecer. Serve para o botão continuar mostrando que algo está acontecendo
 * depois de salvar, enquanto a próxima tela carrega.
 */
export function useNavegar() {
  const router = useRouter();
  const [navegando, iniciar] = useTransition();

  function navegar(
    url: string,
    {
      substituir = false,
      junto,
    }: {
      substituir?: boolean;
      /** Roda junto com a troca de tela (ex.: fechar um diálogo só no fim). */
      junto?: () => void;
    } = {},
  ) {
    iniciar(() => {
      if (substituir) router.replace(url);
      else router.push(url);
      router.refresh();
      junto?.();
    });
  }

  /** Só recarrega os dados da tela atual (sem trocar de página). */
  function atualizar() {
    iniciar(() => router.refresh());
  }

  return { navegar, atualizar, navegando };
}
