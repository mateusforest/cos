"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Users,
  Briefcase,
  TrendingUp,
  DollarSign,
  UsersRound,
  FolderOpen,
  Video,
  Settings,
  LifeBuoy,
} from "lucide-react"
import { useAppInteractions } from "@/components/app/app-interactions"

type Conversation = {
  icon: typeof Users
  label: string
  lastMessage: string
  time: string
  hasNew: boolean
  count?: number
  color: string
  bgColor: string
  subsections: string[]
}

export default function ConversasPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const router = useRouter()
  const { openFilters } = useAppInteractions()

  const conversations: Conversation[] = [
    {
      icon: Users,
      label: "Cadastros",
      lastMessage: "Nenhum registro ainda",
      time: "—",
      hasNew: false,
      color: "#ec4899",
      bgColor: "#fce7f3",
      subsections: ["Clientes", "Leads", "Produtos", "Serviços", "Fornecedores", "Estoque"],
    },
    {
      icon: Briefcase,
      label: "Operações",
      lastMessage: "Nenhum registro ainda",
      time: "—",
      hasNew: false,
      color: "#8b5cf6",
      bgColor: "#ede9fe",
      subsections: ["Projetos", "Pedidos", "Processos", "Atendimentos", "Execuções"],
    },
    {
      icon: TrendingUp,
      label: "Vendas",
      lastMessage: "Nenhum registro ainda",
      time: "—",
      hasNew: false,
      color: "#3b82f6",
      bgColor: "#dbeafe",
      subsections: ["Oportunidades", "Propostas", "Negociações", "Conversões"],
    },
    {
      icon: DollarSign,
      label: "Financeiro",
      lastMessage: "Nenhum registro ainda",
      time: "—",
      hasNew: false,
      color: "#22c55e",
      bgColor: "#dcfce7",
      subsections: ["Ganhos", "Gastos", "Cobranças", "Balanço"],
    },
    {
      icon: UsersRound,
      label: "Equipe",
      lastMessage: "Nenhum registro ainda",
      time: "—",
      hasNew: false,
      color: "#0ea5e9",
      bgColor: "#e0f2fe",
      subsections: ["Comercial", "Operacional", "Financeiro", "Administrativo", "Gestão"],
    },
    {
      icon: FolderOpen,
      label: "Documentos",
      lastMessage: "Nenhum registro ainda",
      time: "—",
      hasNew: false,
      color: "#f97316",
      bgColor: "#ffedd5",
      subsections: ["Contratos", "Propostas", "Termos", "Arquivos"],
    },
    {
      icon: Video,
      label: "Reuniões",
      lastMessage: "Nenhum registro ainda",
      time: "—",
      hasNew: false,
      color: "#ef4444",
      bgColor: "#fee2e2",
      subsections: ["Gravações", "Resumos", "Tarefas geradas"],
    },
    {
      icon: Settings,
      label: "Sistema",
      lastMessage: "Nenhum registro ainda",
      time: "—",
      hasNew: false,
      color: "#6b7280",
      bgColor: "#f3f4f6",
      subsections: ["Alertas", "Logs", "Notificações", "Integrações"],
    },
    {
      icon: LifeBuoy,
      label: "Suporte",
      lastMessage: "Atendimento, dúvidas, problemas técnicos, plano, cobrança e integrações.",
      time: "Em preparação",
      hasNew: false,
      color: "#6b7280",
      bgColor: "#f3f4f6",
      subsections: [],
    },
  ]

  const filtered = conversations.filter((c) => c.label.toLowerCase().includes(searchQuery.toLowerCase()) || c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))

  const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

  return (
    <div className="px-4 py-4">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-0.5">Conversas</h1>
        <p className="text-sm text-gray-500">Todas as áreas da sua operação em um só lugar.</p>
      </motion.div>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-300"
          />
        </div>
        <button onClick={openFilters} className="flex items-center gap-1.5 px-3 py-2.5 bg-white rounded-xl border border-gray-200">
          <SlidersHorizontal className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtrar</span>
        </button>
      </motion.div>

      <div className="space-y-1">
        {filtered.map((conv, index) => {
          const isOpen = expanded === conv.label
          const conversationHref = `/app/conversas/${slug(conv.label)}`

          return (
            <motion.div
              key={conv.label}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.03 }}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => {
                  if (conv.subsections.length > 0) {
                    setExpanded(isOpen ? null : conv.label)
                    return
                  }
                  router.push(conversationHref)
                }}
                className="flex items-center gap-3 p-3 w-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: conv.bgColor }}>
                  <conv.icon className="w-5 h-5" style={{ color: conv.color }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-[#0a0a0a] text-sm">{conv.label}</span>
                    <span className="text-xs text-gray-400">{conv.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate pr-2">{conv.lastMessage}</span>
                  </div>
                </div>
                {conv.subsections.length > 0 ? (
                  <ChevronDown className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && conv.subsections.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-gray-50"
                  >
                    <div className="p-2 pl-4">
                      {conv.subsections.map((sub) => (
                        <Link
                          key={sub}
                          href={`/app/conversas/${slug(conv.label)}/${slug(sub)}`}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <span className="text-sm text-gray-700">{sub}</span>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
