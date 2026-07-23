'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* Utilidades de animação (mesmo padrão premium da hero e do product) */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
function smooth(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

const PLAN_ITEMS = [
  'Preparar os contratos',
  'Organizar os documentos',
  'Criar os clientes pendentes',
  'Revisar pendências',
  'Montar a apresentação',
  'Estruturar a campanha',
  'Preparar a reunião de amanhã',
]

const NIGHT_ACTIVITIES = [
  'Contrato preparado',
  'Documento organizado',
  'Cliente criado',
  'Campanha estruturada',
  'Reunião preparada',
  'Pendências revisadas',
]

export function RestSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = trackRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const total = rect.height - window.innerHeight
        const scrolled = Math.min(Math.max(-rect.top, 0), total)
        setProgress(total > 0 ? scrolled / total : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const scrollToEnd = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const total = el.offsetHeight - window.innerHeight
    const top = window.scrollY + el.getBoundingClientRect().top
    window.scrollTo({ top: top + total, behavior: 'smooth' })
  }, [])

  // Quatro momentos, com cross-fade contínuo (nada some bruscamente).
  // Faixas mais amplas => maior sobreposição entre cenas, transição cinematográfica.
  const introO = 1 - smooth(0.12, 0.24, progress)
  const chatO = smooth(0.14, 0.27, progress) * (1 - smooth(0.4, 0.52, progress))
  const nightO = smooth(0.41, 0.54, progress) * (1 - smooth(0.67, 0.77, progress))
  const morningO = smooth(0.68, 0.8, progress)

  return (
    <section aria-label="Enquanto você descansa">
      <div ref={trackRef} className="relative h-[540vh]">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
            <div className="relative min-h-[70vh]">
              {/* ETAPA 1 — Abertura */}
              <Overlay opacity={introO}>
                <IntroStage progress={progress} />
              </Overlay>

              {/* ETAPA 2 — A conversa */}
              <Overlay opacity={chatO}>
                <ChatStage progress={progress} />
              </Overlay>

              {/* ETAPA 3 — A noite */}
              <Overlay opacity={nightO}>
                <NightStage progress={progress} />
              </Overlay>

              {/* ETAPA 4 — A manhã */}
              <Overlay opacity={morningO}>
                <MorningStage progress={progress} onCta={scrollToEnd} />
              </Overlay>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Camada absoluta centralizada com cross-fade; não captura cliques quando invisível. */
function Overlay({ opacity, children }: { opacity: number; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ opacity, pointerEvents: opacity > 0.5 ? 'auto' : 'none' }}
      aria-hidden={opacity <= 0.5}
    >
      <div className="w-full">{children}</div>
    </div>
  )
}

/** Linha revelada de forma fluida: sobe, clareia (blur -> 0) e faz fade suave. */
function RevealLine({
  reveal,
  className,
  children,
}: {
  reveal: number
  className?: string
  children: React.ReactNode
}) {
  const blur = (1 - reveal) * 8
  return (
    <span
      className={cn('block will-change-transform', className)}
      style={{
        opacity: reveal,
        transform: `translateY(${(1 - reveal) * 0.4}em)`,
        filter: blur > 0.15 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </span>
  )
}

/**
 * ETAPA 1 — "ENQUANTO VOCÊ DESCANSA" surge lentamente,
 * depois se revela "Você vai embora. O COS continua trabalhando."
 */
function IntroStage({ progress }: { progress: number }) {
  const eyebrow = smooth(0.01, 0.07, progress)
  const l1 = smooth(0.07, 0.13, progress)
  const l2 = smooth(0.13, 0.19, progress)

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <span
        className="text-xs font-semibold uppercase tracking-[0.32em] text-brand will-change-transform"
        style={{
          opacity: eyebrow,
          transform: `translateY(${(1 - eyebrow) * 0.6}em)`,
          filter: (1 - eyebrow) * 6 > 0.15 ? `blur(${(1 - eyebrow) * 6}px)` : undefined,
        }}
      >
        Enquanto você descansa
      </span>

      <h2 className="mt-8 text-balance text-4xl font-medium leading-[1.1] tracking-tight text-foreground md:text-6xl">
        <RevealLine reveal={l1}>Você vai embora.</RevealLine>
        <RevealLine reveal={l2} className="mt-2 text-muted-foreground">
          O COS continua trabalhando.
        </RevealLine>
      </h2>
    </div>
  )
}

/**
 * ETAPA 2 — A conversa. O usuário pede; o COS responde e lista o plano,
 * item por item, progressivamente conforme o scroll. Ao final: "Plano criado."
 */
function ChatStage({ progress }: { progress: number }) {
  // Faixa útil da etapa 2: ~0.27 -> ~0.46
  const userMsg = smooth(0.27, 0.31, progress)
  const cosIntro = smooth(0.31, 0.35, progress)
  // Os 7 itens surgem um a um entre 0.35 e 0.45
  const itemsStart = 0.35
  const itemsEnd = 0.45
  const per = (itemsEnd - itemsStart) / PLAN_ITEMS.length
  const done = smooth(0.45, 0.47, progress)

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-col gap-6">
        {/* Usuário */}
        <Bubble side="user" reveal={userMsg}>
          Preciso deixar tudo pronto para amanhã.
        </Bubble>

        {/* COS */}
        <Bubble side="cos" reveal={cosIntro}>
          <p className="font-medium text-foreground">Entendido. Vou:</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {PLAN_ITEMS.map((item, i) => {
              const r = smooth(itemsStart + i * per, itemsStart + i * per + per, progress)
              return (
                <li
                  key={item}
                  className="flex items-center gap-2.5 will-change-transform"
                  style={{
                    opacity: r,
                    transform: `translateY(${(1 - r) * 8}px)`,
                  }}
                >
                  <Check className="size-4 shrink-0 text-brand" />
                  <span className="text-foreground">{item}</span>
                </li>
              )
            })}
          </ul>
          <p
            className="mt-4 font-medium text-brand will-change-transform"
            style={{ opacity: done, transform: `translateY(${(1 - done) * 8}px)` }}
          >
            Plano criado.
          </p>
        </Bubble>
      </div>
    </div>
  )
}

/** Balão de conversa minimalista (sem card pesado). */
function Bubble({
  side,
  reveal,
  children,
}: {
  side: 'user' | 'cos'
  reveal: number
  children: React.ReactNode
}) {
  const blur = (1 - reveal) * 6
  return (
    <div
      className={cn('flex', side === 'user' ? 'justify-end' : 'justify-start')}
      style={{
        opacity: reveal,
        transform: `translateY(${(1 - reveal) * 12}px)`,
        filter: blur > 0.15 ? `blur(${blur}px)` : undefined,
      }}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-relaxed',
          side === 'user'
            ? 'bg-muted text-foreground'
            : 'border border-border/60 bg-background text-muted-foreground shadow-[0_16px_50px_-30px_rgba(24,20,50,0.4)]',
        )}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * ETAPA 3 — A noite. "23:47 / Enquanto você descansa..." e pequenas
 * atividades acontecendo. No canto: "Executando... / 23 tarefas restantes"
 * com o contador diminuindo lentamente conforme o scroll.
 */
function NightStage({ progress }: { progress: number }) {
  const heading = smooth(0.53, 0.58, progress)
  const listStart = 0.58
  const listEnd = 0.7
  const per = (listEnd - listStart) / NIGHT_ACTIVITIES.length

  // Contador: 23 -> 0 ao longo da faixa noturna.
  const countProg = smooth(0.56, 0.72, progress)
  const remaining = Math.max(0, Math.round(23 * (1 - countProg)))
  const statusO = smooth(0.57, 0.62, progress)

  return (
    <div className="relative flex flex-col items-center justify-center text-center">
      <span
        className="text-sm font-medium tabular-nums tracking-[0.2em] text-muted-foreground will-change-transform"
        style={{ opacity: heading, transform: `translateY(${(1 - heading) * 0.5}em)` }}
      >
        23:47
      </span>
      <h2
        className="mt-4 text-balance text-3xl font-medium tracking-tight text-foreground md:text-5xl will-change-transform"
        style={{
          opacity: heading,
          transform: `translateY(${(1 - heading) * 0.4}em)`,
          filter: (1 - heading) * 8 > 0.15 ? `blur(${(1 - heading) * 8}px)` : undefined,
        }}
      >
        Enquanto você descansa
        <span className="text-muted-foreground">...</span>
      </h2>

      <ul className="mt-10 flex flex-col items-center gap-3">
        {NIGHT_ACTIVITIES.map((item, i) => {
          const r = smooth(listStart + i * per, listStart + i * per + per, progress)
          return (
            <li
              key={item}
              className="flex items-center gap-2.5 text-[15px] text-muted-foreground will-change-transform"
              style={{ opacity: r * 0.85, transform: `translateY(${(1 - r) * 8}px)` }}
            >
              <Check className="size-4 shrink-0 text-brand/70" />
              {item}
            </li>
          )
        })}
      </ul>

      {/* Indicador discreto no canto */}
      <div
        className="pointer-events-none fixed bottom-8 right-8 hidden items-center gap-2.5 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-xs text-muted-foreground backdrop-blur md:flex"
        style={{ opacity: statusO }}
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-2 animate-live-pulse rounded-full bg-brand/60" />
          <span className="relative inline-flex size-2 rounded-full bg-brand" />
        </span>
        <span className="font-medium text-foreground">Executando</span>
        <span className="tabular-nums">{remaining} tarefas restantes</span>
      </div>
    </div>
  )
}

/**
 * ETAPA 4 — A manhã. "08:03 / Bom dia." + resumo do que o COS fez,
 * a frase de encerramento e o CTA.
 */
function MorningStage({
  progress,
  onCta,
}: {
  progress: number
  onCta: () => void
}) {
  const heading = smooth(0.79, 0.84, progress)
  const summaryStart = 0.83
  const summaryEnd = 0.92
  const closing = smooth(0.9, 0.95, progress)
  const cta = smooth(0.93, 0.98, progress)

  const summary = [
    { icon: 'check', text: '18 tarefas concluídas' },
    { icon: 'check', text: '4 documentos preparados' },
    { icon: 'check', text: '3 clientes cadastrados' },
    { icon: 'warn', text: '2 ações aguardam sua confirmação' },
    { icon: 'date', text: 'Reunião preparada para hoje' },
  ]
  const per = (summaryEnd - summaryStart) / summary.length

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <span
        className="text-sm font-medium tabular-nums tracking-[0.2em] text-muted-foreground will-change-transform"
        style={{ opacity: heading, transform: `translateY(${(1 - heading) * 0.5}em)` }}
      >
        08:03
      </span>
      <h2
        className="mt-4 text-balance text-4xl font-medium tracking-tight text-foreground md:text-6xl will-change-transform"
        style={{
          opacity: heading,
          transform: `translateY(${(1 - heading) * 0.4}em)`,
          filter: (1 - heading) * 8 > 0.15 ? `blur(${(1 - heading) * 8}px)` : undefined,
        }}
      >
        Bom dia.
      </h2>

      <p
        className="mt-8 text-sm text-muted-foreground will-change-transform"
        style={{ opacity: smooth(0.82, 0.86, progress) }}
      >
        Enquanto você esteve fora:
      </p>

      <ul className="mt-4 flex flex-col items-center gap-2.5">
        {summary.map((row, i) => {
          const r = smooth(summaryStart + i * per, summaryStart + i * per + per, progress)
          return (
            <li
              key={row.text}
              className="flex items-center gap-2.5 text-[15px] md:text-base will-change-transform"
              style={{ opacity: r, transform: `translateY(${(1 - r) * 8}px)` }}
            >
              {row.icon === 'check' && <Check className="size-4 shrink-0 text-brand" />}
              {row.icon === 'warn' && (
                <span className="grid size-4 shrink-0 place-items-center rounded-full text-[11px] font-bold text-amber-500">
                  !
                </span>
              )}
              {row.icon === 'date' && (
                <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden />
              )}
              <span
                className={cn(
                  row.icon === 'warn' ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {row.text}
              </span>
            </li>
          )
        })}
      </ul>

      {/* Encerramento */}
      <p
        className="mt-12 text-balance text-2xl font-medium leading-snug tracking-tight text-foreground md:text-3xl will-change-transform"
        style={{
          opacity: closing,
          transform: `translateY(${(1 - closing) * 0.4}em)`,
          filter: (1 - closing) * 8 > 0.15 ? `blur(${(1 - closing) * 8}px)` : undefined,
        }}
      >
        Você descansa.
        <br />
        <span className="text-brand">O COS continua trabalhando.</span>
      </p>

      {/* CTA */}
      <div
        className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 will-change-transform"
        style={{ opacity: cta, transform: `translateY(${(1 - cta) * 12}px)` }}
      >
        <Button onClick={onCta} className="h-12 rounded-full px-6 text-sm" data-icon="inline-end">
          Quero deixar um plano para o COS
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
        <a
          href="#"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-brand"
        >
          Experimentar agora
          <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  )
}
