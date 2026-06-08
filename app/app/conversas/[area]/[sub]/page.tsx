"use client"

import { use } from "react"
import { MessageSquare } from "lucide-react"
import { AreaChat } from "@/components/app/area-chat"
import { ClientsManager } from "@/components/operations/clients-manager"
import { DocumentsManager } from "@/components/operations/documents-manager"
import { FinancialManager } from "@/components/operations/financial-manager"
import { MeetingsManager } from "@/components/operations/meetings-manager"
import { OperationsManager } from "@/components/operations/operations-manager"
import { areaConfigs, slug } from "@/lib/area-configs"

export default function SubAreaPage({ params }: { params: Promise<{ area: string; sub: string }> }) {
  const { area, sub } = use(params)
  const config = areaConfigs[area]

  const subLabel =
    config?.subsections.find((section) => slug(section) === sub) ??
    sub.charAt(0).toUpperCase() + sub.slice(1).replace(/-/g, " ")

  const Icon = config?.icon ?? MessageSquare

  if (area === "cadastros" && sub === "clientes") {
    return (
      <ClientsManager
        title="Clientes"
        description="Gerencie os clientes reais do seu workspace."
        variant="app"
      />
    )
  }

  if (area === "financeiro") {
    return (
      <FinancialManager
        title={subLabel}
        description="Ganhos, gastos e balanco reais do seu workspace."
        variant="app"
      />
    )
  }

  if (area === "operacoes") {
    return (
      <OperationsManager
        title={subLabel}
        description="Acompanhe operacoes reais do seu workspace com status, prioridade e prazo."
        variant="app"
      />
    )
  }

  if (area === "documentos") {
    return (
      <DocumentsManager
        title={subLabel}
        description="Centralize documentos reais do seu workspace sem depender de dados simulados."
        variant="app"
        filterType={sub}
      />
    )
  }

  if (area === "reunioes") {
    return (
      <MeetingsManager
        title={subLabel}
        description="Registre reunioes reais e acompanhe o que ja foi gravado no seu workspace."
        variant="app"
      />
    )
  }

  return (
    <AreaChat
      title={subLabel}
      subtitle={config ? `${config.label} · COS` : "COS"}
      icon={Icon}
      color={config?.color}
      bg={config?.bg}
      messages={config?.messages ?? []}
      quickActions={(config?.quickActions ?? []).map((label) => ({ label }))}
      emptyLabel={`Ainda nao ha registros em ${subLabel}. Use o campo abaixo para comecar.`}
    />
  )
}
