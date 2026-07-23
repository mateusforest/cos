'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeroLiveDemo } from '@/components/hero-live-demo'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress

function smooth(edge0: number, edge1: number, value: number) {
  const progress = clamp01((value - edge0) / (edge1 - edge0))
  return progress * progress * (3 - 2 * progress)
}

export function Hero() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0

    const handleScroll = () => {
      if (frame) return

      frame = requestAnimationFrame(() => {
        frame = 0
        const element = trackRef.current
        if (!element) return

        const rect = element.getBoundingClientRect()
        const total = rect.height - window.innerHeight
        const scrolled = Math.min(Math.max(-rect.top, 0), total)
        setProgress(total > 0 ? scrolled / total : 0)
      })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const depth = smooth(0, 0.42, progress)
  const reveal = smooth(0.18, 0.66, progress)
  const ui = smooth(0.55, 0.9, progress)
  const glow = smooth(0.32, 0.74, progress)
  const line2TranslateY = (1 - reveal) * 0.42
  const line2Blur = (1 - reveal) * 10
  const mockScale = lerp(0.86, 1, depth)
  const mockBlur = lerp(12, 0, smooth(0, 0.55, progress))
  const mockOpacity = smooth(0, 0.22, progress)
  const mockTranslateY = lerp(8, 0, depth) - progress * 8

  return (
    <section id="sobre" aria-label="Você conversa. O COS executa." className="relative">
      <div ref={trackRef} className="relative h-[210vh]">
        <div className="sticky top-0 flex min-h-screen items-center overflow-hidden">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  style={{ opacity: lerp(0.5, 1, reveal) }}
                >
                  Software operacional conversacional
                </p>

                <h1 className="mt-5 text-balance text-5xl font-medium leading-[1.05] tracking-tight text-foreground md:text-6xl">
                  <span className="block">Você conversa.</span>
                  <span
                    className="mt-1 block will-change-transform"
                    style={{
                      opacity: reveal,
                      transform: `translateY(${line2TranslateY}em)`,
                      filter: line2Blur > 0.15 ? `blur(${line2Blur}px)` : undefined,
                    }}
                  >
                    O{' '}
                    <span
                      className="text-brand"
                      style={{
                        textShadow: `0 0 ${glow * 22}px color-mix(in oklch, var(--brand) ${glow * 45}%, transparent)`,
                      }}
                    >
                      COS
                    </span>{' '}
                    executa.
                  </span>
                </h1>

                <div style={{ opacity: ui, transform: `translateY(${(1 - ui) * 12}px)` }}>
                  <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
                    O primeiro software operacional conversacional que entende o contexto do seu
                    negócio e executa ações em todos os módulos por você.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Button asChild className="h-12 rounded-full px-6 text-sm" data-icon="inline-end">
                      <Link href="/cadastro">
                        Experimentar agora
                        <ArrowRight className="size-4" data-icon="inline-end" />
                      </Link>
                    </Button>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-brand"
                    >
                      Acessar o COS
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="lg:pl-4">
                <div
                  className="will-change-transform"
                  style={{
                    transform: `translateY(${mockTranslateY}px) scale(${mockScale})`,
                    filter: mockBlur > 0.2 ? `blur(${mockBlur}px)` : undefined,
                    opacity: mockOpacity,
                  }}
                >
                  <HeroLiveDemo />
                  <div
                    aria-hidden
                    className="pointer-events-none mx-auto mt-3 h-24 w-[85%] rounded-[50%] blur-2xl"
                    style={{
                      background:
                        'radial-gradient(ellipse at center, color-mix(in oklch, var(--brand) 18%, transparent), transparent 70%)',
                      opacity: depth * 0.6,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
