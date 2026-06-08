"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Mic, Send, Database, FileSpreadsheet, Mail, MessageCircle, Plug, ChevronRight, LifeBuoy } from "lucide-react"
import { useConnect } from "@/components/connect/connect-store"
import { useSupport } from "@/components/support/support-context"

const COS_LOGO =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"

const sourceTypeIcon: Record<string, typeof Database> = {
  ERP: Database,
  CRM: Plug,
  Planilha: FileSpreadsheet,
  "E-mail": Mail,
  WhatsApp: MessageCircle,
  "Banco de dados": Database,
}

export default function ConnectHomePage() {
  const [message, setMessage] = useState("")
  const { sources, hasSources, openModal, toast } = useConnect()
  const { openSupport } = useSupport()

  const onboardingCtas = [
    { icon: Database, label: "Conectar sistema", modal: "system" as const },
    { icon: FileSpreadsheet, label: "Importar planilha", modal: "spreadsheet" as const },
    { icon: Mail, label: "Conectar e-mail", modal: "email" as const },
    { icon: MessageCircle, label: "Conectar WhatsApp", modal: "whatsapp" as const },
    { icon: LifeBuoy, label: "Suporte", action: openSupport },
  ]

  const handleSend = () => {
    if (!message.trim()) return
    toast(
      hasSources
        ? "Resposta do COS em preparação para suas fontes."
        : "Conecte uma fonte para o COS consultar seus dados.",
    )
    setMessage("")
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] lg:min-h-full lg:h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="mb-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Image src={COS_LOGO} alt="COS" width={28} height={28} className="w-7 h-7" />
          </div>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05, duration: 0.3 }} className="text-center mb-5">
          <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-1">Olá, Mateus 👋</h1>
          <p className="text-gray-500 text-sm">O que deseja consultar hoje?</p>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }} className="w-full max-w-sm mb-4">
          <div className="relative bg-white rounded-full shadow-sm border border-gray-200">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Converse com seus sistemas..."
              className="w-full px-5 py-3 pr-20 rounded-full text-sm bg-transparent focus:outline-none"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Falar">
                <Mic className="w-4 h-4" />
              </button>
              <button onClick={handleSend} className="p-2 bg-[#0a0a0a] text-white rounded-full hover:bg-[#1a1a1a] transition-colors" aria-label="Enviar">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.3 }} className="flex flex-wrap justify-center gap-2 max-w-md">
          {hasSources
            ? [
                ...sources.map((s) => ({ kind: "source" as const, source: s })),
                { kind: "support" as const },
              ].map((item, index) => {
                if (item.kind === "support") {
                  return (
                    <button key={`support-${index}`} onClick={openSupport} className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      <LifeBuoy className="w-3.5 h-3.5" />
                      Suporte
                    </button>
                  )
                }
                const Icon = sourceTypeIcon[item.source.type] ?? Plug
                return (
                  <button key={item.source.id} onClick={() => toast(`Consulta em ${item.source.name} em preparação.`)} className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                    {item.source.name}
                  </button>
                )
              })
            : onboardingCtas.map((cta) => (
                <button
                  key={cta.label}
                  onClick={() => ("modal" in cta ? openModal(cta.modal) : cta.action())}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <cta.icon className="w-3.5 h-3.5" />
                  {cta.label}
                </button>
              ))}
        </motion.div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }} className="px-4 pb-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Plug className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Suas fontes</span>
        </div>

        {hasSources ? (
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sources.map((s) => {
                const Icon = sourceTypeIcon[s.type] ?? Plug
                return (
                  <button key={s.id} onClick={() => toast(`${s.name}: conexão em preparação.`)} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left">
                    <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-gray-600" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[#0a0a0a] truncate">{s.name}</span>
                      <span className="block text-[11px] text-gray-400">{s.type}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-5 border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Plug className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-[#0a0a0a] mb-1">Nenhuma integração ativa</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Conecte seu primeiro sistema, importe uma planilha ou configure uma fonte de dados para começar.
            </p>
            <div className="space-y-2">
              <button onClick={() => openModal("system")} className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors">
                <Plug className="w-4 h-4" /> Conecte seu primeiro sistema
              </button>
              <div className="flex gap-2">
                <button onClick={() => openModal("spreadsheet")} className="flex items-center justify-center gap-1.5 flex-1 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                  <FileSpreadsheet className="w-4 h-4" /> Importar planilha
                </button>
                <button onClick={openSupport} className="flex items-center justify-center gap-1.5 flex-1 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                  <LifeBuoy className="w-4 h-4" /> Suporte
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
