"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Settings2, Sparkles, CreditCard, Plug, ShieldCheck, type LucideIcon } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, BackendNotice } from "@/components/master/master-ui"

type Secao = {
  id: string
  label: string
  icon: LucideIcon
  descricao: string
  notice: string
}

const secoes: Secao[] = [
  { id: "geral", label: "Geral", icon: Settings2, descricao: "Nome da plataforma, fuso horário e idioma padrão.", notice: "As preferências gerais serão habilitadas após a integração do backend." },
  { id: "ia", label: "IA", icon: Sparkles, descricao: "Modelos, limites de consumo e política de tokens.", notice: "As configurações de IA serão habilitadas após a integração com a OpenAI." },
  { id: "cobranca", label: "Cobrança", icon: CreditCard, descricao: "Planos, moeda e regras de faturamento.", notice: "As configurações de cobrança serão habilitadas após a integração com o Stripe." },
  { id: "integracoes", label: "Integrações", icon: Plug, descricao: "Chaves de API e webhooks dos serviços conectados.", notice: "As chaves de integração serão habilitadas após a integração do backend." },
  { id: "seguranca", label: "Segurança", icon: ShieldCheck, descricao: "Papéis de acesso, autenticação e auditoria.", notice: "As políticas de segurança serão habilitadas após a integração do backend." },
]

export default function MasterConfiguracoesPage() {
  const [ativa, setAtiva] = useState(secoes[0].id)
  const secao = secoes.find((s) => s.id === ativa)!

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader title="Configurações" description="Ajustes globais do ecossistema COS." />

          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
            {/* Navegação de seções */}
            <nav className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide">
              {secoes.map((s) => {
                const active = s.id === ativa
                return (
                  <button
                    key={s.id}
                    onClick={() => setAtiva(s.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                      active ? "bg-white border border-gray-100 shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                    }`}
                  >
                    <s.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{s.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Conteúdo da seção */}
            <motion.div
              key={secao.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-100 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <secao.icon className="w-5 h-5 text-gray-600" />
                </span>
                <div>
                  <h2 className="font-semibold">{secao.label}</h2>
                  <p className="text-sm text-muted-foreground">{secao.descricao}</p>
                </div>
              </div>
              <div className="mt-6">
                <BackendNotice>{secao.notice}</BackendNotice>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
