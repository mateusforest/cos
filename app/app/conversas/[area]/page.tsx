"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react"
import { AreaChat } from "@/components/app/area-chat"
import { SupportWorkspaceCenter } from "@/components/support/support-workspace-center"
import { useSupport } from "@/components/support/support-context"
import { areaConfigs, slug } from "@/lib/area-configs"

export default function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = use(params)
  const router = useRouter()
  const { openSupport } = useSupport()
  const config = areaConfigs[area]

  if (!config) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <MessageSquare className="w-7 h-7 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-[#0a0a0a] mb-1">Em preparação</h1>
          <p className="text-sm text-gray-500">Esta área estará disponível em breve.</p>
        </div>
      </div>
    )
  }

  const Icon = config.icon

  if (area === "suporte") {
    return <SupportWorkspaceCenter backHref="/app/conversas" compact />
  }

  if (config.subsections.length === 0) {
    return (
      <AreaChat
        title={config.label}
        subtitle="Atendimento, dúvidas, problemas técnicos, plano, cobrança e integrações."
        icon={Icon}
        color={config.color}
        bg={config.bg}
        messages={config.messages}
        quickActions={config.quickActions.map((label) => ({
          label,
          onClick: label === "Iniciar suporte" ? () => openSupport() : undefined,
        }))}
        emptyLabel="Nenhuma conversa de suporte ainda."
      />
    )
  }

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-center gap-3 mb-5">
        <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
          <Icon className="w-6 h-6" style={{ color: config.color }} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#0a0a0a]">{config.label}</h1>
          <p className="text-sm text-gray-500">Selecione uma área para abrir a conversa.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-6">
        {config.subsections.map((sub) => (
          <Link
            key={sub}
            href={`/app/conversas/${area}/${slug(sub)}`}
            className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
          >
            <span className="text-sm text-[#0a0a0a]">{sub}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}
