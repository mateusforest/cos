"use client"

import Link from "next/link"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Plug,
  Database,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Users,
  LifeBuoy,
} from "lucide-react"
import { useConnect } from "@/components/connect/connect-store"

const sourceTypeIcon: Record<string, typeof Database> = {
  ERP: Database,
  CRM: Users,
  Planilha: FileSpreadsheet,
  "E-mail": Mail,
  WhatsApp: MessageCircle,
  "Banco de dados": Database,
}

export default function ConnectConversasPage() {
  const { sources, hasSources, openModal, toast } = useConnect()
  const [searchQuery, setSearchQuery] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const connectSections = [
    {
      id: "support",
      label: "Suporte",
      type: "Suporte",
      subsections: [] as string[],
      description: "Atendimento, dúvidas, problemas técnicos, planos, cobrança e integrações.",
    },
    ...(hasSources
      ? [
          { id: "geral", label: "Geral", type: "Geral", subsections: [] as string[], description: "Visão geral das fontes conectadas." },
          ...sources.map((source) => ({
            id: source.id,
            label: source.name,
            type: source.type,
            subsections: source.sections,
            description: source.sections.length > 0 ? `${source.sections.length} seções disponíveis` : "Toque para conversar",
          })),
        ]
      : []),
  ]

  const filtered = connectSections.filter((conversation) =>
    conversation.label.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="px-4 py-4">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-0.5">Conversas</h1>
        <p className="text-sm text-gray-500">As conversas se organizam conforme suas fontes conectadas.</p>
      </motion.div>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar conversas..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-300"
          />
        </div>
        <button onClick={() => toast("Filtros das fontes em preparação.")} className="flex items-center gap-1.5 px-3 py-2.5 bg-white rounded-xl border border-gray-200">
          <SlidersHorizontal className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtrar</span>
        </button>
      </motion.div>

      <div className="space-y-1">
        {filtered.map((conversation, index) => {
          const isOpen = expanded === conversation.id
          const isSupport = conversation.id === "support"
          const Icon = isSupport ? LifeBuoy : sourceTypeIcon[conversation.type] ?? Plug

          return (
            <motion.div
              key={conversation.id}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.03 }}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              {isSupport ? (
                <Link href="/connect/conversas/suporte" className="flex items-center gap-3 p-3 w-full hover:bg-gray-50 active:bg-gray-100 transition-colors">
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[#0a0a0a] text-sm">{conversation.label}</span>
                      <span className="text-xs text-gray-400">{conversation.type}</span>
                    </div>
                    <span className="text-xs text-gray-500 truncate block">{conversation.description}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </Link>
              ) : (
                <button
                  onClick={() => {
                    if (conversation.subsections.length > 0) {
                      setExpanded(isOpen ? null : conversation.id)
                      return
                    }
                    toast(`Conversa de ${conversation.label} em preparação.`)
                  }}
                  className="flex items-center gap-3 p-3 w-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[#0a0a0a] text-sm">{conversation.label}</span>
                      <span className="text-xs text-gray-400">{conversation.type}</span>
                    </div>
                    <span className="text-xs text-gray-500 truncate block">{conversation.description}</span>
                  </div>
                  {conversation.subsections.length > 0 ? (
                    <ChevronDown className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                </button>
              )}

              <AnimatePresence initial={false}>
                {!isSupport && isOpen && conversation.subsections.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-gray-50"
                  >
                    <div className="p-2 pl-4">
                      {conversation.subsections.map((subsection) => (
                        <button
                          key={subsection}
                          onClick={() => toast(`${subsection} (${conversation.label}) em preparação.`)}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors w-full"
                        >
                          <span className="text-sm text-gray-700">{subsection}</span>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {!hasSources && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col items-center justify-center text-center py-10 px-4 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-5">
            <Plug className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-[#0a0a0a] mb-2">Suas conversas aparecerão aqui</h2>
          <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
            Quando você conectar um sistema, planilha ou canal, o COS organizará as conversas conforme a estrutura da sua empresa.
          </p>
          <button onClick={() => openModal("system")} className="flex items-center gap-2 py-3 px-5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors">
            <Plug className="w-4 h-4" /> Conectar primeira fonte
          </button>
        </motion.div>
      )}
    </div>
  )
}
