"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoginForm } from "@/components/auth/login-form"
import { ensureWorkspaceForCurrentUserAction, loginAction } from "@/actions/auth"
import { useAuth } from "@/components/auth/auth-provider"
import type { WorkspaceType } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: authenticatedUser, workspace, isLoading, syncAuth } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [needsWorkspaceSetup, setNeedsWorkspaceSetup] = useState(searchParams.get("workspace") === "missing")
  const [isPending, startTransition] = useTransition()
  const [isWorkspacePending, startWorkspaceTransition] = useTransition()

  const canRecoverWorkspace = Boolean(authenticatedUser && !workspace && !isLoading)
  const nextPath = useMemo(() => searchParams.get("next"), [searchParams])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setNeedsWorkspaceSetup(false)

    startTransition(async () => {
      const result = await loginAction({
        email,
        password,
        nextPath,
      })

      if (result.error) {
        setError(result.error)
        setNeedsWorkspaceSetup(Boolean(result.needsWorkspaceSetup))
        return
      }

      if (result.redirectTo) {
        await syncAuth()
        router.replace(result.redirectTo)
      } else {
        router.refresh()
      }
      router.refresh()
    })
  }

  const handleCreateWorkspace = (productType: WorkspaceType) => {
    setError("")

    startWorkspaceTransition(async () => {
      const result = await ensureWorkspaceForCurrentUserAction({ productType })

      if (result.error) {
        setError(result.error)
        setNeedsWorkspaceSetup(true)
        return
      }

      if (result.redirectTo) {
        await syncAuth()
        router.replace(result.redirectTo)
        router.refresh()
      }
    })
  }

  const auxiliaryContent =
    needsWorkspaceSetup || canRecoverWorkspace ? (
      <div className="mb-5 space-y-2">
        <p className="text-sm text-muted-foreground">
          Conta autenticada, mas ainda falta concluir seu workspace.
        </p>
        <div className="grid gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isWorkspacePending}
            className="h-14 w-full rounded-xl justify-between text-base font-medium"
            onClick={() => handleCreateWorkspace("operations")}
          >
            Criar workspace COS Operações
            <ArrowRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isWorkspacePending}
            className="h-14 w-full rounded-xl justify-between text-base font-medium"
            onClick={() => handleCreateWorkspace("connect")}
          >
            Criar workspace COS Connect
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    ) : null

  return (
    <LoginForm
      email={email}
      password={password}
      showPassword={showPassword}
      error={error}
      isPending={isPending || isWorkspacePending}
      auxiliaryContent={auxiliaryContent}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onTogglePassword={() => setShowPassword((state) => !state)}
      onSubmit={handleSubmit}
    />
  )
}
