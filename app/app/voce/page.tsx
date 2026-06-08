"use client"

import { useEffect, useState, type ReactNode } from "react"
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
import { useAuth } from "@/components/auth/auth-provider"
import { updateProfileAction } from "@/actions/profile"
import { toast } from "@/hooks/use-toast"

type SheetType = "perfil" | "idioma" | "aparencia" | "faturamento" | "pacotes" | "pin" | "biometria" | null

type ProfileFormState = {
  fullName: string
  phone: string
  avatarUrl: string
}

const emptyProfileForm: ProfileFormState = {
  fullName: "",
  phone: "",
  avatarUrl: "",
}

export default function VocePage() {
  const [sheet, setSheet] = useState<SheetType>(null)
  const [language, setLanguage] = useState("Português")
  const [appearance, setAppearance] = useState("Sistema")
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    resumos: false,
  })
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm)
  const [profileError, setProfileError] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const { user, profile, workspace, refresh } = useAuth()
  const {
    openCompany,
    openTeam,
    openSubscription,
    openBillingHistory,
    openInvoices,
    openPayment,
  } = useAppInteractions()

  useEffect(() => {
    if (sheet !== "perfil") return

    setProfileForm({
      fullName: profile?.full_name || "",
      phone: profile?.phone || "",
      avatarUrl: profile?.avatar_url || "",
    })
    setProfileError("")
  }, [sheet, profile])

  const displayUser = {
    name: profile?.full_name || user?.email || "Seu perfil",
    email: profile?.email || user?.email || "Nenhum e-mail cadastrado ainda.",
    phone: profile?.phone || "Nenhum telefone cadastrado ainda.",
    avatar:
      profile?.avatar_url ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face",
  }

  const languages = ["Português", "Inglês", "Espanhol"]
  const appearances = [
    { label: "Claro", icon: Sun },
    { label: "Escuro", icon: Moon },
    { label: "Sistema", icon: Monitor },
  ]

  const companyItems = [
    { icon: Building2, label: "Minha empresa", sublabel: workspace?.name || "Nenhuma empresa cadastrada ainda", onClick: openCompany },
    { icon: Users, label: "Equipe", sublabel: "Membros e permissões do workspace", onClick: openTeam },
    { icon: CreditCard, label: "Assinatura e plano", sublabel: "Nenhuma assinatura ativa ainda", onClick: openSubscription },
  ]

  const closeSheet = () => {
    setSheet(null)
    setProfileError("")
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileError("")

    const result = await updateProfileAction({
      fullName: profileForm.fullName,
      phone: profileForm.phone,
      avatarUrl: profileForm.avatarUrl,
    })

    setSavingProfile(false)

    if (result.error) {
      setProfileError(result.error)
      return
    }

    await refresh()
    toast({
      title: "Perfil atualizado",
      description: "Seus dados foram salvos com sucesso.",
    })
    closeSheet()
  }

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
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="font-medium text-[#0a0a0a]">{label}</div>
          <div className="truncate text-sm" style={{ color: sublabelColor || "#6b7280" }}>
            {sublabel}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300" />
      </>
    )

    if (href) {
      return (
        <Link href={href} className="flex w-full items-center gap-4 p-4 transition-colors hover:bg-gray-50">
          {content}
        </Link>
      )
    }

    return (
      <button onClick={onClick} className="flex w-full items-center gap-4 p-4 transition-colors hover:bg-gray-50">
        {content}
      </button>
    )
  }

  const Section = ({ title, delay, children }: { title: string; delay: number; children: ReactNode }) => (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay }} className="mb-6">
      <h2 className="mb-2 px-2 text-sm font-semibold text-gray-500">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50">
        {children}
      </div>
    </motion.div>
  )

  return (
    <div className="px-4 py-6 pb-32">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
        <h1 className="mb-0.5 text-2xl font-bold text-[#0a0a0a]">Você</h1>
        <p className="text-sm text-gray-500">Gerencie seu perfil, empresa e preferências.</p>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-4 rounded-2xl border border-gray-100 bg-white p-4"
      >
        <div className="flex w-full items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-gray-200">
              <Image src={displayUser.avatar} alt={displayUser.name} width={64} height={64} className="h-full w-full object-cover" />
            </div>
            <button type="button" aria-label="Alterar foto de perfil" className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100">
              <Camera className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>
          <button type="button" onClick={() => setSheet("perfil")} className="flex min-w-0 flex-1 items-center gap-4 text-left">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold text-[#0a0a0a]">{displayUser.name}</div>
              <div className="truncate text-sm text-gray-500">{displayUser.email}</div>
              <div className="text-sm text-gray-500">{displayUser.phone}</div>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300" />
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-6 rounded-2xl border border-gray-100 bg-white p-4"
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
          <BarChart3 className="h-5 w-5 text-gray-600" />
        </div>
        <h3 className="mb-1 text-base font-semibold text-[#0a0a0a]">Portal Administrativo</h3>
        <p className="mb-3 text-sm text-gray-500">
          Acompanhe indicadores, gerencie sua equipe, clientes, financeiro e muito mais.
        </p>
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
        >
          <ExternalLink className="h-4 w-4" />
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
          <div className="mb-3 flex items-center gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <Bell className="h-5 w-5 text-gray-600" />
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
                  onClick={() => setNotifications((current) => ({ ...current, [opt.key]: !current[opt.key] }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${notifications[opt.key] ? "bg-[#0a0a0a]" : "bg-gray-200"}`}
                  aria-label={opt.label}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${notifications[opt.key] ? "translate-x-5" : "translate-x-0.5"}`} />
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
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={closeSheet}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8"
            >
              {sheet === "perfil" && (
                <>
                  <SheetHeader title="Perfil" onClose={closeSheet} />
                  <div className="space-y-4">
                    {!profile?.full_name && !profile?.phone && <InfoCard text="Complete seu perfil para deixar seus dados prontos para o uso real do COS." />}
                    <Field label="Nome completo">
                      <input
                        type="text"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm((current) => ({ ...current, fullName: e.target.value }))}
                        placeholder="Seu nome"
                        className={fieldClassName}
                      />
                    </Field>
                    <Field label="E-mail">
                      <input type="email" value={profile?.email || user?.email || ""} readOnly className={`${fieldClassName} cursor-not-allowed opacity-70`} />
                    </Field>
                    <Field label="Telefone">
                      <input
                        type="text"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((current) => ({ ...current, phone: e.target.value }))}
                        placeholder="Telefone"
                        className={fieldClassName}
                      />
                    </Field>
                    <Field label="Avatar URL">
                      <input
                        type="text"
                        value={profileForm.avatarUrl}
                        onChange={(e) => setProfileForm((current) => ({ ...current, avatarUrl: e.target.value }))}
                        placeholder="https://..."
                        className={fieldClassName}
                      />
                    </Field>
                    {profileError && <ErrorCard text={profileError} />}
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={closeSheet} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveProfile}
                        disabled={savingProfile}
                        className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingProfile ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                </>
              )}

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
                        className="flex w-full items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-gray-50"
                      >
                        <span className="text-sm font-medium text-[#0a0a0a]">{lang}</span>
                        {language === lang && <Check className="h-5 w-5 text-[#0a0a0a]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "aparencia" && (
                <>
                  <SheetHeader title="Aparência" onClose={closeSheet} />
                  <div className="space-y-1">
                    {appearances.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          setAppearance(option.label)
                          closeSheet()
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-gray-50"
                      >
                        <option.icon className="h-5 w-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{option.label}</span>
                        {appearance === option.label && <Check className="h-5 w-5 text-[#0a0a0a]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "faturamento" && (
                <>
                  <SheetHeader title="Faturamento do COS" onClose={closeSheet} />
                  <div className="mb-4 rounded-xl bg-gray-50 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Status da assinatura</span>
                      <span className="text-sm font-medium text-gray-400">Não configurada</span>
                    </div>
                    <div className="mb-1 flex items-center justify-between">
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
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-gray-50"
                      >
                        <item.icon className="h-5 w-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
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
                      <div key={item.label} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                          <item.icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[#0a0a0a]">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                          <div className="mt-0.5 text-xs text-gray-400">{item.detail}</div>
                        </div>
                        <button className="flex-shrink-0 rounded-lg bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-white">
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
                      <button key={label} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-gray-50">
                        <ShieldCheck className="h-5 w-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{label}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
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
                      <button key={label} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-gray-50">
                        <Scan className="h-5 w-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{label}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
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

const fieldClassName =
  "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-gray-300"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      {children}
    </label>
  )
}

function InfoCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-sm leading-relaxed text-gray-500">{text}</p>
    </div>
  )
}

function ErrorCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
      <p className="text-sm leading-relaxed text-red-700">{text}</p>
    </div>
  )
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
      <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-gray-100" aria-label="Fechar">
        <X className="h-5 w-5 text-gray-500" />
      </button>
    </div>
  )
}
