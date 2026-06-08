"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  Camera,
  Building2,
  Users,
  CreditCard,
  Receipt,
  Globe,
  Moon,
  Sun,
  Monitor,
  Bell,
  Lock,
  Smartphone,
  Scan,
  ExternalLink,
  BarChart3,
  X,
  Check,
  Package,
  Sparkles,
  HardDrive,
  UserPlus,
  FileText,
  ShieldCheck,
} from "lucide-react"
import { useAppInteractions } from "@/components/app/app-interactions"

type SheetType = "idioma" | "aparencia" | "faturamento" | "pacotes" | "pin" | "biometria" | null

export default function VocePage() {
  const [user] = useState({
    name: "Mateus Maraschin",
    email: "mateus@conta.com",
    phone: "+55 (54) 99999-9999",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face",
  })

  const [sheet, setSheet] = useState<SheetType>(null)
  const [language, setLanguage] = useState("Português")
  const [appearance, setAppearance] = useState("Sistema")
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    resumos: false,
  })
  const {
    openCompany,
    openTeam,
    openSubscription,
    openBillingHistory,
    openInvoices,
    openPayment,
  } = useAppInteractions()

  const languages = ["Português", "Inglês", "Espanhol"]
  const appearances = [
    { label: "Claro", icon: Sun },
    { label: "Escuro", icon: Moon },
    { label: "Sistema", icon: Monitor },
  ]

  const companyItems = [
    { icon: Building2, label: "Minha empresa", sublabel: "Nenhuma empresa cadastrada ainda", onClick: openCompany },
    { icon: Users, label: "Equipe", sublabel: "Nenhum usuário cadastrado ainda", onClick: openTeam },
    { icon: CreditCard, label: "Assinatura e plano", sublabel: "Nenhuma assinatura ativa ainda", onClick: openSubscription },
  ]

  const closeSheet = () => setSheet(null)

  const MenuItem = ({ icon: Icon, label, sublabel, sublabelColor, onClick, href }: {
    icon: typeof Building2
    label: string
    sublabel: string
    sublabelColor?: string
    onClick?: () => void
    href?: string
  }) => {
    const content = (
      <>
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="font-medium text-[#0a0a0a]">{label}</div>
          <div className="text-sm truncate" style={{ color: sublabelColor || "#6b7280" }}>
            {sublabel}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
      </>
    )

    if (href) {
      return (
        <Link href={href} className="flex items-center gap-4 w-full p-4 hover:bg-gray-50 transition-colors">
          {content}
        </Link>
      )
    }

    return (
      <button onClick={onClick} className="flex items-center gap-4 w-full p-4 hover:bg-gray-50 transition-colors">
        {content}
      </button>
    )
  }

  const Section = ({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) => (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay }} className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 px-2 mb-2">{title}</h2>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
        {children}
      </div>
    </motion.div>
  )

  return (
    <div className="px-4 py-6 pb-32">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-0.5">Você</h1>
        <p className="text-sm text-gray-500">Gerencie seu perfil, empresa e preferências.</p>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-4 mb-4 border border-gray-100"
      >
        <div className="flex items-center gap-4 w-full">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
              <Image src={user.avatar} alt={user.name} width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <button type="button" aria-label="Alterar foto de perfil" className="absolute bottom-0 right-0 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white">
              <Camera className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
          <button type="button" className="flex items-center gap-4 flex-1 text-left min-w-0">
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-[#0a0a0a]">{user.name}</div>
              <div className="text-sm text-gray-500 truncate">{user.email}</div>
              <div className="text-sm text-gray-500">{user.phone}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl p-4 mb-6 border border-gray-100"
      >
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
          <BarChart3 className="w-5 h-5 text-gray-600" />
        </div>
        <h3 className="text-base font-semibold text-[#0a0a0a] mb-1">Portal Administrativo</h3>
        <p className="text-sm text-gray-500 mb-3">
          Acompanhe indicadores, gerencie sua equipe, clientes, financeiro e muito mais.
        </p>
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Acessar Portal
        </Link>
      </motion.div>

      <Section title="Empresa" delay={0.2}>
        {companyItems.map((item) => (
          <MenuItem key={item.label} icon={item.icon} label={item.label} sublabel={item.sublabel} onClick={item.onClick} />
        ))}
      </Section>

      <Section title="Faturamento" delay={0.25}>
        <MenuItem icon={Receipt} label="Faturamento do COS" sublabel="Histórico, cobranças e notas fiscais" onClick={() => setSheet("faturamento")} />
        <MenuItem icon={Package} label="Pacotes extras" sublabel="Créditos IA, armazenamento e usuários" onClick={() => setSheet("pacotes")} />
      </Section>

      <Section title="Preferências" delay={0.3}>
        <MenuItem icon={Globe} label="Idioma e região" sublabel={language} onClick={() => setSheet("idioma")} />
        <MenuItem icon={Moon} label="Aparência" sublabel={appearance} onClick={() => setSheet("aparencia")} />
        <div className="p-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-[#0a0a0a]">Notificações</div>
              <div className="text-sm text-gray-500">Gerencie como você recebe alertas</div>
            </div>
          </div>
          <div className="space-y-2 pl-14">
            {[
              { key: "push" as const, label: "Notificações push" },
              { key: "email" as const, label: "Alertas por e-mail" },
              { key: "resumos" as const, label: "Resumos diários" },
            ].map((opt) => (
              <div key={opt.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{opt.label}</span>
                <button
                  onClick={() => setNotifications((n) => ({ ...n, [opt.key]: !n[opt.key] }))}
                  className={`w-11 h-6 rounded-full transition-colors relative ${notifications[opt.key] ? "bg-[#0a0a0a]" : "bg-gray-200"}`}
                  aria-label={opt.label}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${notifications[opt.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Segurança" delay={0.35}>
        <MenuItem icon={Smartphone} label="PIN de acesso" sublabel="Ativado" sublabelColor="#22c55e" onClick={() => setSheet("pin")} />
        <MenuItem icon={Scan} label="Face ID / Biometria" sublabel="Ativado neste dispositivo" sublabelColor="#22c55e" onClick={() => setSheet("biometria")} />
        <MenuItem icon={Lock} label="Senha e sessões" sublabel="Gerencie acessos e dispositivos" href="/app/voce/seguranca" />
      </Section>

      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={closeSheet}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto"
            >
              {sheet === "idioma" && (
                <>
                  <SheetHeader title="Idioma e região" onClose={closeSheet} />
                  <div className="space-y-1">
                    {languages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang)
                          closeSheet()
                        }}
                        className="flex items-center justify-between w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-[#0a0a0a]">{lang}</span>
                        {language === lang && <Check className="w-5 h-5 text-[#0a0a0a]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "aparencia" && (
                <>
                  <SheetHeader title="Aparência" onClose={closeSheet} />
                  <div className="space-y-1">
                    {appearances.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => {
                          setAppearance(opt.label)
                          closeSheet()
                        }}
                        className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <opt.icon className="w-5 h-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{opt.label}</span>
                        {appearance === opt.label && <Check className="w-5 h-5 text-[#0a0a0a]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "faturamento" && (
                <>
                  <SheetHeader title="Faturamento do COS" onClose={closeSheet} />
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Status da assinatura</span>
                      <span className="text-sm font-medium text-gray-400">Não configurada</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Próximo vencimento</span>
                      <span className="text-sm font-medium text-gray-400">—</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Forma de pagamento</span>
                      <span className="text-sm font-medium text-gray-400">—</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {[
                      { icon: Receipt, label: "Histórico de cobrança", onClick: openBillingHistory },
                      { icon: FileText, label: "Notas fiscais", onClick: openInvoices },
                      { icon: CreditCard, label: "Forma de pagamento", onClick: openPayment },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.onClick}
                        className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <item.icon className="w-5 h-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "pacotes" && (
                <>
                  <SheetHeader title="Pacotes extras" onClose={closeSheet} />
                  <div className="space-y-2">
                    {[
                      { icon: Sparkles, label: "Créditos IA", description: "Mais respostas e automações", detail: "Disponível após configuração comercial" },
                      { icon: HardDrive, label: "Armazenamento extra", description: "Mais espaço para arquivos e documentos", detail: "Disponível após configuração comercial" },
                      { icon: UserPlus, label: "Usuários adicionais", description: "Adicione mais membros à equipe", detail: "Disponível após configuração comercial" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#0a0a0a]">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{item.detail}</div>
                        </div>
                        <button className="px-3 py-1.5 bg-[#0a0a0a] text-white rounded-lg text-xs font-medium flex-shrink-0">
                          Adicionar
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {sheet === "pin" && (
                <>
                  <SheetHeader title="PIN de acesso" onClose={closeSheet} />
                  <div className="space-y-1">
                    {["Configurar PIN", "Alterar PIN", "Remover PIN"].map((label) => (
                      <button key={label} className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                        <ShieldCheck className="w-5 h-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "biometria" && (
                <>
                  <SheetHeader title="Face ID / Biometria" onClose={closeSheet} />
                  <div className="space-y-1">
                    {["Ativar biometria", "Desativar biometria", "Gerenciar dispositivos"].map((label) => (
                      <button key={label} className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                        <Scan className="w-5 h-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
      <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors" aria-label="Fechar">
        <X className="w-5 h-5 text-gray-500" />
      </button>
    </div>
  )
}
