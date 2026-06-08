"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { logoutAction } from "@/actions/auth"
import { useAuth } from "@/components/auth/auth-provider"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export function useMasterSession() {
  const router = useRouter()
  const { user, profile, clearAuth } = useAuth()
  const [isPending, startTransition] = useTransition()

  const displayName = profile?.full_name || user?.email || "Sua conta"
  const displayEmail = profile?.email || user?.email || "Nenhum e-mail cadastrado"
  const initials = displayName.trim().charAt(0).toUpperCase() || "M"

  const handleLogout = (onAfter?: () => void) => {
    startTransition(async () => {
      clearAuth()
      await createSupabaseBrowserClient().auth.signOut()
      const result = await logoutAction()
      onAfter?.()
      router.replace(result.redirectTo || "/login")
      router.refresh()
    })
  }

  return {
    displayName,
    displayEmail,
    initials,
    isPending,
    handleLogout,
  }
}
