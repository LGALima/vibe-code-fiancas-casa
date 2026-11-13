"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destinoSeguro } from "@/lib/destino-seguro";
import { createClient } from "@/lib/supabase/server";

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Passa a usar outro espaço e vai para `destino` (o Início, por padrão).
 * A segurança do banco só aceita espaços de que a pessoa é membro.
 */
export async function trocarEspaco(
  espacoId: string,
  destino?: string,
): Promise<{ erro: string } | void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase.from("preferencias_usuario").upsert(
    { user_id: userId, espaco_ativo_id: espacoId, atualizado_em: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { erro: "Não foi possível trocar de espaço. Tente de novo." };

  revalidatePath("/", "layout");
  redirect(destinoSeguro(destino));
}
