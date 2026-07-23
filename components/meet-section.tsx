import { MeetRoom } from '@/components/meet-room'

export function MeetSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">COS Meet</p>
        <h2 className="mt-3 text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          Uma reunião que continua trabalhando depois que termina.
        </h2>
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
          Entre agora em uma sala de demonstração e veja o COS acompanhando a conversa em tempo
          real. O acompanhamento inteligente da reunião é desbloqueado após criar sua conta.
        </p>
      </div>

      <div className="mt-10">
        <MeetRoom />
      </div>
    </section>
  )
}
