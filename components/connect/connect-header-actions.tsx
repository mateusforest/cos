"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Bell, X, User, SlidersHorizontal, Shield, LogOut, ExternalLink, Clock, Plug } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useConnect } from "./connect-store"
import { useAuth } from "@/components/auth/auth-provider"
import { logoutAction } from "@/actions/auth"
import { UserAvatar } from "@/components/shared/user-avatar"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const avatarMenu = [
  { icon: User, label: "Perfil", href: "/connect/voce" },
  { icon: SlidersHorizontal, label: "Preferências", href: "/connect/voce" },
  { icon: Shield, label: "Segurança", href: "/connect/voce/seguranca" },
]

export function ConnectHeaderActions() {
  const router = useRouter()
  const { sources, mainSystem, openModal, toast } = useConnect()
  const { user, profile, clearAuth } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [isPending, startTransition] = useTransition()

  const displayName = profile?.full_name || user?.email || "Seu perfil"
  const displayEmail = profile?.email || user?.email || "Nenhum e-mail cadastrado"

  const handleSystem = () => {
    if (mainSystem?.url) {
      window.open(mainSystem.url, "_blank", "noopener,noreferrer")
    } else {
      openModal("mainSystem")
    }
  }

  const handleLogout = () => {
    startTransition(async () => {
      clearAuth()
      await createSupabaseBrowserClient().auth.signOut()
      const result = await logoutAction()
      setAvatarOpen(false)
      router.replace(result.redirectTo || "/login")
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button onClick={() => setSearchOpen(true)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Buscar">
          <Search className="w-5 h-5 text-gray-500" />
        </button>
        <button onClick={() => setNotifOpen(true)} className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Notificações">
          <Bell className="w-5 h-5 text-gray-500" />
        </button>
        <div className="relative">
          <button onClick={() => setAvatarOpen((value) => !value)} className="block" aria-label="Menu do perfil">
            <UserAvatar
              fullName={profile?.full_name}
              email={profile?.email || user?.email}
              avatarUrl={profile?.avatar_url}
              size={32}
            />
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAvatarOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                    <UserAvatar
                      fullName={profile?.full_name}
                      email={profile?.email || user?.email}
                      avatarUrl={profile?.avatar_url}
                      size={40}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0a0a0a] truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
                    </div>
                  </div>
                  <div className="p-1.5">
                    {avatarMenu.map((item) => (
                      <Link key={item.label} href={item.href} onClick={() => setAvatarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                        <item.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-[#0a0a0a]">{item.label}</span>
                      </Link>
                    ))}
                    <button onClick={() => { setAvatarOpen(false); handleSystem() }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors w-full">
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-[#0a0a0a]">{mainSystem?.url ? "Acessar Sistema" : "Configurar sistema"}</span>
                    </button>
                  </div>
                  <div className="p-1.5 border-t border-gray-100">
                    <button onClick={handleLogout} disabled={isPending} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors w-full">
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600">{isPending ? "Saindo..." : "Sair"}</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={() => setSearchOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-0 left-0 right-0 z-[70] p-4 sm:flex sm:justify-center">
              <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                  <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Converse com seus sistemas..." className="flex-1 min-w-0 text-base outline-none placeholder:text-gray-400" />
                  <button onClick={() => setSearchOpen(false)} className="p-1 rounded-full hover:bg-gray-100" aria-label="Fechar">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{sources.length > 0 ? "Fontes conectadas" : "Comece conectando"}</p>
                  {sources.length > 0 ? (
                    sources
                      .filter((source) => source.name.toLowerCase().includes(query.toLowerCase()))
                      .map((source) => (
                        <button key={source.id} onClick={() => { setSearchOpen(false); toast(`Busca em ${source.name} em preparação.`) }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors w-full text-left">
                          <Plug className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-[#0a0a0a]">{source.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{source.type}</span>
                        </button>
                      ))
                  ) : (
                    <button onClick={() => { setSearchOpen(false); openModal("system") }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors w-full text-left">
                      <Plug className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-[#0a0a0a]">Conectar primeira fonte</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={() => setNotifOpen(false)} />
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-full sm:max-w-sm bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <span className="text-base font-semibold text-[#0a0a0a]">Notificações</span>
                </div>
                <button onClick={() => setNotifOpen(false)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Fechar">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-[#0a0a0a] mb-1">Nenhuma notificação ainda</p>
                <p className="text-sm text-gray-500 leading-relaxed">Quando o COS atualizar seus sistemas, os alertas aparecerão aqui.</p>
              </div>
              <div className="p-3 border-t border-gray-100 flex-shrink-0">
                <Link href="/connect/historico" onClick={() => setNotifOpen(false)} className="block w-full py-2.5 text-center text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4" /> Ver histórico
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
