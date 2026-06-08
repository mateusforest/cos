"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserAccessForUser } from "@/lib/auth"

export async function updatePrimarySystemAction({
  primarySystemName,
  primarySystemUrl,
}: {
  primarySystemName: string
  primarySystemUrl: string
}) {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." }
  }

  let normalizedUrl = primarySystemUrl.trim()
  if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      primary_system_name: primarySystemName.trim(),
      primary_system_url: normalizedUrl,
    })
    .eq("id", access.workspace.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
