'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { OperationsMockup } from '@/components/operations-mockup'
import { ConnectMockup } from '@/components/connect-mockup'
import { cn } from '@/lib/utils'

/* Utilidades de animação */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
function smooth(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

type Stage = 'operations' | 'connect'

const STAGES: Record<
  Stage,
  { title: string; support: string }
> = {
  operations: {
    title: 'Gerencie seu negócio por conversa.',
    support: 'Clientes. Financeiro. Documentos. Equipe. Reuniões.',
  },
  connect: {
    title: 'Conecte o COS aos seus sistemas.',
    support: 'ERPs. CRMs. Planilhas. APIs. Bancos de dados.',
  },
}

export function ProductSection() {
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

  // Envelopes contínuos (cross-fade — nada some bruscamente).
  // Faixas mais amplas => maior sobreposição entre cenas, transição cinematográfica.
  const introO = 1 - smooth(0.28, 0.4, progress)
  const productO = smooth(0.29, 0.42, progress) * (1 - smooth(0.8, 0.92, progress))
  const outroO = smooth(0.81, 0.93, progress)

  // Mistura Operations -> Connect (0 = Operations, 1 = Connect)
  const mix = smooth(0.46, 0.56, progress)
  // Sino de transição: recuo/blur máximos no meio da troca
  const swap = Math.sin(clamp01(mix) * Math.PI)

  const activeStage: Stage = mix < 0.5 ? 'operations' : 'connect'
  const phaseLabel =
    progress < 0.36 ? 'intro' : progress > 0.83 ? 'outro' : activeStage

  const goTo = useCallback((target: number) => {
    const el = trackRef.current
    if (!el) return
    const total = el.offsetHeight - window.innerHeight
    const top = window.scrollY + el.getBoundingClientRect().top
    window.scrollTo({ top: top + total * target, behavior: 'smooth' })
  }, [])

  return (
    <section id="solucoes" aria-label="Um sistema, duas formas de operar">
      <div ref={trackRef} className="relative h-[440vh]">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
            {/* Indicadores discretos */}
            <div
              className="flex items-center justify-center gap-2 transition-opacity duration-500"
              style={{ opacity: productO }}
            >
              <Indicator
                label="Operations"
                active={phaseLabel === 'operations'}
                onClick={() => goTo(0.32)}
              />
              <span className="h-px w-6 bg-border" aria-hidden />
              <Indicator
                label="Connect"
                active={phaseLabel === 'connect'}
                onClick={() => goTo(0.68)}
              />
            </div>

            {/* Palco: as três cenas coexistem e fazem cross-fade */}
            <div className="relative mt-10 min-h-[62vh] md:mt-14">
              {/* Intro */}
              <Overlay opacity={introO}>
                <IntroStage progress={progress} />
              </Overlay>

              {/* Produto (Operations <-> Connect com transição física) */}
              <Overlay opacity={productO}>
                <ProductStage
                  stage={activeStage}
                  mix={mix}
                  swap={swap}
                />
              </Overlay>

              {/* Outro */}
              <Overlay opacity={outroO}>
                <OutroStage />
              </Overlay>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Camada absoluta centralizada com cross-fade e sem capturar cliques quando invisível. */
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

function Indicator({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-300',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full transition-colors duration-300',
          active ? 'bg-brand' : 'bg-border',
        )}
      />
      {label}
    </button>
  )
}

/**
 * Cena de produto contínua.
 * - O texto troca com split-text + stagger (remonta ao mudar de etapa).
 * - Os dois mockups ficam sobrepostos e fazem cross-fade (o vídeo nunca para).
 * - Durante a troca, o palco recua levemente e ganha blur, retornando ao final.
 */
function ProductStage({
  stage,
  mix,
  swap,
}: {
  stage: Stage
  mix: number
  swap: number
}) {
  const data = STAGES[stage]
  const mockScale = 1 - 0.05 * swap
  const mockBlur = 6 * swap
  const mockShift = 8 * swap

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
      {/* Texto */}
      <div
        className="order-2 lg:order-1"
        style={{ transform: `translateX(${swap * -6}px)` }}
      >
        <h2
          key={`t-${stage}`}
          className="text-balance text-4xl font-medium leading-[1.05] tracking-tight text-foreground md:text-5xl"
        >
          <SplitText text={data.title} />
        </h2>
        <p
          key={`s-${stage}`}
          className="mt-5 text-pretty text-lg text-muted-foreground"
        >
          <SplitText text={data.support} baseDelay={0.18} />
        </p>
      </div>

      {/* Mockups sobrepostos com leve perspectiva */}
      <div className="relative order-1 [perspective:1600px] lg:order-2">
        <div
          className="will-change-transform"
          style={{
            transform: `scale(${mockScale}) translateY(${mockShift}px)`,
            filter: mockBlur > 0.2 ? `blur(${mockBlur}px)` : undefined,
          }}
        >
          <div className="[transform:rotateX(2deg)] [transform-style:preserve-3d] lg:[transform:rotateX(2deg)_rotateY(-3deg)]">
            {/* Operations */}
            <div style={{ opacity: 1 - mix }} aria-hidden={mix >= 0.5}>
              <OperationsMockup playing />
            </div>
            {/* Connect sobreposto */}
            <div
              className="absolute inset-0"
              style={{ opacity: mix }}
              aria-hidden={mix < 0.5}
            >
              <ConnectMockup playing />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Divide o texto em palavras animadas com stagger (split text premium). */
function SplitText({ text, baseDelay = 0 }: { text: string; baseDelay?: number }) {
  const words = text.split(' ')
  return (
    <>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="cos-word"
          style={{ animationDelay: `${baseDelay + i * 0.045}s` }}
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  )
}

/**
 * Intro dirigida pelo scroll: a primeira frase surge e, na sequência, a segunda.
 * Cada linha sobe suavemente e ganha nitidez (blur -> 0) — nunca aparece estática.
 */
function IntroStage({ progress }: { progress: number }) {
  const line1 = smooth(0.02, 0.11, progress)
  const line2 = smooth(0.15, 0.24, progress)

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <h2 className="text-balance text-4xl font-medium leading-[1.08] tracking-tight text-foreground md:text-6xl">
        <RevealLine reveal={line1}>Um sistema.</RevealLine>
        <RevealLine reveal={line2} className="mt-2 text-brand">
          Duas formas de operar.
        </RevealLine>
      </h2>
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

/** Encerramento narrativo. */
function OutroStage() {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <p className="max-w-3xl text-balance text-3xl font-medium leading-snug tracking-tight text-foreground md:text-4xl">
        Você pode operar dentro do COS.
        <br />
        <span className="text-muted-foreground">
          Ou levar o COS até onde sua empresa já opera.
        </span>
      </p>
    </div>
  )
}

