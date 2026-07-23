"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FloatingField } from "@/components/auth/floating-field"
import { ensureWorkspaceForCurrentUserAction, loginAction } from "@/actions/auth"
import { useAuth } from "@/components/auth/auth-provider"
import type { WorkspaceType } from "@/lib/auth"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.2s2.7-6.2 6-6.2c1.88 0 3.14.8 3.86 1.48l2.63-2.53C16.9 1.9 14.66 1 12 1 6.98 1 3 5 3 12s3.98 11 9 11c5.2 0 8.64-3.65 8.64-8.8 0-.6-.06-1.05-.14-1.5H12z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.4 0-4.43-1.62-5.16-3.8l-2.9 2.24C5.42 20.9 8.46 23 12 23z"
      />
      <path
        fill="#4A90D9"
        d="M20.64 12.2c0-.6-.06-1.05-.14-1.5H12v3.9h5.5c-.11.66-.5 1.6-1.38 2.42l2.84 2.2c1.7-1.56 2.68-3.87 2.68-7.02z"
      />
      <path
        fill="#FBBC05"
        d="M6.84 13.72A6.03 6.03 0 016.5 12c0-.6.1-1.18.29-1.72L3.89 8.04A9.98 9.98 0 003 12c0 1.6.38 3.12 1.05 4.46l2.79-2.74z"
      />
    </svg>
  )
}

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

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          Bem-vindo de volta.
        </h1>
        <p className="mt-2 text-pretty text-muted-foreground">
          Continue exatamente de onde parou.
        </p>
      </header>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {(needsWorkspaceSetup || canRecoverWorkspace) && (
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
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FloatingField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
          disabled={isPending || isWorkspacePending}
        />

        <div className="space-y-2">
          <FloatingField
            label="Senha"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
            disabled={isPending || isWorkspacePending}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((state) => !state)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
          <div className="flex justify-end">
            <Link href="/recuperar-senha" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isPending || isWorkspacePending}
          className="group h-14 w-full rounded-xl text-base [&_svg]:size-4"
        >
          {isPending ? "Entrando..." : "Entrar"}
          <ArrowRight className="ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>

        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-14 w-full rounded-xl text-base font-medium"
        >
          <GoogleIcon />
          Continuar com Google
        </Button>
      </form>
    </div>
  )
}
