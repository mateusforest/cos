"use client"

import { use, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  getOperationsConversationMessagesAction,
  runOperationsEngineAction,
} from "@/actions/operations-engine"
import { AreaChat, type ChatMessage } from "@/components/app/area-chat"
import { useOperationsTemplatePreview } from "@/components/operations/operations-template-preview"
import { getOperationsAreaConfigs, slug } from "@/lib/area-configs"

const portalDestinations: Record<string, string> = {
  clientes: "/portal/cadastros/clientes",
  pacientes: "/portal/cadastros/clientes",
  proprietarios: "/portal/cadastros/leads",
  interessados: "/portal/cadastros/produtos",
  imoveis: "/portal/cadastros/servicos",
  leads: "/portal/cadastros/leads",
  convenios: "/portal/cadastros/leads",
  produtos: "/portal/cadastros/produtos",
  procedimentos: "/portal/cadastros/produtos",
  servicos: "/portal/cadastros/servicos",
  responsaveis: "/portal/cadastros/produtos",
  profissionais: "/portal/cadastros/servicos",
  projetos: "/portal/operacoes",
  ordens: "/portal/operacoes",
  processos: "/portal/operacoes",
  consultas: "/portal/operacoes",
  agenda: "/portal/operacoes",
  exames: "/portal/operacoes",
  visitas: "/portal/operacoes",
  propostas: "/portal/vendas/propostas",
  negociacoes: "/portal/vendas/negociacoes",
  pedidos: "/portal/vendas/pedidos",
  vendas: "/portal/vendas/vendas",
  funil: "/portal/vendas/funil",
  ganhos: "/portal/financeiro",
  gastos: "/portal/financeiro",
  "fluxo-de-caixa": "/portal/financeiro",
  comercial: "/portal/equipe",
  operacional: "/portal/equipe",
  financeiro: "/portal/equipe",
  administrativo: "/portal/equipe",
  contratos: "/portal/contratos",
  arquivos: "/portal/documentos",
  relatorios: "/portal/relatorios",
}

function resolveChatCopy(area: string, subLabel: string, segment?: string, areaQuickActions?: string[]) {
  if (area === "cadastros") {
    const normalizedSub = slug(subLabel)
    const portalLabelBySub: Record<string, string> = {
      clientes: "Ver clientes no Portal",
      pacientes: "Ver pacientes no Portal",
      proprietarios: "Ver proprietarios no Portal",
      interessados: "Ver interessados no Portal",
      imoveis: "Ver imoveis no Portal",
      leads: "Ver leads no Portal",
      convenios: "Ver convenios no Portal",
      produtos: "Ver produtos no Portal",
      procedimentos: "Ver procedimentos no Portal",
      servicos: "Ver servicos no Portal",
      responsaveis: "Ver responsaveis no Portal",
      profissionais: "Ver profissionais no Portal",
    }

    return {
      subtitle: `Conversa contextual de ${subLabel.toLowerCase()} do seu workspace.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions:
        normalizedSub === "clientes" || normalizedSub === "pacientes"
          ? [normalizedSub === "pacientes" ? "Criar paciente" : "Criar cliente", normalizedSub === "pacientes" ? "Buscar paciente" : "Buscar cliente", portalLabelBySub[normalizedSub]]
          : segment === "servicos" && normalizedSub === "servicos"
            ? ["Cadastrar servico", "Buscar servico", portalLabelBySub[normalizedSub]]
            : segment === "servicos" && normalizedSub === "responsaveis"
              ? ["Cadastrar responsavel", "Buscar responsavel", portalLabelBySub[normalizedSub]]
          : segment === "imobiliarias" && normalizedSub === "proprietarios"
            ? ["Criar proprietario", "Buscar proprietario", portalLabelBySub[normalizedSub]]
            : segment === "imobiliarias" && normalizedSub === "interessados"
              ? ["Criar interessado", "Buscar interessado", portalLabelBySub[normalizedSub]]
              : segment === "imobiliarias" && normalizedSub === "imoveis"
                ? ["Registrar imovel", "Buscar imovel", portalLabelBySub[normalizedSub]]
          : areaQuickActions?.length
            ? areaQuickActions
            : [`Buscar ${subLabel.toLowerCase()}`, portalLabelBySub[normalizedSub] ?? "Ver cadastros no Portal"],
    }
  }

  if (area === "operacoes") {
    if (segment === "servicos") {
      const normalizedSub = slug(subLabel)

      return {
        subtitle: `Conversa operacional sobre ${subLabel.toLowerCase()}.`,
        emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
        quickActions:
          normalizedSub === "ordens-de-servico"
            ? ["Registrar ordem de servico", "Buscar ordem de servico", "Ver atendimentos no Portal"]
            : ["Registrar atendimento", "Buscar atendimento", "Ver atendimentos no Portal"],
      }
    }

    if (segment === "imobiliarias") {
      const normalizedSub = slug(subLabel)

      return {
        subtitle: `Conversa operacional sobre ${subLabel.toLowerCase()}.`,
        emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
        quickActions:
          normalizedSub === "imoveis"
            ? ["Registrar imovel", "Buscar imovel", "Ver imoveis no Portal"]
            : normalizedSub === "visitas"
              ? ["Registrar visita", "Buscar visita", "Ver negociacoes no Portal"]
              : ["Registrar negociacao", "Buscar negociacao", "Ver negociacoes no Portal"],
      }
    }

    return {
      subtitle: `Conversa operacional sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: areaQuickActions?.length ? areaQuickActions : ["Registrar atendimento", "Buscar atendimento", "Ver atendimentos no Portal"],
    }
  }

  if (area === "vendas") {
    const normalizedSub = slug(subLabel)

    return {
      subtitle: `Conversa comercial sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions:
        normalizedSub === "propostas"
          ? ["Criar proposta", "Ver vendas no Portal"]
          : normalizedSub === "negociacoes"
            ? ["Abrir propostas", "Ver vendas no Portal"]
            : ["Ver vendas no Portal"],
    }
  }

  if (area === "financeiro") {
    return {
      subtitle: `Conversa financeira sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Registrar ganho", "Registrar gasto", "Ver financeiro no Portal"],
    }
  }

  if (area === "equipe") {
    return {
      subtitle: `Conversa contextual da equipe ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre a equipe ${subLabel.toLowerCase()}.`,
      quickActions: ["Adicionar membro", "Atribuir tarefa", "Ver equipe no Portal"],
    }
  }

  if (area === "documentos") {
    return {
      subtitle: `Conversa documental sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: areaQuickActions?.length
        ? areaQuickActions
        : segment === "imobiliarias"
          ? ["Criar documento imobiliario", "Buscar arquivo", "Ver documentos no Portal"]
          : ["Criar documento clínico", "Buscar arquivo", "Ver documentos no Portal"],
    }
  }

  return {
    subtitle: `${subLabel} · COS Operacoes`,
    emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
    quickActions: ["Abrir no Portal"],
  }
}

export default function SubAreaPage({ params }: { params: Promise<{ area: string; sub: string }> }) {
  const { area, sub } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { effectiveSegment } = useOperationsTemplatePreview()
  const areaConfigs = getOperationsAreaConfigs(effectiveSegment)
  const config = areaConfigs[area]
  const [messages, setMessages] = useState<ChatMessage[]>(config?.messages ?? [])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const conversationId = searchParams.get("conversationId")?.trim() || ""

  const subLabel =
    config?.subsections.find((section) => slug(section) === sub) ??
    sub.charAt(0).toUpperCase() + sub.slice(1).replace(/-/g, " ")

  const chatCopy = resolveChatCopy(area, subLabel, effectiveSegment ?? undefined, config?.quickActions)

  useEffect(() => {
    if (!config) {
      setIsLoadingMessages(false)
      return
    }

    let isMounted = true

    const loadMessages = async () => {
      setIsLoadingMessages(true)
      const result = await getOperationsConversationMessagesAction({
        area,
        subArea: sub,
        conversationId: conversationId || undefined,
      })

      if (!isMounted) {
        return
      }

      if (result.success) {
        if (conversationId && result.conversationId) {
          const [resolvedArea, resolvedSubArea] = String(result.conversationArea || `${area}/${sub}`).split("/")

          if (resolvedArea !== area || (resolvedSubArea && resolvedSubArea !== sub)) {
            const params = new URLSearchParams({ conversationId })
            const nextHref = resolvedSubArea ? `/app/conversas/${resolvedArea}/${resolvedSubArea}?${params.toString()}` : `/app/conversas/${resolvedArea}?${params.toString()}`
            router.replace(nextHref)
            return
          }
        }

        setMessages(result.messages)
      } else {
        setMessages(config?.messages ?? [])
      }

      setIsLoadingMessages(false)
    }

    void loadMessages()

    return () => {
      isMounted = false
    }
  }, [area, sub, config, conversationId, router])

  return (
    <AreaChat
      conversationKey={conversationId ? `${area}/${sub}:${conversationId}` : `${area}/${sub}`}
      title={subLabel}
      subtitle={chatCopy.subtitle}
      icon={config?.icon ?? areaConfigs.sistema.icon}
      color={config?.color}
      bg={config?.bg}
      messages={messages}
      isLoadingHistory={isLoadingMessages}
      quickActions={chatCopy.quickActions.map((label) => ({
        label,
        onClick: () => {
          if (label.includes("Portal")) {
            if (area === "documentos") {
              router.push("/portal/documentos")
              return
            }

            if (area === "operacoes") {
              router.push("/portal/operacoes")
              return
            }

            if (area === "cadastros" && config?.subsections?.length) {
              const cadastrosRoutes = ["/portal/cadastros/clientes", "/portal/cadastros/leads", "/portal/cadastros/produtos", "/portal/cadastros/servicos"]
              const cadastrosIndex = config.subsections.findIndex((section) => slug(section) === sub)

              if (cadastrosIndex >= 0 && cadastrosIndex < cadastrosRoutes.length) {
                router.push(cadastrosRoutes[cadastrosIndex])
                return
              }
            }

            if (effectiveSegment === "servicos" && sub === "servicos") {
              router.push("/portal/cadastros/leads")
              return
            }

            if (effectiveSegment === "servicos" && sub === "responsaveis") {
              router.push("/portal/cadastros/produtos")
              return
            }

            router.push(portalDestinations[sub] || "/portal")
            return
          }

          if (label === "Criar cliente" || label === "Criar paciente") {
            router.push("/app/novo/cliente")
            return
          }

          if (label === "Cadastrar servico") {
            router.push("/app/novo/cliente?role=servico")
            return
          }

          if (label === "Cadastrar responsavel") {
            router.push("/app/novo/cliente?role=responsavel")
            return
          }

          if (label === "Criar proprietario") {
            router.push("/app/novo/cliente?role=proprietario")
            return
          }

          if (label === "Criar interessado") {
            router.push("/app/novo/cliente?role=interessado")
            return
          }

          if (label === "Criar operacao" || label === "Registrar atendimento") {
            router.push(label === "Registrar atendimento" ? "/app/novo/operacao?kind=atendimento" : "/app/novo/operacao")
            return
          }

          if (label === "Registrar ordem de servico") {
            router.push("/app/novo/operacao?kind=ordem")
            return
          }

          if (label === "Registrar imovel") {
            router.push("/app/novo/operacao?kind=imovel")
            return
          }

          if (label === "Registrar visita") {
            router.push("/app/novo/operacao?kind=visita")
            return
          }

          if (label === "Registrar negociacao") {
            router.push("/app/novo/operacao?kind=negociacao")
            return
          }

          if (label === "Criar proposta") {
            router.push("/portal/vendas/propostas")
            return
          }

          if (label.startsWith("Criar ") && !label.includes("documento")) {
            router.push("/app/novo/cliente")
            return
          }

          if (label === "Abrir propostas") {
            router.push("/portal/vendas/propostas")
            return
          }

          if (label === "Registrar ganho" || label === "Registrar gasto") {
            router.push("/app/novo/financeiro")
            return
          }

          if (label.startsWith("Registrar ")) {
            router.push("/app/novo/operacao")
            return
          }

          if (label === "Criar documento" || label === "Criar documento clínico" || label === "Criar documento imobiliario") {
            router.push("/app/novo/documento")
            return
          }
        },
      }))}
      onSendMessage={async (input, now) => {
        try {
          const result = await runOperationsEngineAction({
            message: input,
            area,
            subArea: sub,
          })
          const responseText =
            typeof result.message === "string" && result.message.trim()
              ? result.message
              : "Nao consegui executar sua solicitacao agora. Tente novamente em instantes."
          const ctaLabel =
            "suggestedLabel" in result && typeof result.suggestedLabel === "string" ? result.suggestedLabel : undefined
          const ctaHref =
            "suggestedHref" in result && typeof result.suggestedHref === "string" ? result.suggestedHref : undefined

          return {
            messages: [
              {
                id: `subarea-cos-${Date.now()}`,
                from: "cos",
                text: responseText,
                time: now,
                ctaLabel,
                ctaHref,
              },
            ],
          }
        } catch {
          return {
            messages: [
              {
                id: `subarea-cos-error-${Date.now()}`,
                from: "cos",
                text: "Nao consegui executar sua solicitacao agora. Tente novamente em instantes.",
                time: now,
              },
            ],
          }
        }
      }}
      emptyLabel={chatCopy.emptyLabel}
    />
  )
}
