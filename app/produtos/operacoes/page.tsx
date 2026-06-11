import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react"
import { Header } from "@/components/cos/header"
import { Footer } from "@/components/cos/footer"

const highlights = [
  "Clientes e oportunidades em um só fluxo",
  "Financeiro, cobranças e documentos organizados",
  "Tarefas, projetos, reuniões e equipe no mesmo ambiente",
  "IA que entende e executa a operação",
]

export default function OperacoesProductPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <Header />

      <section className="px-4 pt-28 pb-10 md:px-8 md:pt-36 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:mb-10 md:max-w-3xl">
            <div className="inline-flex w-fit items-center rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              COS Operações
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0a0a0a] md:text-5xl">
              O produto principal do COS para operar o seu negócio por conversa.
            </h1>
            <p className="text-sm leading-7 text-muted-foreground md:text-lg">
              Centralize clientes, financeiro, documentos, projetos e equipe em um único fluxo conversacional, sem planilhas espalhadas e sem sistemas desconexos.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/cadastro" className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700">
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://wa.me/5554999902688?text=Ol%C3%A1%2C%20quero%20falar%20com%20um%20especialista%20sobre%20o%20COS%20Opera%C3%A7%C3%B5es."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-green-200 bg-white px-6 py-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
              >
                <MessageCircle className="h-4 w-4" />
                Falar com especialista
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_28px_100px_rgba(15,23,42,0.08)] ring-1 ring-white/70">
            <div className="bg-[#fafaf8] p-3 md:p-5">
              <Image
                src="/cos-operacoes-product-banner.png"
                alt="COS Operações"
                width={983}
                height={1600}
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
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-2">
            {highlights.map((item) => (
              <div key={item} className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <p className="text-sm leading-7 text-[#0a0a0a] md:text-base">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
