"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const isMountedRef = useRef(true)

  const clearAuth = useCallback(() => {
    const emptyState = emptyAuthState()
    setUser(emptyState.user)
    setProfile(emptyState.profile)
    setWorkspace(emptyState.workspace)
    setMembershipRole(emptyState.membershipRole)
    setIsLoading(false)
  }, [])

  const hydrateAuth = useCallback(async ({ silent }: { silent: boolean }) => {
    if (!silent) {
      setIsLoading(true)
    }
    try {
      const response = await fetch("/api/auth/context", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        if (!silent && isMountedRef.current) {
          clearAuth()
        }
        return
      }

      const data = await response.json()
      if (!isMountedRef.current) {
        return
      }

      if (!data.user) {
        clearAuth()
        return
      }

      setUser(data.user)
      setProfile(data.profile)
      setWorkspace(data.workspace)
      setMembershipRole(data.membershipRole)
      setIsLoading(false)
    } catch {
      if (!silent && isMountedRef.current) {
        clearAuth()
      }
    }
  }, [clearAuth])

  const refresh = useCallback(async () => {
    await hydrateAuth({ silent: true })
  }, [hydrateAuth])

  const syncAuth = useCallback(async () => {
    await hydrateAuth({ silent: false })
  }, [hydrateAuth])

  useEffect(() => {
    isMountedRef.current = true

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMountedRef.current) {
        return
      }

      if (!session?.user) {
        clearAuth()
        return
      }

      await hydrateAuth({ silent: false })
    }

    void bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMountedRef.current) {
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
      void hydrateAuth({ silent: true })
    })

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [clearAuth, hydrateAuth, supabase])

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
