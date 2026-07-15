"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Home,
  MessageSquare,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Monitor,
  MoreVertical,
  FileSignature,
  FileText,
  Headphones,
  Star,
} from "lucide-react"
import { ProtectedRouteGuard } from "@/components/auth/auth-route-guard"
import { useAuth } from "@/components/auth/auth-provider"
import { OperationsTemplatePreviewProvider, useOperationsTemplatePreview } from "@/components/operations/operations-template-preview"
import { getOperationsPortalAreaSources } from "@/lib/area-configs"
import { PortalUIProvider, usePortalUI } from "@/components/portal/portal-ui-context"
import { PortalInteractionsProvider, usePortalInteractions } from "@/components/portal/portal-interactions"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Toaster } from "@/components/ui/toaster"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { workspace } = useAuth()

  return (
    <ProtectedRouteGuard>
      <OperationsTemplatePreviewProvider realSegment={workspace?.metadata?.segment}>
        <PortalUIProvider>
          <PortalInteractionsProvider>
            <PortalShell>{children}</PortalShell>
            <Toaster />
          </PortalInteractionsProvider>
        </PortalUIProvider>
      </OperationsTemplatePreviewProvider>
    </ProtectedRouteGuard>
  )
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { mobileMenuOpen, setMobileMenuOpen } = usePortalUI()
  const { openInstall } = usePortalInteractions()
  const { user, profile, workspace } = useAuth()
  const { effectiveSegment } = useOperationsTemplatePreview()
  const pathname = usePathname()
  const displayName = profile?.full_name || user?.email || "Sua conta"
  const displayRole = profile?.global_role === "master" ? "Master" : "Administrador"
  const areaSources = useMemo(
    () => getOperationsPortalAreaSources(effectiveSegment),
    [effectiveSegment],
  )
  const mainNavItems = useMemo(
    () => [
      { icon: Home, label: "Inicio", href: "/portal" },
      { icon: MessageSquare, label: "Conversas", href: "/portal/conversas" },
      ...areaSources.map((area) => ({ icon: area.icon, label: area.label, href: area.portalHref })),
      { icon: Plug, label: "Integracoes", href: "/portal/integracoes" },
      { icon: Settings, label: "Configuracoes", href: "/portal/configuracoes" },
    ],
    [areaSources],
  )
  const favoriteItems = useMemo(() => {
    const documentsArea = areaSources.find((area) => area.key === "documentos")
    const meetingsArea = areaSources.find((area) => area.key === "reunioes")

    return [
      {
        icon: FileSignature,
        label: "Propostas",
        href: "/portal/vendas/propostas",
      },
      {
        icon: FileText,
        label: documentsArea?.subsections?.[0] || "Contratos",
        href: "/portal/documentos/contratos",
      },
      {
        icon: Headphones,
        label: meetingsArea?.label || "Atendimentos",
        href: "/portal/reunioes",
      },
    ]
  }, [areaSources])

  return (
    <div className="flex h-screen bg-white">
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        className={`fixed lg:relative h-full bg-[#fafafa] border-r border-gray-100 flex flex-col z-50 transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: sidebarCollapsed ? 72 : 240 }}
      >
        <div className="flex items-center justify-between p-4 h-16">
          <Link href="/portal" className="flex items-center gap-2">
            {sidebarCollapsed ? (
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"
                alt="COS"
                width={28}
                height={28}
                priority
                style={{ height: "1.75rem", width: "auto" }}
              />
            ) : (
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20header-lB2hw9fMDONpyTpAYQaVVinJsAweku.png"
                alt="COS"
                width={88}
                height={28}
                priority
                className="w-auto"
                style={{ height: "1.6rem", width: "auto" }}
              />
            )}
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive ? "bg-white shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>

          {!sidebarCollapsed && (
            <div className="mt-8">
              <div className="flex items-center gap-2 px-3 mb-2">
                <Star className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Favoritos</span>
              </div>
              <ul className="space-y-1">
                {favoriteItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground transition-all"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={openInstall}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground transition-all ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              {!sidebarCollapsed && <Monitor className="w-4 h-4" />}
            </div>
            {!sidebarCollapsed && <span className="text-sm">Instalar COS</span>}
          </button>

          <div className={`flex items-center gap-3 mt-2 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-all cursor-pointer ${sidebarCollapsed ? "justify-center" : ""}`}>
            <UserAvatar fullName={profile?.full_name} email={profile?.email || user?.email} avatarUrl={profile?.avatar_url} size={32} />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{displayRole}</p>
              </div>
            )}
            {!sidebarCollapsed && <MoreVertical className="w-4 h-4 text-muted-foreground" />}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            className="hidden lg:flex items-center justify-center w-full mt-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
    </div>
  )
}
