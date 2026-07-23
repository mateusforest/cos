import { ChatDemo } from '@/components/chat-demo'

export function TrySection() {
  return (
    <section id="recursos" className="relative overflow-hidden bg-muted/30 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Experimente na prática
          </p>
          <h2 className="mt-5 text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            Teste o COS agora mesmo
          </h2>
          <p className="mt-4 max-w-lg text-pretty leading-relaxed text-muted-foreground">
            Faça um teste real e veja como o COS entende suas solicitações e entrega resultados.
          </p>
        </div>

        <div className="mt-10 md:mt-12">
          <ChatDemo />
        </div>
      </div>
    </section>
  )
}
