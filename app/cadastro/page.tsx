"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Layers, Plug, ArrowLeft, Check, ChevronRight } from "lucide-react"
import { AuthLayout } from "@/components/cos/auth-layout"

type ProductType = "operations" | "connect"
type Step = "produto" | "conta"

const products: {
  id: ProductType
  icon: typeof Layers
  name: string
  description: string
  details: string
  cta: string
}[] = [
  {
    id: "operations",
    icon: Layers,
    name: "COS Operações",
    description:
      "Sistema operacional empresarial completo para centralizar sua operação, equipe, clientes, financeiro, documentos e processos.",
    details:
      "O COS é o seu sistema. Tudo acontece dentro dele: cadastros, vendas, financeiro, reuniões, documentos e relatórios, com portal administrativo completo.",
    cta: "Escolher Operações",
  },
  {
    id: "connect",
    icon: Plug,
    name: "COS Connect",
    description:
      "Conecte o COS ao sistema, ERP, CRM, planilha ou portal que sua empresa já utiliza e opere tudo por conversa.",
    details:
      "O COS conversa com o sistema que a empresa já possui. Sem substituir nada: ele se conecta ao seu ERP, CRM, planilhas, e-mail ou WhatsApp e organiza tudo por chat.",
    cta: "Escolher Connect",
  },
]

export default function CadastroPage() {
  const [step, setStep] = useState<Step>("produto")
  const [productType, setProductType] = useState<ProductType | null>(null)
  const [expanded, setExpanded] = useState<ProductType | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const chosenProduct = products.find((p) => p.id === productType)

  const handleSelectProduct = (id: ProductType) => {
    setProductType(id)
    setStep("conta")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    if (!acceptTerms) {
      setError("Você precisa aceitar os termos de uso.")
      return
    }

    setIsLoading(true)

    // Simular cadastro - integrar com backend real.
    // O produto escolhido é salvo no estado do cadastro como productType (operations | connect).
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Direcionar conforme o produto escolhido
    if (productType === "connect") {
      window.location.href = "/connect"
    } else {
      window.location.href = "/app"
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return (
    <AuthLayout>
      {/* Logo centralizado no card */}
      <div className="flex justify-center mb-8">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"
          alt="COS"
          width={56}
          height={56}
          className="w-14 h-14"
        />
      </div>

      <AnimatePresence mode="wait">
        {/* ETAPA 1 — Escolha de produto */}
        {step === "produto" && (
          <motion.div
            key="produto"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-[#0a0a0a] tracking-tight">
                Escolha seu produto
              </h1>
              <p className="text-[#737373] mt-2">
                Como você quer operar com o COS?
              </p>
            </div>

            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5 transition-colors hover:border-[#0a0a0a]/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e5e5] flex items-center justify-center flex-shrink-0">
                      <product.icon className="w-5 h-5 text-[#0a0a0a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-[#0a0a0a]">{product.name}</h2>
                      <p className="text-sm text-[#737373] mt-1 leading-relaxed">
                        {product.description}
                      </p>

                      <AnimatePresence initial={false}>
                        {expanded === product.id && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-sm text-[#525252] mt-2 leading-relaxed overflow-hidden"
                          >
                            {product.details}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-4 mt-4">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectProduct(product.id)}
                          className="flex items-center gap-1.5 py-2 px-4 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
                        >
                          {product.cta}
                          <ChevronRight className="w-4 h-4" />
                        </motion.button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded(expanded === product.id ? null : product.id)
                          }
                          className="text-sm text-[#737373] hover:text-[#0a0a0a] transition-colors"
                        >
                          {expanded === product.id ? "Ocultar" : "Saiba mais"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-sm text-[#737373]">
              Já possui conta?{" "}
              <Link href="/login" className="text-[#0a0a0a] font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </motion.div>
        )}

        {/* ETAPA 2 — Criar conta */}
        {step === "conta" && (
          <motion.div
            key="conta"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
          >
            {/* Voltar + produto escolhido */}
            <button
              type="button"
              onClick={() => setStep("produto")}
              className="flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0a0a0a] transition-colors mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              Trocar produto
            </button>

            {chosenProduct && (
              <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-[#fafafa] border border-[#e5e5e5]">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-center flex-shrink-0">
                  <chosenProduct.icon className="w-4 h-4 text-[#0a0a0a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-[#0a0a0a]">{chosenProduct.name}</span>
                  <span className="block text-xs text-[#737373]">Produto selecionado</span>
                </div>
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              </div>
            )}

            {/* Título */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-[#0a0a0a] tracking-tight">
                Criar conta
              </h1>
              <p className="text-[#737373] mt-2">Comece a operar com COS.</p>
            </div>

            {/* Erro */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"
              >
                {error}
              </motion.div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nome completo */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-[#0a0a0a]">
                  Nome completo
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-[#0a0a0a]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
                />
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-[#0a0a0a]">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
                />
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#0a0a0a]">
                  Confirmar senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
                />
              </div>

              {/* Aceitar termos */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-[#e5e5e5] text-[#0a0a0a] focus:ring-[#0a0a0a]/20"
                />
                <span className="text-sm text-[#737373]">
                  Aceito os{" "}
                  <Link href="/termos" className="text-[#0a0a0a] hover:underline">
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link href="/privacidade" className="text-[#0a0a0a] hover:underline">
                    Política de Privacidade
                  </Link>
                </span>
              </label>

              {/* Botão principal */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 px-4 bg-[#0a0a0a] text-white rounded-xl font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Criar conta"
                )}
              </motion.button>

              {/* Divisor */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e5e5e5]" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-[#a3a3a3]">ou</span>
                </div>
              </div>

              {/* Google Signup */}
              <motion.button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 px-4 bg-white border border-[#e5e5e5] text-[#0a0a0a] rounded-xl font-medium hover:bg-[#fafafa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar com Google
              </motion.button>
            </form>

            {/* Link para login */}
            <p className="mt-8 text-center text-sm text-[#737373]">
              Já possui conta?{" "}
              <Link href="/login" className="text-[#0a0a0a] font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  )
}
