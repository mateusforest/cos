"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, SlidersHorizontal, ChevronRight, ChevronDown, Users } from "lucide-react"
import { useOperationsDashboard } from "@/components/app/operations-dashboard-store"
import { useAppInteractions } from "@/components/app/app-interactions"
import { chatAreaSources, slug } from "@/lib/area-configs"

type Conversation = {
  key: string
  icon: typeof Users
  label: string
  lastMessage: string
  time: string
  count: number
  color: string
  bgColor: string
  subsections: string[]
}

const baseConversations: Conversation[] = chatAreaSources.map((area) => ({
  key: area.key,
  icon: area.icon as typeof Users,
  label: area.label,
  lastMessage: area.key === "vendas" ? "Conversa contextual pronta" : area.key === "sistema" ? "Configuracoes e logs" : "Sem registros",
  time: "-",
  count: 0,
  color: area.color,
  bgColor: area.bg,
  subsections: area.subsections,
}))

export default function ConversasPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const { summary } = useOperationsDashboard()
  const router = useRouter()
  const { openFilters } = useAppInteractions()

  const conversations = useMemo(
    () =>
      baseConversations.map((conversation) => {
        if (conversation.key === "cadastros") {
          const count = summary?.clientsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 cliente" : count > 1 ? `${count} clientes` : "Sem registros" }
        }

        if (conversation.key === "operacoes") {
          const count = summary?.operationsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 operacao" : count > 1 ? `${count} operacoes` : "Sem registros" }
        }

        if (conversation.key === "financeiro") {
          const count = summary?.financial.entriesCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 lancamento" : count > 1 ? `${count} lancamentos` : "Sem registros" }
        }

        if (conversation.key === "equipe") {
          const count = summary?.teamCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 membro" : count > 1 ? `${count} membros` : "Sem registros" }
        }

        if (conversation.key === "documentos") {
          const count = summary?.documentsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 documento" : count > 1 ? `${count} documentos` : "Sem registros" }
        }

        if (conversation.key === "reunioes") {
          const count = summary?.meetingsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 reuniao" : count > 1 ? `${count} reunioes` : "Sem registros" }
        }

        if (conversation.key === "suporte") {
          const count = summary?.supportCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 chamado" : count > 1 ? `${count} chamados` : "Sem registros" }
        }

        return conversation
      }),
    [summary],
  )

  const filtered = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [conversations, searchQuery],
  )

  return (
    <div className="px-4 py-4">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-0.5">Conversas</h1>
        <p className="text-sm text-gray-500">Todas as areas da sua operacao em um so lugar.</p>
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
        {filtered.map((conversation, index) => {
          const isOpen = expanded === conversation.label
          const conversationHref = `/app/conversas/${slug(conversation.label)}`

          return (
            <motion.div
              key={conversation.key}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.03 }}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => {
                  if (conversation.subsections.length > 0) {
                    setExpanded(isOpen ? null : conversation.label)
                    return
                  }
                  router.push(conversationHref)
                }}
                className="flex items-center gap-3 p-3 w-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: conversation.bgColor }}>
                  <conversation.icon className="w-5 h-5" style={{ color: conversation.color }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-[#0a0a0a] text-sm">{conversation.label}</span>
                    <span className="text-xs text-gray-400">{conversation.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate pr-2">{conversation.lastMessage}</span>
                    {conversation.count > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0a0a0a] px-1.5 text-[11px] text-white">
                        {conversation.count}
                      </span>
                    )}
                  </div>
                </div>
                {conversation.subsections.length > 0 ? (
                  <ChevronDown className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && conversation.subsections.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-gray-50"
                  >
                    <div className="p-2 pl-4">
                      {conversation.subsections.map((subsection) => (
                        <Link
                          key={subsection}
                          href={`/app/conversas/${slug(conversation.label)}/${slug(subsection)}`}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <span className="text-sm text-gray-700">{subsection}</span>
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
