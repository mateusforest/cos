import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8 md:pb-28">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-muted/50 px-6 py-12 md:px-14 md:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-radial-gradient(circle at 100% 50%, var(--brand) 0, var(--brand) 1px, transparent 1px, transparent 22px)',
          }}
        />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <h2 className="text-balance text-2xl font-medium leading-snug tracking-tight text-foreground md:text-3xl">
              Pronto para transformar a operação da sua empresa?
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Converse com o COS e veja como é simples ter controle de tudo em uma única conversa.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4">
            <Button asChild className="h-12 rounded-full px-7 py-3.5 text-sm" data-icon="inline-end">
              <Link href="/cadastro">
                Começar agora gratuitamente
                <ArrowRight className="size-4" data-icon="inline-end" />
              </Link>
            </Button>
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-brand" />
              Não precisa de cartão de crédito
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
