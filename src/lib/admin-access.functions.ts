import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthedContext = { supabase: any; userId: string };

async function assertAdmin(context: AuthedContext) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Não foi possível validar suas permissões.");
  if (!data) throw new Error("Apenas administradores podem gerenciar acessos.");
}

export type PlayerAccess = {
  playerId: string;
  name: string;
  nickname: string | null;
  status: string;
  email: string | null;
  hasAccess: boolean;
};

export const listPlayerAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: players, error } = await supabaseAdmin
      .from("players")
      .select("id, name, nickname, status, user_id")
      .order("name");
    if (error) throw new Error(error.message);

    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const emailById = new Map((usersData?.users ?? []).map((user) => [user.id, user.email ?? null]));

    return (players ?? []).map((player) => ({
      playerId: player.id,
      name: player.name,
      nickname: player.nickname,
      status: player.status,
      email: player.user_id ? (emailById.get(player.user_id) ?? null) : null,
      hasAccess: Boolean(player.user_id),
    })) satisfies PlayerAccess[];
  });

const createSchema = z.object({
  playerId: z.string().uuid(),
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const createPlayerAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: player, error: playerError } = await supabaseAdmin
      .from("players")
      .select("id, name, user_id")
      .eq("id", data.playerId)
      .maybeSingle();
    if (playerError) throw new Error(playerError.message);
    if (!player) throw new Error("Jogador não encontrado.");
    if (player.user_id) throw new Error("Este jogador já possui acesso.");

    const email = data.email.trim().toLowerCase();
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: player.name },
    });
    if (createError || !created?.user) {
      const message = (createError?.message ?? "").toLowerCase();
      if (message.includes("already")) throw new Error("Já existe uma conta com este e-mail.");
      throw new Error(createError?.message ?? "Não foi possível criar o acesso.");
    }

    const userId = created.user.id;

    await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: player.name });
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "player" }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    const { error: linkError } = await supabaseAdmin
      .from("players")
      .update({ user_id: userId })
      .eq("id", player.id);
    if (linkError) throw new Error(linkError.message);

    return { email };
  });

const resetSchema = z.object({
  playerId: z.string().uuid(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const resetPlayerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => resetSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: player, error } = await supabaseAdmin
      .from("players")
      .select("user_id")
      .eq("id", data.playerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!player?.user_id) throw new Error("Este jogador ainda não tem acesso.");

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(player.user_id, {
      password: data.password,
    });
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });

export const revokePlayerAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ playerId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: player, error } = await supabaseAdmin
      .from("players")
      .select("user_id")
      .eq("id", data.playerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!player?.user_id) throw new Error("Este jogador ainda não tem acesso.");

    const { error: unlinkError } = await supabaseAdmin
      .from("players")
      .update({ user_id: null })
      .eq("id", data.playerId);
    if (unlinkError) throw new Error(unlinkError.message);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(player.user_id);
    if (deleteError) throw new Error(deleteError.message);
    return { ok: true };
  });
