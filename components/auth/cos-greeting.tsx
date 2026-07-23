'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Narrativa contínua do COS — uma presença, não um slideshow.
 *
 * A linha do tempo é ancorada em um módulo (fora do React), então continua
 * exatamente de onde estava mesmo que o componente remonte ao navegar entre
 * Cadastro e Login. Combinada ao layout compartilhado (route group), a
 * narrativa nunca reinicia — apenas o formulário à direita muda.
 *
 * Transições por morph/mask-reveal + rise + blur (nada de fade simples).
 */

type Beat =
  | { kind: 'intro'; you: string; me: string }
  | { kind: 'pair'; you: string; me: string }

const BEATS: Beat[] = [
  { kind: 'intro', you: 'Olá.', me: 'Eu sou o COS.' },
  { kind: 'pair', you: 'Você conversa.', me: 'Eu executo.' },
  { kind: 'pair', you: 'Você cria.', me: 'Eu organizo.' },
  { kind: 'pair', you: 'Você decide.', me: 'Eu preparo.' },
  { kind: 'pair', you: 'Você vive.', me: 'Eu trabalho.' },
  { kind: 'pair', you: 'Você descansa.', me: 'Eu continuo.' },
]

// Ritmo contínuo e editorial — tempo generoso de leitura, sem longas pausas mortas.
const CYCLE = 3600 // duração total de cada batida (ms)

// Âncora global da linha do tempo (persiste entre navegações login <-> cadastro).
let timelineStart: number | null = null
function elapsedNow() {
  if (typeof performance === 'undefined') return 0
  if (timelineStart == null) timelineStart = performance.now()
  return performance.now() - timelineStart
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Índice da batida em reprodução; a intro toca só uma vez, depois faz loop pelos pares. */
function beatIndexFromStep(step: number) {
  if (step < BEATS.length) return step
  const looped = (step - BEATS.length) % (BEATS.length - 1)
  return 1 + looped
}

export function CosGreeting() {
  // Estado inicial determinístico (0) — igual no servidor e no primeiro render do
  // cliente, evitando hydration mismatch. O relógio só avança após montar.
  const [elapsed, setElapsed] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => {
      setElapsed(elapsedNow())
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
    }
  }, [])

  const step = Math.floor(elapsed / CYCLE)
  const t = (elapsed % CYCLE) / CYCLE // 0..1 dentro da batida
  const index = beatIndexFromStep(step)
  const beat = BEATS[index]
  const loopPos = index // posição para o indicador

  // Envelopes de entrada (mask-reveal) e saída (rise + blur), escalonados por linha.
  const enter1 = smoothstep(0, 0.22, t)
  const enter2 = smoothstep(0.1, 0.36, t)
  const exit = smoothstep(0.86, 1, t)

  const isIntro = beat.kind === 'intro'

  return (
    <div className="relative flex w-full max-w-2xl flex-col justify-center">
      {/* Palco com altura fixa para não haver saltos entre batidas */}
      <div className="relative flex min-h-[16rem] items-center md:min-h-[20rem]">
        <div key={index} className="w-full">
          <div className="space-y-1 md:space-y-2">
            {/* Linha "Você…" — tom suave, presença editorial */}
            <RevealLine
              enter={enter1}
              exit={exit}
              className={cn(
                'font-medium tracking-[-0.03em] text-muted-foreground',
                'text-5xl md:text-7xl',
              )}
            >
              {beat.you}
            </RevealLine>

            {/* Linha "Eu…" — protagonista, com o ponto final em quadrado roxo */}
            <RevealLine
              enter={enter2}
              exit={exit}
              className={cn(
                'font-semibold tracking-[-0.03em]',
                'text-5xl md:text-7xl',
                isIntro ? 'text-brand' : 'text-foreground',
              )}
              accentDot={!isIntro}
            >
              {beat.me}
            </RevealLine>
          </div>
        </div>
      </div>

      {/* Indicador de progresso muito discreto */}
      <div className="mt-16 flex items-center gap-1.5" aria-hidden>
        {BEATS.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-[3px] rounded-full transition-all duration-700 ease-out',
              i === loopPos ? 'w-8 bg-brand' : 'w-1.5 bg-border',
            )}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Uma linha revelada por máscara: sobe, clareia o desfoque e é desmascarada
 * de baixo para cima (clip-path). Na saída, sobe levemente e desfoca.
 *
 * Quando `accentDot` é verdadeiro, o ponto final vira um pequeno quadrado roxo,
 * substituindo o "." do texto pela assinatura visual do COS.
 */
function RevealLine({
  enter,
  exit,
  className,
  accentDot = false,
  children,
}: {
  enter: number
  exit: number
  className?: string
  accentDot?: boolean
  children: string
}) {
  const y = (1 - enter) * 20 - exit * 24 // px: entra de baixo, sai por cima
  const blur = (1 - enter) * 10 + exit * 8
  const opacity = enter * (1 - exit)
  const clipTop = (1 - enter) * 100 // máscara revelando de baixo p/ cima

  // Se a frase termina com ponto, trocamos por um quadrado roxo (acento do COS).
  const hasDot = accentDot && children.trimEnd().endsWith('.')
  const label = hasDot ? children.trimEnd().slice(0, -1) : children

  return (
    <span
      className={cn('block text-balance will-change-transform', className)}
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
        clipPath: `inset(${clipTop}% 0 -0.18em 0)`,
        WebkitClipPath: `inset(${clipTop}% 0 -0.18em 0)`,
      }}
    >
      {label}
      {hasDot && (
        <span
          aria-hidden
          className="ml-[0.12em] inline-block size-[0.5em] translate-y-[0.02em] rounded-[0.12em] bg-brand align-baseline"
        />
      )}
    </span>
  )
}
