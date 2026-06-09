"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { AreaChat } from "@/components/app/area-chat"
import { areaConfigs, slug } from "@/lib/area-configs"

const portalDestinations: Record<string, string> = {
  clientes: "/portal/cadastros",
  leads: "/portal/cadastros",
  produtos: "/portal/cadastros",
  servicos: "/portal/cadastros",
  projetos: "/portal/operacoes",
  ordens: "/portal/operacoes",
  processos: "/portal/operacoes",
  propostas: "/portal/propostas",
  negociacoes: "/portal/vendas",
  funil: "/portal/vendas",
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

function resolveChatCopy(area: string, subLabel: string) {
  const key = slug(subLabel)

  if (area === "cadastros") {
    return {
      subtitle: `Conversa contextual de ${subLabel.toLowerCase()} do seu workspace.`,
      emptyLabel: `Ainda não há mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Criar cliente", "Buscar cliente", "Ver clientes no Portal"],
    }
  }

  if (area === "operacoes") {
    return {
      subtitle: `Conversa operacional sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda não há mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Criar operação", "Buscar operação", "Ver operações no Portal"],
    }
  }

  if (area === "vendas") {
    return {
      subtitle: `Conversa comercial sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda não há mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Criar proposta", "Buscar negociação", "Ver vendas no Portal"],
    }
  }

  if (area === "financeiro") {
    return {
      subtitle: `Conversa financeira sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda não há mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Registrar ganho", "Registrar gasto", "Ver financeiro no Portal"],
    }
  }

  if (area === "equipe") {
    return {
      subtitle: `Conversa contextual da equipe ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda não há mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre a equipe ${subLabel.toLowerCase()}.`,
      quickActions: ["Adicionar membro", "Atribuir tarefa", "Ver equipe no Portal"],
    }
  }

  if (area === "documentos") {
    return {
      subtitle: `Conversa documental sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda não há mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Criar documento", "Buscar arquivo", "Ver documentos no Portal"],
    }
  }

  return {
    subtitle: `${subLabel} · COS Operações`,
    emptyLabel: `Ainda não há mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
    quickActions: ["Abrir no Portal"],
  }
}

export default function SubAreaPage({ params }: { params: Promise<{ area: string; sub: string }> }) {
  const { area, sub } = use(params)
  const router = useRouter()
  const config = areaConfigs[area]

  const subLabel =
    config?.subsections.find((section) => slug(section) === sub) ??
    sub.charAt(0).toUpperCase() + sub.slice(1).replace(/-/g, " ")

  const chatCopy = resolveChatCopy(area, subLabel)

  return (
    <AreaChat
      title={subLabel}
      subtitle={chatCopy.subtitle}
      icon={config?.icon ?? areaConfigs.sistema.icon}
      color={config?.color}
      bg={config?.bg}
      messages={config?.messages ?? []}
      quickActions={chatCopy.quickActions.map((label) => ({
        label,
        onClick: () => {
          if (label.includes("Portal")) {
            router.push(portalDestinations[sub] || "/portal")
            return
          }

          if (label === "Criar cliente") {
            router.push("/app/novo/cliente")
            return
          }

          if (label === "Criar operação") {
            router.push("/app/novo/operacao")
            return
          }

          if (label === "Criar proposta") {
            router.push("/portal/propostas")
            return
          }

          if (label === "Registrar ganho" || label === "Registrar gasto") {
            router.push("/app/novo/financeiro")
            return
          }

          if (label === "Criar documento") {
            router.push("/app/novo/documento")
            return
          }
        },
      }))}
      emptyLabel={chatCopy.emptyLabel}
    />
  )
}
