"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserAccessForUser } from "@/lib/auth"

export async function updateProfileAction({
  fullName,
  phone,
  avatarUrl,
}: {
  fullName: string
  phone: string
  avatarUrl?: string
}) {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  const { error } = await supabase.from("profiles").upsert(
    {
      id: authData.user.id,
      full_name: fullName.trim() || null,
      email: authData.user.email ?? access.profile?.email ?? null,
      phone: phone.trim() || null,
      avatar_url: avatarUrl?.trim() || access.profile?.avatar_url || null,
    },
    {
      onConflict: "id",
    },
  )

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
