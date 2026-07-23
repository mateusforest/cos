"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Layers, Plug } from "lucide-react"
import { ensureWorkspaceForCurrentUserAction, loginAction } from "@/actions/auth"
import { FloatingField } from "@/components/auth/floating-field"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import type { WorkspaceType } from "@/lib/auth"

function WorkspaceRecovery({
  isPending,
  onSelect,
}: {
  isPending: boolean
  onSelect: (productType: WorkspaceType) => void
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-muted/35 p-5">
      <p className="text-sm font-medium text-foreground">Sua conta está pronta para voltar.</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Encontramos sua autenticação, mas ainda falta concluir o workspace. Escolha como deseja
        operar no COS.
      </p>

      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={() => onSelect("operations")}
          disabled={isPending}
          className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-3 text-left transition-colors hover:border-brand/30 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Layers className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">COS Operações</span>
              <span className="block text-xs text-muted-foreground">Centralize sua operação</span>
            </span>
          </span>
          <span className="text-xs font-medium text-brand">{isPending ? "Criando..." : "Abrir"}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect("connect")}
          disabled={isPending}
          className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-3 text-left transition-colors hover:border-brand/30 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Plug className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">COS Connect</span>
              <span className="block text-xs text-muted-foreground">Conecte seus sistemas ao COS</span>
            </span>
          </span>
          <span className="text-xs font-medium text-brand">{isPending ? "Criando..." : "Abrir"}</span>
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: authenticatedUser, workspace, isLoading, syncAuth } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [needsWorkspaceSetup, setNeedsWorkspaceSetup] = useState(searchParams.get("workspace") === "missing")
  const [isPending, startTransition] = useTransition()
  const [isWorkspacePending, startWorkspaceTransition] = useTransition()

  const canRecoverWorkspace = Boolean(authenticatedUser && !workspace && !isLoading)
  const nextPath = useMemo(() => searchParams.get("next"), [searchParams])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

  const isSubmitting = isPending || isWorkspacePending

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-background/92 p-7 shadow-[0_30px_80px_-45px_rgba(31,24,68,0.42)] backdrop-blur-sm md:p-8">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Login</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-foreground">Entrar no COS</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Continue sua operação com a mesma lógica de acesso e redirecionamento que você já usa.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {(needsWorkspaceSetup || canRecoverWorkspace) && (
          <div className="mb-5">
            <WorkspaceRecovery isPending={isWorkspacePending} onSelect={handleCreateWorkspace} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FloatingField
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
            disabled={isSubmitting}
          />

          <FloatingField
            label="Senha"
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
            disabled={isSubmitting}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />

          <div className="flex items-center justify-between gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="size-4 rounded border-border text-brand focus:ring-brand/20"
              />
              Lembrar de mim
            </label>
            <Link href="/recuperar-senha" className="text-sm font-medium text-foreground hover:text-brand">
              Esqueci minha senha
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-full bg-[linear-gradient(135deg,rgba(120,62,255,0.92),rgba(90,38,236,0.92))] text-sm font-medium text-white shadow-[0_18px_40px_-24px_rgba(96,57,228,0.7)] hover:opacity-95"
          >
            {isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
