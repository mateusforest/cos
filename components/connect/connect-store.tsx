"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { updatePrimarySystemAction } from "@/actions/workspace"

export type ConnectSource = {
  id: string
  name: string
  type: string
  status: "connected" | "preparing"
  sections: string[]
}

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
  sources: ConnectSource[]
  hasSources: boolean
  addSource: (source: ConnectSource) => void
  mainSystem: MainSystem | null
  setMainSystem: (system: MainSystem) => Promise<{ error?: string }>
  modal: ConnectModal
  openModal: (modal: ConnectModal) => void
  closeModal: () => void
  toast: (message: string) => void
}

const ConnectContext = createContext<ConnectContextValue | null>(null)

export function useConnect() {
  const ctx = useContext(ConnectContext)
  if (!ctx) throw new Error("useConnect deve ser usado dentro de ConnectProvider")
  return ctx
}

export function ConnectProvider({ children }: { children: ReactNode }) {
  const { workspace, refresh } = useAuth()
  const [sources, setSources] = useState<ConnectSource[]>([])
  const [modal, setModal] = useState<ConnectModal>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const addSource = useCallback((source: ConnectSource) => {
    setSources((prev) => {
      if (prev.some((item) => item.id === source.id)) return prev
      return [...prev, source]
    })
  }, [])

  const setMainSystem = useCallback(
    async (system: MainSystem) => {
      const result = await updatePrimarySystemAction({
        primarySystemName: system.name,
        primarySystemUrl: system.url,
        primarySystemType: system.type,
        primarySystemNotes: system.notes ?? "",
      })

      if (result.error) {
        return { error: result.error }
      }

      await refresh()
      return {}
    },
    [refresh],
  )

  const openModal = useCallback((value: ConnectModal) => setModal(value), [])
  const closeModal = useCallback(() => setModal(null), [])

  const toast = useCallback((message: string) => {
    setToastMsg(message)
    window.clearTimeout((toast as unknown as { _t?: number })._t)
    ;(toast as unknown as { _t?: number })._t = window.setTimeout(() => setToastMsg(null), 2800)
  }, [])

  const mainSystem =
    workspace?.primary_system_name || workspace?.primary_system_url
      ? {
          name: workspace?.primary_system_name ?? "Sistema principal",
          type: workspace?.metadata?.primary_system_type || "Sistema",
          url: workspace?.primary_system_url ?? "",
          notes: workspace?.metadata?.primary_system_notes || "",
        }
      : null

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
