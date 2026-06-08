"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  bootstrapWorkspaceForUser,
  getUserAccessForUser,
  resolveHomePath,
  type WorkspaceType,
} from "@/lib/auth"

export async function loginAction({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: "Não foi possível iniciar a sessão." }
  }

  const access = await getUserAccessForUser(data.user, supabase)

  return {
    redirectTo: resolveHomePath(access),
  }
}

export async function signupAction({
  name,
  email,
  password,
  productType,
}: {
  name: string
  email: string
  password: string
  productType: WorkspaceType
}) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: "Não foi possível criar a conta." }
  }

  const bootstrap = await bootstrapWorkspaceForUser({
    userId: data.user.id,
    email,
    displayName: name,
    productType,
    queryClient: supabase,
  })

  if (bootstrap.error) {
    return { error: bootstrap.error }
  }

  return {
    redirectTo: productType === "connect" ? "/connect" : "/app",
  }
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  return { redirectTo: "/login" }
}
