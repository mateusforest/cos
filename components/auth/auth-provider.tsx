"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { ProfileRecord, WorkspaceRecord } from "@/lib/auth"

type AuthState = {
  user: {
    id: string
    email: string | null
  } | null
  profile: ProfileRecord | null
  workspace: WorkspaceRecord | null
  membershipRole: string | null
  canManageWorkspace: boolean
  isLoading: boolean
  refresh: () => Promise<void>
  syncAuth: () => Promise<void>
  clearAuth: () => void
}

const AuthContext = createContext<AuthState | null>(null)

function emptyAuthState() {
  return {
    user: null,
    profile: null,
    workspace: null,
    membershipRole: null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [user, setUser] = useState<AuthState["user"]>(null)
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null)
  const [membershipRole, setMembershipRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearAuth = useCallback(() => {
    const emptyState = emptyAuthState()
    setUser(emptyState.user)
    setProfile(emptyState.profile)
    setWorkspace(emptyState.workspace)
    setMembershipRole(emptyState.membershipRole)
    setIsLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/context", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        clearAuth()
        return
      }

      const data = await response.json()
      setUser(data.user)
      setProfile(data.profile)
      setWorkspace(data.workspace)
      setMembershipRole(data.membershipRole)
      setIsLoading(false)
    } catch {
      clearAuth()
    }
  }, [clearAuth])

  const syncAuth = useCallback(async () => {
    await refresh()
  }, [refresh])

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (!session?.user) {
        clearAuth()
        return
      }

      await refresh()
    }

    void bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        clearAuth()
        return
      }

      setUser({
        id: session.user.id,
        email: session.user.email ?? null,
      })
      setIsLoading(true)
      void refresh()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [clearAuth, refresh, supabase])

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      workspace,
      membershipRole,
      canManageWorkspace:
        profile?.global_role === "master" ||
        membershipRole === "owner" ||
        membershipRole === "admin",
      isLoading,
      refresh,
      syncAuth,
      clearAuth,
    }),
    [user, profile, workspace, membershipRole, isLoading, refresh, syncAuth, clearAuth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider")
  }

  return context
}
