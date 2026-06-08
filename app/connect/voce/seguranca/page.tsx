"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ChevronLeft, Lock, Smartphone, Laptop, Tablet, LogOut, Check, ShieldCheck,
} from "lucide-react"

type Session = {
  id: string
  device: string
  icon: typeof Laptop
  location: string
  lastActive: string
  current: boolean
}

export default function SegurancaPage() {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ current: "", next: "", confirm: "" })
  const [sessions, setSessions] = useState<Session[]>([
    { id: "1", device: "iPhone 15 Pro", icon: Smartphone, location: "Caxias do Sul, BR", lastActive: "Agora", current: true },
    { id: "2", device: "MacBook Pro", icon: Laptop, location: "Caxias do Sul, BR", lastActive: "Há 2 horas", current: false },
    { id: "3", device: "iPad Air", icon: Tablet, location: "Porto Alegre, BR", lastActive: "Ontem", current: false },
  ])

  const revokeSession = (id: string) => setSessions((s) => s.filter((x) => x.id !== id))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setForm({ current: "", next: "", confirm: "" })
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="px-4 py-4 pb-32 max-w-lg mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-center gap-3 mb-6">
        <span className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-6 h-6 text-gray-600" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#0a0a0a]">Senha e sessões</h1>
          <p className="text-sm text-gray-500">Gerencie sua senha e dispositivos conectados.</p>
        </div>
      </div>

      {/* Change password */}
      <motion.form
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 p-4 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-[#0a0a0a]">Alterar senha</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: "current" as const, label: "Senha atual" },
            { key: "next" as const, label: "Nova senha" },
            { key: "confirm" as const, label: "Confirmar nova senha" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-[#0a0a0a] mb-1.5">{f.label}</label>
              <input
                type="password"
                required
                value={form[f.key]}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="w-full mt-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-2"
        >
          {saved ? (<><Check className="w-4 h-4" /> Senha atualizada</>) : "Atualizar senha"}
        </button>
      </motion.form>

      {/* Sessions */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <h2 className="text-sm font-semibold text-gray-500 px-2 mb-2">Dispositivos conectados</h2>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <s.icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#0a0a0a] text-sm">{s.device}</span>
                  {s.current && (
                    <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Este dispositivo</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">{s.location} • {s.lastActive}</div>
              </div>
              {!s.current && (
                <button
                  onClick={() => revokeSession(s.id)}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
                  aria-label={`Encerrar sessão em ${s.device}`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
