'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CosLogo } from '@/components/cos-logo'

const STEPS = [
  'Preparando seu workspace...',
  'Configurando inteligência...',
  'Organizando ambiente...',
]

const FINAL = 'Seu COS está pronto.'

/**
 * Sequência de preparação exibida sobre o painel após criar a conta.
 * Puramente visual: reforça a percepção de qualidade em poucos segundos.
 * Não altera autenticação, APIs ou lógica de cadastro.
 */
export function PreparingOverlay() {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), (i + 1) * 900))
    })
    timers.push(setTimeout(() => setDone(true), STEPS.length * 900 + 700))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <div className={cn('transition-transform duration-500', done && 'scale-105')}>
          <CosLogo variant="mark" className="h-7" />
        </div>

        {!done ? (
          <div className="mt-10 w-full space-y-3">
            {STEPS.map((label, i) => {
              const complete = i < step
              const current = i === step
              return (
                <div
                  key={label}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-300',
                    complete
                      ? 'border-brand/30 bg-brand/5 text-foreground'
                      : current
                        ? 'border-border bg-background text-foreground'
                        : 'border-transparent text-muted-foreground/50',
                  )}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    {complete ? (
                      <Check className="size-4 text-brand" />
                    ) : current ? (
                      <Loader2 className="size-4 animate-spin text-brand" />
                    ) : (
                      <span className="size-2 rounded-full bg-current" />
                    )}
                  </span>
                  {label}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center animate-in-soft">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 animate-live-pulse">
              <Check className="size-7 text-brand" />
            </span>
            <p className="mt-5 text-lg font-medium text-foreground">{FINAL}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Estamos abrindo seu ambiente...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
