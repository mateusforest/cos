"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2, MessageSquare, Sparkles, User } from "lucide-react"
import { getOperationsConversationsAction } from "@/actions/operations-engine"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"

type PortalConversation = {
  id: string
  area: string
  title: string
  time: string
  updatedAt: string | null
  preview: string
  lastFrom: "cos" | "user" | null
  ctaLabel?: string
  ctaHref?: string
}

function resolvePortalHref(area: string) {
  const [rootArea, subArea] = area.split("/")

  if (subArea === "propostas" || rootArea === "vendas") return "/portal/vendas"
  if (subArea === "relatorios") return "/portal/relatorios"
  if (rootArea === "cadastros") return subArea ? `/portal/cadastros/${subArea}` : "/portal/cadastros"
  if (rootArea === "operacoes") return "/portal/operacoes"
  if (rootArea === "financeiro") return "/portal/financeiro"
  if (rootArea === "equipe") return "/portal/equipe"
  if (rootArea === "documentos") return "/portal/documentos"
  if (rootArea === "reunioes") return "/portal/reunioes"
  if (rootArea === "suporte") return "/portal/suporte"
  if (rootArea === "sistema") return "/portal/sistema"

  return "/portal"
}

function humanizeArea(area: string) {
  const parts = area.split("/").filter(Boolean)
  if (parts.length === 0) return "Geral"

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " "))
    .join(" / ")
}

export default function PortalConversasPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q")?.trim() || ""
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conversations, setConversations] = useState<PortalConversation[]>([])

  useEffect(() => {
    let active = true

    void getOperationsConversationsAction().then((result) => {
      if (!active) return

      if (result.error) {
        setError(result.error)
        setConversations([])
        setIsLoading(false)
        return
      }

      setConversations((result.conversations ?? []) as PortalConversation[])
      setIsLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const filteredConversations = useMemo(() => {
    const query = initialQuery.toLowerCase()

    if (!query) {
      return conversations
    }

    return conversations.filter((conversation) =>
      [conversation.title, conversation.area, conversation.preview].join(" ").toLowerCase().includes(query),
    )
  }, [conversations, initialQuery])

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader placeholder="Buscar conversas salvas..." />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <PortalPageHeader
            title="Conversas"
            description="Conversas reais salvas pelo COS em ai_conversations e ai_messages."
          />

          {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <div className="rounded-2xl border border-gray-100 bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando conversas...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-gray-500">
                  {initialQuery ? "Nenhuma conversa encontrada para esse filtro." : "Nenhuma conversa salva ainda."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conversation) => {
                  const href = conversation.ctaHref || resolvePortalHref(conversation.area)

                  return (
                    <Link
                      key={conversation.id}
                      href={href}
                      className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                    >
                      <span className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-600">
                        {conversation.lastFrom === "user" ? <User className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#0a0a0a]">{conversation.title}</p>
                            <p className="text-xs text-gray-500">{humanizeArea(conversation.area)}</p>
                          </div>
                          <span className="shrink-0 text-xs text-gray-400">{conversation.time}</span>
                        </div>

                        <p className="line-clamp-2 text-sm text-gray-600">{conversation.preview}</p>

                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{conversation.ctaLabel || "Abrir sessao relacionada"}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
