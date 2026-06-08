"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home, MessageSquare, Clock, User, Plus, Search,
  Users, Paperclip, Camera, Plug, ChevronRight, Database,
  FileSpreadsheet, Mail, MessageCircle, UserPlus, FileText, Package, Boxes, LifeBuoy,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ConnectProvider, useConnect } from "@/components/connect/connect-store"
import { ConnectModals } from "@/components/connect/connect-modals"
import { ConnectHeaderActions } from "@/components/connect/connect-header-actions"
import { useState, createContext, useContext } from "react"
import { SupportProvider, useSupport } from "@/components/support/support-context"

const COS_LOGO_HEADER =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20header-lB2hw9fMDONpyTpAYQaVVinJsAweku.png"

const navItems = [
  { icon: Home, label: "Início", href: "/connect", exact: true },
  { icon: MessageSquare, label: "Conversas", href: "/connect/conversas" },
  { icon: Clock, label: "Histórico", href: "/connect/historico" },
  { icon: User, label: "Você", href: "/connect/voce" },
]

function sectionIcon(label: string) {
  const l = label.toLowerCase()
  if (l.includes("client")) return UserPlus
  if (l.includes("contrato")) return FileText
  if (l.includes("pedido")) return Package
  if (l.includes("produto") || l.includes("estoque")) return Boxes
  return FileText
}

function ConnectActionSheet() {
  const { isOpen, setIsOpen } = useFAB()
  const { sources, openModal } = useConnect()
  const { openSupport } = useSupport()

  const close = () => setIsOpen(false)

  const baseActions = [
    { icon: Users, label: "Equipe", color: "#f97316", bg: "#ffedd5", onClick: () => openModal("equipe") },
    { icon: Paperclip, label: "Arquivo", color: "#6b7280", bg: "#f3f4f6", onClick: () => openModal("arquivo") },
    { icon: Camera, label: "Foto", color: "#ec4899", bg: "#fce7f3", onClick: () => openModal("foto") },
    { icon: LifeBuoy, label: "Suporte", color: "#6b7280", bg: "#f3f4f6", onClick: () => openSupport() },
  ]

  const dynamicSections = Array.from(new Set(sources.flatMap((s) => s.sections))).slice(0, 8)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:flex lg:items-center lg:justify-center" onClick={close} />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 lg:inset-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-0 lg:pointer-events-none"
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl lg:w-full lg:max-w-md lg:pointer-events-auto">
              <div className="flex items-center justify-center px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-[#0a0a0a]">Criar novo</span>
              </div>

              <div className="p-2">
                <div className="grid grid-cols-4 gap-1">
                  {baseActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => { action.onClick(); close() }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: action.bg }}>
                        <action.icon className="w-5 h-5" style={{ color: action.color }} />
                      </span>
                      <span className="text-xs font-medium text-gray-700">{action.label}</span>
                    </button>
                  ))}
                </div>

                {dynamicSections.length > 0 && (
                  <>
                    <div className="px-2 pt-3 pb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Das suas fontes</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {dynamicSections.map((label) => {
                        const Icon = sectionIcon(label)
                        return (
                          <button
                            key={label}
                            onClick={() => { close(); openModal("system") }}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                          >
                            <span className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-gray-600" />
                            </span>
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[60px]">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                <button onClick={() => { close(); openModal("system") }} className="flex items-center justify-center gap-2 w-full mt-1 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100">
                  <Plug className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Conectar fonte</span>
                </button>
              </div>
            </div>

            <button onClick={close} className="w-full mt-2 py-3.5 bg-white rounded-2xl text-center font-semibold text-gray-700 shadow-lg lg:hidden">
              Cancelar
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const FABContext = createContext<{ isOpen: boolean; setIsOpen: (v: boolean) => void }>({
  isOpen: false,
  setIsOpen: () => {},
})
const useFAB = () => useContext(FABContext)

function BottomNav() {
  const pathname = usePathname()
  const { isOpen, setIsOpen } = useFAB()

  const items = [
    { icon: Home, label: "Início", href: "/connect", exact: true },
    { icon: MessageSquare, label: "Conversas", href: "/connect/conversas" },
    { icon: null, label: "", href: "" },
    { icon: Clock, label: "Histórico", href: "/connect/historico" },
    { icon: User, label: "Você", href: "/connect/voce" },
  ]

  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30 lg:hidden">
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
        {items.map((item, index) => {
          if (index === 2) {
            return (
              <button key="fab" onClick={() => setIsOpen(!isOpen)} className="relative -mt-5">
                <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }} className="w-14 h-14 rounded-full bg-[#0a0a0a] flex items-center justify-center shadow-lg">
                  <Plus className="w-6 h-6 text-white" />
                </motion.div>
              </button>
            )
          }

          const Icon = item.icon!
          const active = isActive(item.href, item.exact)
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 min-w-[60px]">
              <Icon className={`w-5 h-5 ${active ? "text-[#0a0a0a]" : "text-gray-400"}`} fill={active && item.label === "Conversas" ? "currentColor" : "none"} />
              <span className={`text-[10px] ${active ? "text-[#0a0a0a] font-medium" : "text-gray-400"}`}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function GlobalHeader() {
  return (
    <header className="sticky top-0 bg-[#f5f5f3]/95 backdrop-blur-lg z-20 lg:hidden">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Image src={COS_LOGO_HEADER} alt="COS" width={96} height={31} priority className="w-auto" style={{ height: "1.85rem", width: "auto" }} />
          <span className="text-xs font-medium text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">Connect</span>
        </div>
        <ConnectHeaderActions />
      </div>
    </header>
  )
}

const sourceTypeIcon: Record<string, typeof Database> = {
  ERP: Database,
  CRM: Users,
  Planilha: FileSpreadsheet,
  "E-mail": Mail,
  WhatsApp: MessageCircle,
  "Banco de dados": Database,
}

function DesktopSidebar() {
  const pathname = usePathname()
  const { sources, openModal } = useConnect()

  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="hidden lg:flex lg:flex-col w-[280px] flex-shrink-0 border-r border-gray-200 bg-white h-screen">
      <div className="px-5 h-16 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Image src={COS_LOGO_HEADER} alt="COS" width={96} height={31} priority className="w-auto" style={{ height: "1.85rem", width: "auto" }} />
          <span className="text-[10px] font-medium text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">Connect</span>
        </div>
        <ConnectHeaderActions />
      </div>

      <div className="p-3 space-y-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-300" />
        </div>
        <button onClick={() => openModal("system")} className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#0a0a0a] text-white rounded-lg text-sm font-medium hover:bg-[#1a1a1a] transition-colors">
          <Plug className="w-4 h-4" />
          Conectar fonte
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="px-2 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Fontes</span>
        </div>
        {sources.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <Plug className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">Nenhuma fonte conectada ainda. Conecte um sistema para começar.</p>
          </div>
        ) : (
          sources.map((s) => {
            const Icon = sourceTypeIcon[s.type] ?? Plug
            return (
              <Link key={s.id} href="/connect/conversas" className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-600" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-[#0a0a0a] truncate">{s.name}</span>
                  <span className="block text-xs text-gray-400">{s.type}</span>
                </span>
                <span className="text-[10px] text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5 flex-shrink-0">Preparando</span>
              </Link>
            )
          })
        )}
      </div>

      <div className="border-t border-gray-100 p-2 flex-shrink-0">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${active ? "bg-gray-100 text-[#0a0a0a]" : "text-gray-400 hover:bg-gray-50"}`}>
                <item.icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

function DesktopContextPanel() {
  const { sources, openModal } = useConnect()

  const onboarding = [
    { icon: Database, label: "Conectar sistema", modal: "system" as const },
    { icon: FileSpreadsheet, label: "Importar planilha", modal: "spreadsheet" as const },
    { icon: Mail, label: "Conectar e-mail", modal: "email" as const },
    { icon: MessageCircle, label: "Conectar WhatsApp", modal: "whatsapp" as const },
  ]

  return (
    <aside className="hidden xl:flex xl:flex-col w-[300px] flex-shrink-0 border-l border-gray-200 bg-white h-screen">
      <div className="px-4 h-16 flex items-center flex-shrink-0 border-b border-gray-100">
        <span className="text-sm font-semibold text-[#0a0a0a]">Integrações</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sources.length === 0 ? (
          <>
            <p className="text-sm text-gray-500 mb-2 leading-relaxed">
              Conecte uma fonte de dados para o COS conversar com o sistema que sua empresa já usa.
            </p>
            {onboarding.map((o) => (
              <button key={o.label} onClick={() => openModal(o.modal)} className="flex items-center gap-3 w-full p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left">
                <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <o.icon className="w-4 h-4 text-gray-600" />
                </span>
                <span className="text-sm font-medium text-[#0a0a0a]">{o.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
              </button>
            ))}
          </>
        ) : (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Conectadas</span>
            {sources.map((s) => {
              const Icon = sourceTypeIcon[s.type] ?? Plug
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                  <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[#0a0a0a] truncate">{s.name}</span>
                    <span className="block text-xs text-gray-400">{s.type}</span>
                  </span>
                  <span className="text-[10px] text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">Preparando</span>
                </div>
              )
            })}
            <button onClick={() => openModal("system")} className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 border border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Plug className="w-4 h-4" /> Adicionar fonte
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

function ConnectShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <FABContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="min-h-screen bg-[#f5f5f3] lg:flex lg:h-screen lg:overflow-hidden">
        <DesktopSidebar />
        <div className="flex flex-col flex-1 min-w-0 lg:h-screen lg:overflow-hidden">
          <GlobalHeader />
          <main className="pb-20 lg:pb-0 lg:flex-1 lg:overflow-y-auto">{children}</main>
          <BottomNav />
        </div>
        <DesktopContextPanel />
        <ConnectActionSheet />
        <ConnectModals />
      </div>
    </FABContext.Provider>
  )
}

function ConnectProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConnectProvider>
      <SupportProvider>{children}</SupportProvider>
    </ConnectProvider>
  )
}

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConnectProviders>
      <ConnectShell>{children}</ConnectShell>
    </ConnectProviders>
  )
}
