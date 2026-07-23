'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Maximize2,
  X,
  Video,
  Mic,
  MonitorUp,
  PhoneOff,
  Lock,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  ListChecks,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type Insight = {
  id: string
  icon: typeof CheckCircle2
  title: string
  detail: string
}

const INSIGHTS: Insight[] = [
  { id: 'decisao', icon: CheckCircle2, title: 'Decisão identificada', detail: 'Aprovar proposta comercial' },
  { id: 'acao', icon: ListChecks, title: 'Nova ação criada', detail: 'Enviar contrato até sexta' },
  { id: 'resumo', icon: FileText, title: 'Resumo atualizado', detail: '3 pontos • 2 responsáveis' },
]

const CHAT: { id: number; author: string; text: string }[] = [
  { id: 1, author: 'Julia', text: 'Consigo ver sua tela perfeitamente.' },
  { id: 2, author: 'Mateus', text: 'Perfeito, vamos fechar a proposta então.' },
  { id: 3, author: 'Julia', text: 'Combinado! Pode gerar o contrato.' },
]

const TRACK_OPTIONS = [
  'Gravar reunião',
  'Extrair informações importantes',
  'Gerar relatório automático',
  'Acompanhar a reunião',
]

export function MeetRoom() {
  const [visibleInsights, setVisibleInsights] = useState<number>(0)
  const [visibleChat, setVisibleChat] = useState<number>(0)
  const [cycle, setCycle] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const chatRef = useRef<HTMLDivElement>(null)

  const startDemo = useCallback(() => {
    setCycle((value) => value + 1)
  }, [])

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setVisibleInsights(0)
    setVisibleChat(0)

    CHAT.forEach((_, index) => {
      timers.current.push(setTimeout(() => setVisibleChat(index + 1), 1400 + index * 1600))
    })
    INSIGHTS.forEach((_, index) => {
      timers.current.push(setTimeout(() => setVisibleInsights(index + 1), 2600 + index * 1900))
    })

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [cycle])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [visibleChat])

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-background shadow-[0_40px_90px_-45px_rgba(24,20,50,0.45)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-5 py-4 md:px-7 md:py-5">
        <div>
          <h3 className="text-lg font-medium tracking-tight text-foreground md:text-xl">
            Sala de vídeo do COS Meet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre na sala de demonstração do COS Meet e veja o acompanhamento inteligente em ação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Maximize2 className="size-3.5" />
            Tela cheia
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="p-5 md:p-7">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/50" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <p className="text-sm font-medium text-emerald-700">Conectado ao COS Meet.</p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <VideoTile name="Mateus" src="/meet-mateus.png" badge="Você" badgeTone="dark" />
              <VideoTile name="Julia" src="/meet-julia.png" badge="Ao vivo" badgeTone="live" />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold text-foreground">Chat da reunião</p>
                <div ref={chatRef} className="max-h-28 space-y-2 overflow-hidden">
                  {CHAT.slice(0, visibleChat).map((message) => (
                    <div key={message.id} className="animate-pop-in">
                      <p className="text-[11px] font-semibold text-brand">{message.author}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{message.text}</p>
                    </div>
                  ))}
                  {visibleChat < CHAT.length && (
                    <div className="flex items-center gap-1 pt-0.5">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="size-1.5 rounded-full bg-muted-foreground"
                          style={{
                            animation: 'cos-typing-dot 1.2s ease-in-out infinite',
                            animationDelay: `${index * 0.16}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {INSIGHTS.slice(0, visibleInsights).map(({ id, icon: Icon, title, detail }) => (
                  <div
                    key={id}
                    className="flex animate-pop-in items-start gap-2.5 rounded-2xl border border-brand/25 bg-brand/5 p-3"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
                    </div>
                  </div>
                ))}
                {visibleInsights === 0 && (
                  <div className="flex h-full min-h-[72px] items-center justify-center rounded-2xl border border-dashed border-border/70 p-3">
                    <p className="text-center text-[11px] text-muted-foreground">
                      O COS está acompanhando a reunião...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background p-4">
              <p className="text-sm font-semibold text-foreground">Participantes</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">Mateus</p>
                    <p className="text-xs text-muted-foreground">Você</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-live-pulse" />
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">Julia</p>
                    <p className="text-xs text-muted-foreground">Conectado</p>
                  </div>
                  <span className="flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground">
                    <X className="size-3.5" />
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">
                Deseja que o COS acompanhe esta reunião?
              </p>
              <ul className="mt-3 space-y-2" aria-disabled="true">
                {TRACK_OPTIONS.map((label) => (
                  <li key={label} className="flex items-center gap-2.5 rounded-lg px-1 py-1 opacity-60">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded border border-border bg-background" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3">
                <Lock className="size-3.5 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  Recursos disponíveis após criar sua conta.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-border/60 pt-5">
          <ControlChip icon={Video} label="Câmera ligada" />
          <ControlChip icon={Mic} label="Microfone ligado" />
          <ControlChip icon={MonitorUp} label="Compartilhar tela" />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-background px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10"
          >
            <PhoneOff className="size-4" />
            Sair
          </button>

          <div className="ml-auto flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={startDemo}
              className="h-11 rounded-full border-border/70 px-5 text-sm"
              data-icon="inline-start"
            >
              <Plus className="size-4" data-icon="inline-start" />
              Nova reunião
            </Button>
            <Link
              href="/cadastro"
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              Abrir sala
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function VideoTile({
  name,
  src,
  badge,
  badgeTone,
}: {
  name: string
  src: string
  badge: string
  badgeTone: 'dark' | 'live'
}) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
      <img src={src || '/placeholder.svg'} alt={`Vídeo de ${name}`} className="size-full object-cover" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
      <span className="absolute bottom-3 left-3 text-sm font-medium text-white drop-shadow">
        {name}
      </span>
      {badgeTone === 'dark' ? (
        <span className="absolute bottom-3 right-3 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          {badge}
        </span>
      ) : (
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          <span className="size-1.5 rounded-full bg-red-500 animate-live-pulse" />
          {badge}
        </span>
      )}
    </div>
  )
}

function ControlChip({
  icon: Icon,
  label,
}: {
  icon: typeof Video
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-4 py-2.5 text-sm font-medium text-foreground">
      <Icon className="size-4" />
      {label}
    </span>
  )
}
