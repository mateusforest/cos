"use client"

import { useEffect, useMemo, useState } from "react"
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
import { getClientsAction } from "@/actions/clients"
import { getDocumentsAction } from "@/actions/documents"
import { getFinancialSummaryAction } from "@/actions/financial"
import { getMeetingsAction } from "@/actions/meetings"
import { getOperationsAction } from "@/actions/operations"
import { getSupportTicketsAction } from "@/actions/support"
import { getWorkspaceMembersAction } from "@/actions/workspace"
import { useAppInteractions } from "@/components/app/app-interactions"
import { areaConfigs, slug } from "@/lib/area-configs"

type Conversation = {
  icon: typeof Users
  label: string
  lastMessage: string
  time: string
  count: number
  color: string
  bgColor: string
  subsections: string[]
}

const baseConversations: Conversation[] = [
  { icon: Users, label: "Cadastros", lastMessage: "Sem registros", time: "-", count: 0, color: "#ec4899", bgColor: "#fce7f3", subsections: areaConfigs.cadastros.subsections },
  { icon: Briefcase, label: "Operações", lastMessage: "Sem registros", time: "-", count: 0, color: "#8b5cf6", bgColor: "#ede9fe", subsections: areaConfigs.operacoes.subsections },
  { icon: TrendingUp, label: "Vendas", lastMessage: "Conversa contextual pronta", time: "-", count: 0, color: "#3b82f6", bgColor: "#dbeafe", subsections: areaConfigs.vendas.subsections },
  { icon: DollarSign, label: "Financeiro", lastMessage: "Sem registros", time: "-", count: 0, color: "#22c55e", bgColor: "#dcfce7", subsections: areaConfigs.financeiro.subsections },
  { icon: UsersRound, label: "Equipe", lastMessage: "Sem registros", time: "-", count: 0, color: "#0ea5e9", bgColor: "#e0f2fe", subsections: areaConfigs.equipe.subsections },
  { icon: FolderOpen, label: "Documentos", lastMessage: "Sem registros", time: "-", count: 0, color: "#f97316", bgColor: "#ffedd5", subsections: areaConfigs.documentos.subsections },
  { icon: Video, label: "Reuniões", lastMessage: "Sem registros", time: "-", count: 0, color: "#ef4444", bgColor: "#fee2e2", subsections: areaConfigs.reunioes.subsections },
  { icon: Settings, label: "Sistema", lastMessage: "Configurações e logs", time: "-", count: 0, color: "#6b7280", bgColor: "#f3f4f6", subsections: areaConfigs.sistema.subsections },
  { icon: LifeBuoy, label: "Suporte", lastMessage: "Sem registros", time: "-", count: 0, color: "#6b7280", bgColor: "#f3f4f6", subsections: areaConfigs.suporte.subsections },
]

export default function ConversasPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>(baseConversations)
  const router = useRouter()
  const { openFilters } = useAppInteractions()

  useEffect(() => {
    let isMounted = true

    const loadConversationSummary = async () => {
      const [clientsResult, financialResult, membersResult, operationsResult, documentsResult, meetingsResult, supportResult] =
        await Promise.all([
          getClientsAction(),
          getFinancialSummaryAction(),
          getWorkspaceMembersAction(),
          getOperationsAction(),
          getDocumentsAction(),
          getMeetingsAction(),
          getSupportTicketsAction(),
        ])

      if (!isMounted) {
        return
      }

      const activeClients = clientsResult.success ? (clientsResult.clients?.filter((client) => client.status === "active").length ?? 0) : 0
      const operationsCount = operationsResult.success ? (operationsResult.operations?.filter((operation) => operation.status !== "archived").length ?? 0) : 0
      const entriesCount = financialResult.success ? (financialResult.summary?.entriesCount ?? 0) : 0
      const membersCount = membersResult.success ? (membersResult.members?.length ?? 0) : 0
      const documentsCount = documentsResult.success ? (documentsResult.documents?.filter((document) => document.status !== "archived").length ?? 0) : 0
      const meetingsCount = meetingsResult.success ? (meetingsResult.meetings?.filter((meeting) => meeting.status !== "archived").length ?? 0) : 0
      const supportCount = supportResult.success ? (supportResult.tickets?.length ?? 0) : 0

      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.label === "Cadastros") {
            return {
              ...conversation,
              count: activeClients,
              lastMessage: activeClients === 1 ? "1 cliente" : activeClients > 1 ? `${activeClients} clientes` : "Sem registros",
            }
          }

          if (conversation.label === "Operações") {
            return {
              ...conversation,
              count: operationsCount,
              lastMessage: operationsCount === 1 ? "1 operação" : operationsCount > 1 ? `${operationsCount} operações` : "Sem registros",
            }
          }

          if (conversation.label === "Financeiro") {
            return {
              ...conversation,
              count: entriesCount,
              lastMessage: entriesCount === 1 ? "1 lançamento" : entriesCount > 1 ? `${entriesCount} lançamentos` : "Sem registros",
            }
          }

          if (conversation.label === "Equipe") {
            return {
              ...conversation,
              count: membersCount,
              lastMessage: membersCount === 1 ? "1 membro" : membersCount > 1 ? `${membersCount} membros` : "Sem registros",
            }
          }

          if (conversation.label === "Documentos") {
            return {
              ...conversation,
              count: documentsCount,
              lastMessage: documentsCount === 1 ? "1 documento" : documentsCount > 1 ? `${documentsCount} documentos` : "Sem registros",
            }
          }

          if (conversation.label === "Reuniões") {
            return {
              ...conversation,
              count: meetingsCount,
              lastMessage: meetingsCount === 1 ? "1 reunião" : meetingsCount > 1 ? `${meetingsCount} reuniões` : "Sem registros",
            }
          }

          if (conversation.label === "Suporte") {
            return {
              ...conversation,
              count: supportCount,
              lastMessage: supportCount === 1 ? "1 chamado" : supportCount > 1 ? `${supportCount} chamados` : "Sem registros",
            }
          }

          return conversation
        }),
      )
    }

    void loadConversationSummary()

    return () => {
      isMounted = false
    }
  }, [])

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
        {filtered.map((conversation, index) => {
          const isOpen = expanded === conversation.label
          const conversationHref = `/app/conversas/${slug(conversation.label)}`

          return (
            <motion.div
              key={conversation.label}
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
