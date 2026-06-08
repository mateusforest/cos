"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"

/**
 * Estrutura de uma fonte conectada no COS Connect.
 * Preparada para futuramente receber dados reais de
 * Supabase / APIs externas / planilhas / WhatsApp / e-mail.
 */
export type ConnectSource = {
  id: string
  name: string
  type: string // ERP, CRM, Planilha, E-mail, WhatsApp, Banco de dados, Outro
  status: "connected" | "preparing"
  /** Seções que a fonte expõe (Clientes, Pedidos, Financeiro...) */
  sections: string[]
}

/** Sistema principal que a empresa já utiliza. */
export type MainSystem = {
  name: string
  type: string
  url: string
  notes?: string
}

export type ConnectModal =
  | "system"
  | "spreadsheet"
  | "email"
  | "whatsapp"
  | "mainSystem"
  | "equipe"
  | "arquivo"
  | "foto"
  | null

type ConnectContextValue = {
  /** Fontes conectadas. Por padrão vazio -> mostra onboarding. */
  sources: ConnectSource[]
  hasSources: boolean
  addSource: (source: ConnectSource) => void

  /** Sistema principal (CTA "Acessar Sistema" na tela Você). */
  mainSystem: MainSystem | null
  setMainSystem: (system: MainSystem) => void

  /** Controle de modais reutilizáveis. */
  modal: ConnectModal
  openModal: (modal: ConnectModal) => void
  closeModal: () => void

  /** Toast honesto para CTAs ainda sem backend. */
  toast: (message: string) => void
}

const ConnectContext = createContext<ConnectContextValue | null>(null)

export function useConnect() {
  const ctx = useContext(ConnectContext)
  if (!ctx) throw new Error("useConnect deve ser usado dentro de ConnectProvider")
  return ctx
}

export function ConnectProvider({ children }: { children: ReactNode }) {
  // Estado inicial limpo: nenhuma integração ativa -> onboarding.
  const [sources, setSources] = useState<ConnectSource[]>([])
  const [mainSystem, setMainSystemState] = useState<MainSystem | null>(null)
  const [modal, setModal] = useState<ConnectModal>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const addSource = useCallback((source: ConnectSource) => {
    setSources((prev) => {
      if (prev.some((s) => s.id === source.id)) return prev
      return [...prev, source]
    })
  }, [])

  const setMainSystem = useCallback((system: MainSystem) => {
    setMainSystemState(system)
  }, [])

  const openModal = useCallback((m: ConnectModal) => setModal(m), [])
  const closeModal = useCallback(() => setModal(null), [])

  const toast = useCallback((message: string) => {
    setToastMsg(message)
    window.clearTimeout((toast as unknown as { _t?: number })._t)
    ;(toast as unknown as { _t?: number })._t = window.setTimeout(
      () => setToastMsg(null),
      2800,
    )
  }, [])

  return (
    <ConnectContext.Provider
      value={{
        sources,
        hasSources: sources.length > 0,
        addSource,
        mainSystem,
        setMainSystem,
        modal,
        openModal,
        closeModal,
        toast,
      }}
    >
      {children}

      {/* Toast honesto */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-3 bg-[#0a0a0a] text-white rounded-2xl shadow-xl flex items-center gap-2 max-w-[90vw]"
          >
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-sm">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </ConnectContext.Provider>
  )
}
