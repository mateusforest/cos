import Image from "next/image"
import Link from "next/link"
import { ArrowRight, MessageCircle } from "lucide-react"
import { Header } from "@/components/cos/header"
import { Footer } from "@/components/cos/footer"

export default function ConnectProductPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <Header />

      <section className="px-4 pt-28 pb-10 md:px-8 md:pt-36 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_28px_100px_rgba(15,23,42,0.08)] ring-1 ring-white/70">
            <div className="bg-[#fafaf8] p-3 md:p-5">
              <Image
                src="/cos-connect-product-banner.png"
                alt="COS Connect"
                width={982}
                height={1601}
                quality={95}
                sizes="(min-width: 1280px) 1280px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)"
                priority
                className="h-auto w-full rounded-[1.5rem] object-contain shadow-[0_18px_48px_rgba(15,23,42,0.08)] [filter:contrast(1.015)_saturate(1.01)_brightness(1.01)]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 md:px-8 md:pb-20 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-3 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-[#0a0a0a] md:text-3xl">
                Conecte o COS aos seus sistemas sem migração.
              </h1>
              <p className="text-sm leading-7 text-muted-foreground md:text-base">
                Use o COS Connect para conectar ferramentas atuais, operar por conversa com dados sincronizados e preparar uma camada conversacional sobre a estrutura existente do cliente.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/cadastro" className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-700">
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://wa.me/5554999902688?text=Ol%C3%A1%2C%20quero%20falar%20com%20um%20especialista%20sobre%20o%20COS%20Connect."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-6 py-3 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
              >
                <MessageCircle className="h-4 w-4" />
                Falar com especialista
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
