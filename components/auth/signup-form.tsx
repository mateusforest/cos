'use client'

import Link from 'next/link'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FloatingField } from '@/components/auth/floating-field'
import { SectorSelect } from '@/components/auth/sector-select'
import { ProductToggle, type ProductKey } from '@/components/auth/product-toggle'
import { PreparingOverlay } from '@/components/auth/preparing-overlay'

type SignupFormProps = {
  product: ProductKey
  name: string
  email: string
  sector: string
  password: string
  confirm: string
  showPassword: boolean
  accepted: boolean
  preparing?: boolean
  error?: string
  isPending?: boolean
  onProductChange: (value: ProductKey) => void
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onSectorChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmChange: (value: string) => void
  onTogglePassword: () => void
  onAcceptedChange: (value: boolean) => void
  onSubmit: (event: React.FormEvent) => void
}

export function SignupForm({
  product,
  name,
  email,
  sector,
  password,
  confirm,
  showPassword,
  accepted,
  preparing = false,
  error,
  isPending = false,
  onProductChange,
  onNameChange,
  onEmailChange,
  onSectorChange,
  onPasswordChange,
  onConfirmChange,
  onTogglePassword,
  onAcceptedChange,
  onSubmit,
}: SignupFormProps) {
  return (
    <div className="relative">
      {preparing && <PreparingOverlay />}

      <header className="mb-8">
        <h1 className="text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          Vamos começar.
        </h1>
        <p className="mt-2 text-pretty text-muted-foreground">
          Em menos de um minuto você já estará operando com o COS.
        </p>
      </header>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <span className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Produto
          </span>
          <ProductToggle value={product} onChange={onProductChange} />
        </div>

        <FloatingField
          label="Nome"
          value={name}
          onChange={onNameChange}
          autoComplete="name"
          required
          disabled={isPending}
        />
        <FloatingField
          label="Email"
          type="email"
          value={email}
          onChange={onEmailChange}
          autoComplete="email"
          required
          disabled={isPending}
        />

        <SectorSelect value={sector} onChange={onSectorChange} />

        <FloatingField
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={onPasswordChange}
          autoComplete="new-password"
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
        <FloatingField
          label="Confirmar senha"
          type={showPassword ? 'text' : 'password'}
          value={confirm}
          onChange={onConfirmChange}
          autoComplete="new-password"
          required
          disabled={isPending}
        />

        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => onAcceptedChange(e.target.checked)}
            required
            className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
          />
          <span>
            Li e concordo com os{' '}
            <Link href="/termos" className="font-medium text-brand hover:underline">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" className="font-medium text-brand hover:underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="group h-14 w-full rounded-xl text-base [&_svg]:size-4"
        >
          {isPending ? 'Criando conta...' : 'Criar conta'}
          <ArrowRight className="ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      </form>
    </div>
  )
}
