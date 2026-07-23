'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Users, Wallet, Check } from 'lucide-react'
import { DeviceMockup } from '@/components/device-mockup'

/**
 * Mockup "vivo" do COS Operations.
 * Cena roteirizada em loop: mensagem digitada, cliente criado, documento
 * aparecendo, módulo atualizado e ação concluída. Sem player nem controles.
 * `playing` liga/desliga o ciclo conforme a etapa fica ativa no scroll.
 */
export function OperationsMockup({ playing = true }: { playing?: boolean }) {
  const [step, setStep] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }

    if (!playing) {
      clear()
      setStep(0)
      return
    }

    const run = () => {
      setStep(0)
      const seq = [700, 1600, 2600, 3600, 4600, 5600]
      seq.forEach((at, i) => {
        timers.current.push(setTimeout(() => setStep(i + 1), at))
      })
      timers.current.push(setTimeout(run, 7800))
    }
    run()

    return clear
  }, [playing])

  return (
    <DeviceMockup address="app.cos.com/operations">
      <div className="grid min-h-[300px] grid-cols-[1fr_136px] bg-gradient-to-br from-muted/30 to-background sm:min-h-[320px] sm:grid-cols-[1fr_160px]">
        {/* Chat */}
        <div className="space-y-2.5 p-4">
          {/* Mensagem do usuário */}
          {step >= 1 && (
            <div className="flex items-start gap-2 animate-pop-in">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <Users className="size-3 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-brand">Você</p>
                <p className="mt-0.5 text-pretty text-xs leading-relaxed text-foreground">
                  Cadastrar Maria Souza e gerar o contrato de serviços.
                </p>
              </div>
            </div>
          )}

          {/* COS digitando */}
          {step === 2 && (
            <div className="flex items-center gap-1 pl-8">
              <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 rounded-full bg-muted-foreground"
                    style={{
                      animation: 'cos-typing-dot 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.16}s`,
                    }}
                  />
                ))}
              </span>
            </div>
          )}

          {/* Resposta do COS */}
          {step >= 3 && (
            <div className="flex items-start gap-2 animate-pop-in">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-brand/30">
                <span className="size-2.5 rounded-full border-2 border-brand" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-foreground">COS</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Cliente cadastrado e contrato criado.
                </p>
              </div>
            </div>
          )}

          {/* Card de cliente */}
          {step >= 4 && (
            <div className="ml-8 animate-pop-in rounded-lg border border-border/70 bg-background p-2.5 shadow-sm">
              <p className="text-xs font-semibold text-foreground">Maria Souza</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                maria@email.com • (11) 98888-7777
              </p>
            </div>
          )}

          {/* Card de documento */}
          {step >= 5 && (
            <div className="ml-8 animate-pop-in rounded-lg border border-border/70 bg-background p-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-red-500/10">
                  <FileText className="size-3.5 text-red-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    Contrato_Maria_Souza.pdf
                  </p>
                  <p className="text-[10px] text-muted-foreground">PDF • 245 KB</p>
                </div>
              </div>
            </div>
          )}

          {/* Ação concluída */}
          {step >= 6 && (
            <div className="ml-8 inline-flex animate-pop-in items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
              <Check className="size-3 text-emerald-600" />
              <span className="text-[10px] font-medium text-emerald-700">Ação concluída</span>
            </div>
          )}
        </div>

        {/* Módulos */}
        <div className="border-l border-border/60 bg-background/70 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Módulos
          </p>
          <ul className="space-y-1.5">
            <ModuleRow icon={Users} label="Clientes" active={step >= 4} note="Atualizado agora" />
            <ModuleRow
              icon={FileText}
              label="Documentos"
              active={step >= 5}
              note="Criado agora"
            />
            <ModuleRow
              icon={Wallet}
              label="Financeiro"
              active={step >= 6}
              note="Atualizado agora"
            />
          </ul>
        </div>
      </div>
    </DeviceMockup>
  )
}

function ModuleRow({
  icon: Icon,
  label,
  active,
  note,
}: {
  icon: typeof Users
  label: string
  active: boolean
  note: string
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-lg border p-1.5 transition-colors duration-300 ${
        active ? 'border-brand/40 bg-brand/5' : 'border-transparent'
      }`}
    >
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors duration-300 ${
          active ? 'bg-brand/15 text-brand' : 'bg-muted text-muted-foreground'
        }`}
      >
        <Icon className="size-3" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-foreground">{label}</p>
        <p
          className={`truncate text-[9px] transition-colors duration-300 ${
            active ? 'text-brand' : 'text-muted-foreground'
          }`}
        >
          {active ? note : 'Sincronizado'}
        </p>
      </div>
    </li>
  )
}
