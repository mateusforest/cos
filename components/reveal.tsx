'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
function smooth(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * Revelação contínua dirigida pelo scroll.
 *
 * O elemento começa a reagir bem antes de entrar totalmente no viewport
 * (faixa de progresso ampla) e assenta suavemente, combinando translateY
 * pequeno, blur inicial, ganho de opacidade e leve mudança de escala.
 * Nunca "surge" de uma vez — acompanha o scroll.
 */
export function Reveal({
  children,
  className,
  /** Distância vertical inicial (px). Mantida pequena por padrão. */
  distance = 26,
  /** Blur inicial (px). */
  blur = 8,
  /** Escala inicial (leve profundidade). */
  scaleFrom = 0.985,
}: {
  children: ReactNode
  className?: string
  distance?: number
  blur?: number
  scaleFrom?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [p, setP] = useState(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const vh = window.innerHeight
        // Começa quando o topo ainda está ~15% abaixo do fim do viewport
        // e conclui quando o elemento subiu ~35% da tela: progresso amplo.
        const start = vh * 0.9
        const end = vh * 0.35
        setP(smooth(start, end, rect.top))
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

  const b = (1 - p) * blur

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: p,
        transform: `translate3d(0, ${(1 - p) * distance}px, 0) scale(${scaleFrom + (1 - scaleFrom) * p})`,
        filter: b > 0.15 ? `blur(${b}px)` : undefined,
        willChange: 'transform, opacity, filter',
      }}
    >
      {children}
    </div>
  )
}
