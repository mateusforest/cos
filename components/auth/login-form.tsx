'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FloatingField } from '@/components/auth/floating-field'

type LoginFormProps = {
  email: string
  password: string
  showPassword: boolean
  error?: string
  isPending?: boolean
  isGoogleEnabled?: boolean
  auxiliaryContent?: ReactNode
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onTogglePassword: () => void
  onSubmit: (event: React.FormEvent) => void
  onGoogleContinue?: () => void
}

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

export function LoginForm({
  email,
  password,
  showPassword,
  error,
  isPending = false,
  isGoogleEnabled = false,
  auxiliaryContent,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onGoogleContinue,
}: LoginFormProps) {
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

      {auxiliaryContent}

      <form onSubmit={onSubmit} className="space-y-5">
        <FloatingField
          label="Email"
          type="email"
          value={email}
          onChange={onEmailChange}
          autoComplete="email"
          required
          disabled={isPending}
        />

        <div className="space-y-2">
          <FloatingField
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={onPasswordChange}
            autoComplete="current-password"
            required
            disabled={isPending}
            rightSlot={
              <button
                type="button"
                onClick={onTogglePassword}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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
          disabled={isPending}
          className="group h-14 w-full rounded-xl text-base [&_svg]:size-4"
        >
          {isPending ? 'Entrando...' : 'Entrar'}
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
          disabled={isPending || !isGoogleEnabled}
          onClick={onGoogleContinue}
          className="h-14 w-full rounded-xl text-base font-medium"
        >
          <GoogleIcon />
          Continuar com Google
        </Button>
      </form>
    </div>
  )
}
