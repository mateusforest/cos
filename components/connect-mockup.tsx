'use client'

import { useEffect, useRef, useState } from 'react'
import { Database, Users, Check, Loader2, Sparkles } from 'lucide-react'
import { DeviceMockup } from '@/components/device-mockup'

/**
 * Mockup "vivo" do COS Connect.
 * Cena roteirizada em loop: fonte conectada, dados sincronizando, análise em
 * andamento, status "Pronta para conversar" e pergunta respondida.
 * `playing` liga/desliga o ciclo conforme a etapa fica ativa no scroll.
 */
export function ConnectMockup({ playing = true }: { playing?: boolean }) {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }

    if (!playing) {
      clear()
      setStep(0)
      setProgress(0)
      return
    }

    const run = () => {
      setStep(0)
      setProgress(0)
      // 1: conectando  2: conectado  3: sincronizando  4: analisando  5: pronta  6: pergunta+resposta
      timers.current.push(setTimeout(() => setStep(1), 600))
      timers.current.push(setTimeout(() => setStep(2), 1600))
      timers.current.push(setTimeout(() => setStep(3), 2300))
      for (let p = 1; p <= 10; p++) {
        timers.current.push(setTimeout(() => setProgress(p * 10), 2300 + p * 110))
      }
      timers.current.push(setTimeout(() => setStep(4), 3600))
      timers.current.push(setTimeout(() => setStep(5), 4700))
      timers.current.push(setTimeout(() => setStep(6), 5600))
      timers.current.push(setTimeout(run, 8200))
    }
    run()

    return clear
  }, [playing])

  return (
    <DeviceMockup address="app.cos.com/connect">
      <div className="min-h-[300px] bg-gradient-to-br from-muted/30 to-background p-4 sm:min-h-[320px]">
        {/* Fonte conectada */}
        {step >= 1 && (
          <div className="flex animate-pop-in items-center gap-2.5 rounded-lg border border-border/70 bg-background p-2.5 shadow-sm">
            <span className="flex size-8 items-center justify-center rounded-md bg-brand/10">
              <Database className="size-4 text-brand" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">ERP Financeiro</p>
              <p className="text-[10px] text-muted-foreground">Origem de dados externa</p>
            </div>
            {step === 1 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Conectando
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <Check className="size-3" />
                Conectado
              </span>
            )}
          </div>
        )}

        {/* Sincronização */}
        {step >= 3 && (
          <div className="mt-2.5 animate-pop-in rounded-lg border border-border/70 bg-background p-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-foreground">
                {progress < 100 ? 'Sincronizando dados' : 'Dados sincronizados'}
              </p>
              <span className="text-[10px] text-muted-foreground">{progress}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Análise em andamento */}
        {step >= 4 && (
          <div className="mt-2.5 flex animate-pop-in items-center gap-2 text-[11px] text-muted-foreground">
            {step === 4 ? (
              <>
                <Loader2 className="size-3 animate-spin text-brand" />
                Analisando estrutura e relacionamentos...
              </>
            ) : (
              <>
                <Sparkles className="size-3 text-brand" />
                Base compreendida pelo COS.
              </>
            )}
          </div>
        )}

        {/* Status pronto */}
        {step >= 5 && (
          <div className="mt-2.5 inline-flex animate-pop-in items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-live-pulse" />
            <span className="text-[10px] font-medium text-emerald-700">Pronta para conversar</span>
          </div>
        )}

        {/* Pergunta respondida */}
        {step >= 6 && (
          <div className="mt-3 space-y-2.5">
            <div className="flex animate-pop-in items-start gap-2">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <Users className="size-3 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-brand">Você</p>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground">
                  Qual foi o faturamento deste mês?
                </p>
              </div>
            </div>
            <div className="flex animate-pop-in items-start gap-2">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-brand/30">
                <span className="size-2.5 rounded-full border-2 border-brand" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-foreground">COS</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  R$ 128.400 este mês, 12% acima do anterior. Origem: ERP Financeiro.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DeviceMockup>
  )
}
