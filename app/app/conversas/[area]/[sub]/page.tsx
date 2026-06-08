"use client"

import { use } from "react"
import { AreaChat } from "@/components/app/area-chat"
import { ClientsManager } from "@/components/operations/clients-manager"
import { FinancialManager } from "@/components/operations/financial-manager"
import { areaConfigs, slug } from "@/lib/area-configs"
import { MessageSquare } from "lucide-react"

export default function SubAreaPage({ params }: { params: Promise<{ area: string; sub: string }> }) {
  const { area, sub } = use(params)
  const config = areaConfigs[area]

  const subLabel =
    config?.subsections.find((s) => slug(s) === sub) ??
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
        description="Ganhos, gastos e balanço reais do seu workspace."
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
      emptyLabel={`Ainda não há registros em ${subLabel}. Use o campo abaixo para começar.`}
    />
  )
}
