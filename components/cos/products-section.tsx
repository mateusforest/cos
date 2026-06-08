"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, ArrowRight, BarChart3, Link2, Sparkles } from "lucide-react"

type ProductId = "operacoes" | "connect"

const products = [
  {
    id: "operacoes" as ProductId,
    number: "01",
    name: "Operações",
    fullName: "COS Operações",
    icon: BarChart3,
    accent: "text-green-600",
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
    check: "text-green-600",
    button: "bg-green-600 hover:bg-green-700",
    buttonOutline: "border-green-200 text-green-700 hover:bg-green-50",
    description: "Gerencie seu negócio por conversa.",
    features: [
      "Clientes e oportunidades",
      "Financeiro e cobranças",
      "Documentos e contratos",
      "Tarefas e projetos",
      "Reuniões e equipe",
    ],
  },
  {
    id: "connect" as ProductId,
    number: "02",
    name: "Connect",
    fullName: "COS Connect",
    icon: Link2,
    accent: "text-violet-600",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    check: "text-violet-600",
    button: "bg-violet-600 hover:bg-violet-700",
    buttonOutline: "border-violet-200 text-violet-700 hover:bg-violet-50",
    description: "Utilize o COS sobre sistemas existentes.",
    features: [
      "Conecte seus sistemas",
      "Sem migração",
      "APIs e integrações nativas",
      "Dados sincronizados",
      "Tudo em tempo real",
    ],
  },
]

const modalContent: Record<
  ProductId,
  {
    paragraph: string
    highlights: string[]
    primaryCta: string
    secondaryCta: string
  }
> = {
  operacoes: {
    paragraph:
      "O produto principal para empresas operarem o próprio negócio por conversa. Tudo o que sua operação precisa em um único fluxo, sem planilhas espalhadas nem sistemas desconexos.",
    highlights: [
      "Clientes e oportunidades",
      "Financeiro e cobranças",
      "Documentos e contratos",
      "Tarefas e projetos",
      "Reuniões e equipe",
    ],
    primaryCta: "Começar agora",
    secondaryCta: "Falar com especialista",
  },
  connect: {
    paragraph:
      "A camada para conectar o COS a sistemas, planilhas, APIs e operações já existentes. Sem migração e sem retrabalho: você continua usando o que já tem e passa a operar por conversa.",
    highlights: [
      "Integração sem migração",
      "Sincronização de dados",
      "Automações inteligentes",
      "Consulta por conversa",
    ],
    primaryCta: "Falar com especialista",
    secondaryCta: "Conhecer Operações",
  },
}

export function ProductsSection() {
  const [selectedProduct, setSelectedProduct] = useState<ProductId | null>(null)

  const active = products.find((p) => p.id === selectedProduct) ?? null
  const activeModal = selectedProduct ? modalContent[selectedProduct] : null

  return (
    <>
      <section id="produtos" className="px-4 md:px-8 lg:px-12 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-5xl"
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-foreground/60" />
              <span className="text-xs md:text-sm text-foreground/70">Duas formas de utilizar</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-balance">
              Escolha como utilizar o <span className="text-foreground/70">COS.</span>
            </h2>
            <p className="mt-3 text-sm md:text-lg text-muted-foreground">
              Uma plataforma. Duas formas de operar.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-3xl border border-border/50 shadow-sm p-6 md:p-8 flex flex-col"
              >
                {/* Card top */}
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${product.iconBg} flex items-center justify-center`}>
                    <product.icon className={`h-6 w-6 ${product.iconColor}`} />
                  </div>
                  <span className={`text-sm font-medium ${product.accent}`}>{product.number}</span>
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-semibold tracking-tight">
                  COS <span className={product.accent}>{product.name}</span>
                </h3>
                <p className="mt-1.5 text-sm md:text-base text-muted-foreground">
                  {product.description}
                </p>

                {/* Divider */}
                <div className="my-6 h-px bg-border/60" />

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${product.check}`} />
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => setSelectedProduct(product.id)}
                  className="mt-8 inline-flex items-center gap-3 text-sm font-medium text-foreground group"
                >
                  <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center transition-colors group-hover:bg-foreground group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  Saiba mais
                </button>
              </motion.div>
            ))}
          </div>

          {/* Footer tag */}
          <div className="flex items-center justify-center gap-2 mt-10 md:mt-14">
            <Sparkles className="h-3.5 w-3.5 text-foreground/50" />
            <span className="text-xs md:text-sm text-muted-foreground text-center text-pretty">
              Dois produtos. Um único sistema operacional conversacional.
            </span>
          </div>
        </motion.div>
      </section>

      {/* Product Modal */}
      <AnimatePresence>
        {active && activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl ${active.iconBg} flex items-center justify-center`}>
                    <active.icon className={`h-6 w-6 ${active.iconColor}`} />
                  </div>
                  <h3 className="text-2xl font-bold">
                    COS <span className={active.accent}>{active.name}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 -mr-2 -mt-2 hover:bg-muted rounded-full transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm md:text-base text-foreground/80 leading-relaxed mb-6">
                {activeModal.paragraph}
              </p>

              <div className="space-y-3 mb-8">
                {activeModal.highlights.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${active.check}`} />
                    <span className="text-sm text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-colors ${active.button}`}
                >
                  {activeModal.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (active.id === "connect") {
                      setSelectedProduct("operacoes")
                    } else {
                      setSelectedProduct(null)
                    }
                  }}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-colors ${active.buttonOutline}`}
                >
                  {activeModal.secondaryCta}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
