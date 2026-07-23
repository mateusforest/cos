'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
function smooth(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * Ações que o COS realiza. `strong: true` recebe destaque muito discreto
 * (cor cheia do texto), o restante fica em tom suave.
 */
const ACTIONS: { label: string; strong?: boolean }[] = [
  { label: 'Analisa reuniões' },
  { label: 'Gera contratos', strong: true },
  { label: 'Cria propostas' },
  { label: 'Organiza documentos' },
  { label: 'Cadastra clientes', strong: true },
  { label: 'Prepara apresentações' },
  { label: 'Estrutura campanhas' },
  { label: 'Acompanha pendências' },
  { label: 'Analisa desempenho', strong: true },
  { label: 'Atualiza informações' },
  { label: 'Qualifica' },
  { label: 'Notifica' },
  { label: 'Atende' },
  { label: 'Prepara reuniões' },
  { label: 'Trabalha enquanto você descansa', strong: true },
]

export function ActionsBand() {
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

  // Easing ease-in-out no próprio deslocamento: acelera e desacelera de forma
  // orgânica em vez de acompanhar o scroll de forma linear/abrupta.
  const eased = progress * progress * (3 - 2 * progress)
  // A linha atravessa a tela conforme o scroll: entra pela direita, cruza
  // lentamente e sai pela esquerda. Distância menor => movimento mais leve.
  const x = 8 - eased * 60
  // A faixa como um todo respira: quase transparente ao entrar/sair, forte no meio.
  const bandO = smooth(0, 0.18, progress) * (1 - smooth(0.82, 1, progress))

  return (
    <section aria-label="O que o COS faz">
      <div ref={trackRef} className="relative h-[380vh]">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          {/* Máscara de transparência horizontal: bordas somem em névoa suave */}
          <div
            className="w-full [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]"
            style={{ opacity: bandO }}
          >
            <div
              className="flex w-max flex-nowrap items-center gap-6 whitespace-nowrap will-change-transform md:gap-9"
              style={{ transform: `translate3d(${x}%, 0, 0)` }}
            >
              {ACTIONS.map((a, i) => (
                <span key={a.label} className="flex items-center gap-6 md:gap-9">
                  <span
                    className={cn(
                      'text-3xl font-medium tracking-tight md:text-5xl',
                      a.strong ? 'text-foreground' : 'text-muted-foreground/70',
                    )}
                  >
                    {a.label}
                  </span>
                  {i < ACTIONS.length - 1 && (
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full bg-border md:size-2"
                    />
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
