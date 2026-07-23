'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Download, Users, FileSignature, Wallet, Calendar, LayoutGrid } from 'lucide-react'

type Msg = {
  id: number
  role: 'user' | 'cos'
  text: string
  time: string
}

type ModuleState = {
  key: string
  label: string
  status: string
  icon: typeof Users
  active: boolean
}

const BASE_MODULES: ModuleState[] = [
  { key: 'clientes', label: 'Clientes', status: 'Sincronizado', icon: Users, active: false },
  { key: 'documentos', label: 'Documentos', status: 'Sincronizado', icon: FileSignature, active: false },
  { key: 'financeiro', label: 'Financeiro', status: 'Sincronizado', icon: Wallet, active: false },
  { key: 'agenda', label: 'Agenda', status: 'Sincronizado', icon: Calendar, active: false },
  { key: 'crm', label: 'CRM', status: 'Sincronizado', icon: LayoutGrid, active: false },
]

/**
 * Demonstração "viva" do COS para a hero.
 * Não é um player de vídeo: é uma cena roteirizada que se repete em loop,
 * simulando o COS entendendo o pedido e executando ações nos módulos.
 * Estrutura pronta para, no futuro, ser substituída por vídeo real.
 */
export function HeroLiveDemo() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [cosDraft, setCosDraft] = useState('')
  const [showClientCard, setShowClientCard] = useState(false)
  const [showDocCard, setShowDocCard] = useState(false)
  const [docProgress, setDocProgress] = useState(0)
  const [modules, setModules] = useState<ModuleState[]>(BASE_MODULES)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const timeline = useMemo(() => {
    const events: { at: number; run: () => void }[] = []
    const push = (at: number, run: () => void) => events.push({ at, run })

    // Digitação letra por letra da resposta do COS
    const typeCos = (text: string, startAt: number, cps = 34) => {
      const step = 1000 / cps
      for (let i = 1; i <= text.length; i++) {
        push(startAt + i * step, () => setCosDraft(text.slice(0, i)))
      }
      return startAt + text.length * step
    }

    const setModule = (key: string, status: string) =>
      setModules((prev) =>
        prev.map((m) => (m.key === key ? { ...m, status, active: true } : { ...m, active: false })),
      )

    // ---- Cena 1: cadastrar cliente ----
    push(500, () =>
      setMessages([
        {
          id: 1,
          role: 'user',
          text: 'Cadastrar um cliente chamado João da Silva, email joao@email.com, telefone (11) 99999-9999',
          time: '09:41',
        },
      ]),
    )
    push(1400, () => setTyping(true))
    let t = 2300
    push(t, () => {
      setTyping(false)
      setCosDraft('')
    })
    t = typeCos('Cliente cadastrado com sucesso.', t + 100)
    push(t + 120, () => {
      setMessages((prev) => [
        ...prev,
        { id: 2, role: 'cos', text: 'Cliente cadastrado com sucesso.', time: '09:41' },
      ])
      setCosDraft('')
    })
    push(t + 320, () => setShowClientCard(true))
    push(t + 520, () => setModule('clientes', 'Atualizado agora'))

    // ---- Cena 2: gerar contrato ----
    const s2 = t + 2100
    push(s2, () =>
      setMessages((prev) => [
        ...prev,
        {
          id: 3,
          role: 'user',
          text: 'Gerar um contrato de prestação de serviços para ele.',
          time: '09:42',
        },
      ]),
    )
    push(s2 + 900, () => setTyping(true))
    let t2 = s2 + 1800
    push(t2, () => {
      setTyping(false)
      setCosDraft('')
    })
    t2 = typeCos('Contrato criado com sucesso.', t2 + 100)
    push(t2 + 120, () => {
      setMessages((prev) => [
        ...prev,
        { id: 4, role: 'cos', text: 'Contrato criado com sucesso.', time: '09:42' },
      ])
      setCosDraft('')
    })
    push(t2 + 320, () => {
      setShowDocCard(true)
      setDocProgress(0)
    })
    for (let p = 1; p <= 10; p++) {
      push(t2 + 320 + p * 90, () => setDocProgress(p * 10))
    }
    push(t2 + 1400, () => setModule('documentos', 'Criado agora'))

    const total = t2 + 4200
    return { events, total }
  }, [])

  useEffect(() => {
    let cancelled = false

    const reset = () => {
      setMessages([])
      setTyping(false)
      setCosDraft('')
      setShowClientCard(false)
      setShowDocCard(false)
      setDocProgress(0)
      setModules(BASE_MODULES)
    }

    const runCycle = () => {
      if (cancelled) return
      reset()
      timeline.events.forEach(({ at, run }) => {
        timers.current.push(setTimeout(run, at))
      })
      timers.current.push(setTimeout(runCycle, timeline.total))
    }

    runCycle()

    return () => {
      cancelled = true
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [timeline])

  return (
    <div className="[perspective:1600px]">
      <div className="animate-float [transform:rotateX(3deg)_rotateY(-6deg)] [transform-style:preserve-3d]">
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_50px_100px_-40px_rgba(24,20,50,0.5)]">
          {/* brilho discreto no topo */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/60 to-transparent" />

          {/* Barra da janela */}
          <div className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
            </div>
            <div className="mx-auto flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border-2 border-brand" />
              <span className="text-[11px] font-medium text-muted-foreground">app.cos.com</span>
            </div>
            <div className="w-[52px]" aria-hidden />
          </div>

          {/* Conteúdo: chat + módulos */}
          <div className="grid grid-cols-[1fr_150px] gap-0 bg-gradient-to-br from-muted/30 to-background sm:grid-cols-[1fr_170px]">
            {/* Chat */}
            <div className="min-h-[330px] space-y-3 p-4 sm:min-h-[360px]">
              {messages.map((m) => (
                <div key={m.id} className="animate-pop-in">
                  {m.role === 'user' ? (
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Users className="size-3 text-muted-foreground" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-brand">Você</p>
                        <p className="mt-0.5 text-pretty text-xs leading-relaxed text-foreground">
                          {m.text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-brand/30">
                        <span className="size-2.5 rounded-full border-2 border-brand" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-semibold text-foreground">COS</p>
                          <span className="text-[10px] text-muted-foreground">{m.time}</span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{m.text}</p>
                      </div>
                    </div>
                  )}

                  {/* Card de cliente logo após a 1ª resposta */}
                  {m.id === 2 && showClientCard && (
                    <div className="ml-8 mt-2 animate-pop-in rounded-lg border border-border/70 bg-background p-2.5 shadow-sm">
                      <p className="text-xs font-semibold text-foreground">João da Silva</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        joao@email.com • (11) 99999-9999
                      </p>
                    </div>
                  )}

                  {/* Card de documento após a 2ª resposta */}
                  {m.id === 4 && showDocCard && (
                    <div className="ml-8 mt-2 animate-pop-in rounded-lg border border-border/70 bg-background p-2.5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-md bg-red-500/10">
                          <FileText className="size-3.5 text-red-500" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-foreground">
                            Contrato_Joao_Silva.pdf
                          </p>
                          <p className="text-[10px] text-muted-foreground">PDF • 245 KB</p>
                        </div>
                        <Download className="size-3.5 text-muted-foreground" />
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand transition-all duration-200 ease-out"
                          style={{ width: `${docProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Digitando */}
              {typing && (
                <div className="flex items-center gap-2 pl-8">
                  <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1.5 rounded-full bg-muted-foreground"
                        style={{ animation: 'cos-typing-dot 1.2s ease-in-out infinite', animationDelay: `${i * 0.16}s` }}
                      />
                    ))}
                  </span>
                </div>
              )}

              {/* Rascunho sendo digitado letra por letra */}
              {cosDraft && !typing && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-brand/30">
                    <span className="size-2.5 rounded-full border-2 border-brand" />
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {cosDraft}
                    <span className="ml-0.5 inline-block h-3 w-px translate-y-0.5 bg-brand animate-caret" />
                  </p>
                </div>
              )}
            </div>

            {/* Módulos em ação */}
            <div className="border-l border-border/60 bg-background/70 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Módulos em ação
              </p>
              <ul className="space-y-1.5">
                {modules.map((m) => {
                  const Icon = m.icon
                  return (
                    <li
                      key={m.key}
                      className={`flex items-center gap-2 rounded-lg border p-1.5 transition-colors duration-300 ${
                        m.active ? 'border-brand/40 bg-brand/5' : 'border-transparent'
                      }`}
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors duration-300 ${
                          m.active ? 'bg-brand/15 text-brand' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="size-3" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-foreground">{m.label}</p>
                        <p
                          className={`truncate text-[9px] transition-colors duration-300 ${
                            m.active ? 'text-brand' : 'text-muted-foreground'
                          }`}
                        >
                          {m.status}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
