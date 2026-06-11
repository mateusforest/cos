import Link from "next/link"
import { ArrowRight, Database, FileSpreadsheet, Mail, MessageCircle, Webhook } from "lucide-react"
import { Header } from "@/components/cos/header"
import { Footer } from "@/components/cos/footer"

const pillars = [
  "Utiliza o COS sobre sistemas existentes, sem exigir migração",
  "Conecta sistemas, planilhas, APIs, bancos, WhatsApp e e-mail",
  "Cria sessões e ações a partir da estrutura atual do cliente",
  "Prepara o COS para operar como camada conversacional",
]

const sources = [
  { icon: Database, title: "Sistemas e bancos", description: "Conecte ERPs, CRMs, bancos de dados e estruturas já existentes." },
  { icon: FileSpreadsheet, title: "Planilhas e bases", description: "Aproveite planilhas e arquivos operacionais sem reconstruir a operação do zero." },
  { icon: Webhook, title: "APIs e integrações", description: "Sincronize dados em tempo real com APIs, webhooks e serviços conectados." },
  { icon: Mail, title: "WhatsApp e e-mail", description: "Transforme canais já usados pelo cliente em sessões e ações no COS." },
]

export default function ConnectProductPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <Header />

      <section className="px-4 pt-28 pb-12 md:px-8 md:pt-36 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="rounded-[2rem] border border-border/60 bg-white p-7 shadow-sm md:p-10">
              <div className="inline-flex items-center rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
                COS Connect
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#0a0a0a] md:text-5xl">
                Utilize o COS sobre a estrutura que o seu cliente já possui.
              </h1>
              <p className="mt-5 text-sm leading-7 text-muted-foreground md:text-lg">
                O COS Connect conecta sistemas, planilhas, APIs, bancos, WhatsApp e e-mail para preparar uma camada conversacional sem exigir migração nem retrabalho operacional.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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

            <div className="rounded-[2rem] border border-border/60 bg-white p-7 shadow-sm md:p-10">
              <h2 className="text-lg font-semibold text-[#0a0a0a] md:text-xl">Como o COS Connect opera</h2>
              <div className="mt-5 space-y-4">
                {pillars.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#f8f8f6] px-4 py-4">
                    <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-violet-600" />
                    <p className="text-sm leading-7 text-[#0a0a0a]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 md:px-8 md:pb-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 md:mb-10">
            <h2 className="text-2xl font-semibold tracking-tight text-[#0a0a0a] md:text-4xl">
              Estruture o COS sobre a operação atual do cliente.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground md:text-lg">
              O Connect organiza fontes, sessões e ações para transformar a base existente em uma operação conversacional pronta para uso.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {sources.map((source) => (
              <div key={source.title} className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
                  <source.icon className="h-6 w-6 text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-[#0a0a0a]">{source.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{source.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
