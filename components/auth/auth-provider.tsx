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
  isLoading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState["user"]>(null)
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null)
  const [membershipRole, setMembershipRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/context", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        setUser(null)
        setProfile(null)
        setWorkspace(null)
        setMembershipRole(null)
        return
      }

      const data = await response.json()
      setUser(data.user)
      setProfile(data.profile)
      setWorkspace(data.workspace)
      setMembershipRole(data.membershipRole)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    void refresh()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [refresh])

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      workspace,
      membershipRole,
      isLoading,
      refresh,
    }),
    [user, profile, workspace, membershipRole, isLoading, refresh],
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
