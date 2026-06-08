"use client"

import { useEffect, useState, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  Camera,
  Globe,
  Moon,
  Sun,
  Monitor,
  Bell,
  Lock,
  Smartphone,
  Scan,
  X,
  Check,
  Plug,
  Receipt,
  FileText,
  CreditCard,
  ShieldCheck,
  Layers,
  Settings2,
  Building2,
  Users,
  Package,
  Sparkles,
  HardDrive,
  UserPlus,
  ExternalLink,
} from "lucide-react"
import { useConnect } from "@/components/connect/connect-store"
import { useAuth } from "@/components/auth/auth-provider"
import { updateProfileAction } from "@/actions/profile"
import {
  addWorkspaceMemberAction,
  getWorkspaceMembersAction,
  updateWorkspaceDetailsAction,
} from "@/actions/workspace"

type SheetType =
  | "perfil"
  | "idioma"
  | "aparencia"
  | "faturamento"
  | "pin"
  | "biometria"
  | "empresa"
  | "equipe"
  | "assinatura"
  | "pacotes"
  | null

type ProfileFormState = {
  fullName: string
  phone: string
  avatarUrl: string
}

type CompanyFormState = {
  companyName: string
  segment: string
  cnpj: string
  phone: string
  email: string
  site: string
  address: string
}

type InviteFormState = {
  name: string
  email: string
  role: "owner" | "admin" | "member"
}

type TeamMember = {
  userId: string
  role: string
  fullName: string
  email: string
}

const emptyProfileForm: ProfileFormState = {
  fullName: "",
  phone: "",
  avatarUrl: "",
}

const emptyCompanyForm: CompanyFormState = {
  companyName: "",
  segment: "",
  cnpj: "",
  phone: "",
  email: "",
  site: "",
  address: "",
}

const emptyInviteForm: InviteFormState = {
  name: "",
  email: "",
  role: "member",
}

function formatRole(role: string) {
  if (role === "owner") return "Proprietário"
  if (role === "admin") return "Admin"
  return "Membro"
}

export default function ConnectVocePage() {
  const { sources, mainSystem, openModal, toast } = useConnect()
  const { user, profile, workspace, canManageWorkspace, refresh } = useAuth()
  const connected = sources
  const [sheet, setSheet] = useState<SheetType>(null)
  const [language, setLanguage] = useState("Português")
  const [appearance, setAppearance] = useState("Sistema")
  const [notifications, setNotifications] = useState({ push: true, email: true, resumos: false })
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm)
  const [profileError, setProfileError] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(emptyCompanyForm)
  const [companyError, setCompanyError] = useState("")
  const [savingCompany, setSavingCompany] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteFormState>(emptyInviteForm)
  const [inviteError, setInviteError] = useState("")
  const [invitingMember, setInvitingMember] = useState(false)

  useEffect(() => {
    if (sheet !== "perfil") return

    setProfileForm({
      fullName: profile?.full_name || "",
      phone: profile?.phone || "",
      avatarUrl: profile?.avatar_url || "",
    })
    setProfileError("")
  }, [sheet, profile])

  useEffect(() => {
    if (sheet !== "empresa") return

    setCompanyForm({
      companyName: workspace?.name || "",
      segment: workspace?.metadata?.segment || "",
      cnpj: workspace?.metadata?.cnpj || "",
      phone: workspace?.metadata?.phone || "",
      email: workspace?.metadata?.email || "",
      site: workspace?.metadata?.site || "",
      address: workspace?.metadata?.address || "",
    })
    setCompanyError("")
  }, [sheet, workspace])

  useEffect(() => {
    if (sheet !== "equipe") return

    let active = true
    setTeamLoading(true)
    setTeamError("")

    void getWorkspaceMembersAction().then((result) => {
      if (!active) return

      if (result.error) {
        setTeamMembers([])
        setTeamError(result.error)
      } else {
        setTeamMembers(result.members ?? [])
      }

      setTeamLoading(false)
    })

    return () => {
      active = false
    }
  }, [sheet])

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

  const closeSheet = () => {
    setSheet(null)
    setProfileError("")
    setCompanyError("")
    setTeamError("")
    setInviteError("")
    setInviteOpen(false)
    setInviteForm(emptyInviteForm)
  }

  const openSystem = () => {
    if (mainSystem?.url) {
      window.open(mainSystem.url, "_blank", "noopener,noreferrer")
      return
    }

    openModal("mainSystem")
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
    toast("Perfil atualizado com sucesso.")
    closeSheet()
  }

  const saveCompany = async () => {
    setSavingCompany(true)
    setCompanyError("")

    const result = await updateWorkspaceDetailsAction({
      name: companyForm.companyName,
      segment: companyForm.segment,
      cnpj: companyForm.cnpj,
      phone: companyForm.phone,
      email: companyForm.email,
      site: companyForm.site,
      address: companyForm.address,
    })

    setSavingCompany(false)

    if (result.error) {
      setCompanyError(result.error)
      return
    }

    await refresh()
    toast("Dados da empresa salvos com sucesso.")
    closeSheet()
  }

  const sendInvite = async () => {
    setInvitingMember(true)
    setInviteError("")

    const result = await addWorkspaceMemberAction({
      email: inviteForm.email,
      role: inviteForm.role,
    })

    setInvitingMember(false)

    if (result.error) {
      setInviteError(result.error)
      return
    }

    const membersResult = await getWorkspaceMembersAction()
    if (!membersResult.error) {
      setTeamMembers(membersResult.members ?? [])
    }

    setInviteForm(emptyInviteForm)
    setInviteOpen(false)
    toast("Membro adicionado ao workspace.")
  }

  const showPermissionToast = () => {
    toast("Apenas owner, admin ou master podem editar esta área.")
  }

  const MenuItem = ({ icon: Icon, label, sublabel, sublabelColor, onClick, href }: {
    icon: typeof Globe
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

  const hasOnlyOwner = teamMembers.length === 1

  return (
    <div className="px-4 py-6 pb-32">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
        <h1 className="mb-0.5 text-2xl font-bold text-[#0a0a0a]">Você</h1>
        <p className="text-sm text-gray-500">Gerencie seu perfil, fontes e preferências.</p>
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
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Layers className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="mb-1 text-base font-semibold text-[#0a0a0a]">
          {mainSystem ? "Seu sistema principal" : "Nenhum sistema principal"}
        </h3>
        <p className="mb-3 text-sm text-gray-500">
          {mainSystem
            ? `O COS está conectado ao ${mainSystem.name}. Abra-o quando precisar trabalhar diretamente no sistema.`
            : "Defina o sistema que você mais usa para acessá-lo rapidamente pelo COS."}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={openSystem}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
          >
            {mainSystem?.url ? <ExternalLink className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
            {mainSystem?.url ? "Acessar Sistema" : "Configurar sistema principal"}
          </button>
          {mainSystem && (
            <button
              onClick={() => openModal("mainSystem")}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-200"
            >
              <Settings2 className="h-4 w-4" />
              Ajustar
            </button>
          )}
        </div>
      </motion.div>

      <Section title="Minha empresa" delay={0.18}>
        <MenuItem icon={Building2} label="Dados da empresa" sublabel={workspace?.name || "Nenhuma empresa cadastrada ainda"} onClick={() => setSheet("empresa")} />
        <MenuItem
          icon={Layers}
          label="Sistema principal conectado"
          sublabel={mainSystem ? mainSystem.name : "Nenhum sistema definido"}
          sublabelColor={mainSystem ? "#22c55e" : "#9ca3af"}
          onClick={() => openModal("mainSystem")}
        />
        <MenuItem icon={Settings2} label="Preferências da empresa" sublabel="Configurações gerais do espaço" onClick={() => setSheet("empresa")} />
      </Section>

      <Section title="Equipe" delay={0.2}>
        <MenuItem icon={Users} label="Membros" sublabel="Pessoas com acesso ao espaço" onClick={() => setSheet("equipe")} />
        <MenuItem icon={UserPlus} label="Convites" sublabel="Convide novos membros" onClick={() => setSheet("equipe")} />
        <MenuItem icon={ShieldCheck} label="Permissões" sublabel="Defina papéis e acessos" onClick={() => setSheet("equipe")} />
      </Section>

      <Section title="Assinatura e plano" delay={0.22}>
        <MenuItem icon={CreditCard} label="Plano atual" sublabel="Nenhum plano ativo" onClick={() => setSheet("assinatura")} />
        <MenuItem icon={Users} label="Usuários incluídos" sublabel="Limites e uso do plano" onClick={() => setSheet("assinatura")} />
        <MenuItem icon={Check} label="Status da assinatura" sublabel="Não configurado" onClick={() => setSheet("assinatura")} />
      </Section>

      <Section title="Fontes conectadas" delay={0.2}>
        {connected.length === 0 ? (
          <button onClick={() => openModal("system")} className="flex w-full items-center gap-4 p-4 transition-colors hover:bg-gray-50">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <Plug className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-[#0a0a0a]">Conectar primeira fonte</div>
              <div className="text-sm text-gray-500">Sistemas, planilhas, e-mail ou WhatsApp</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </button>
        ) : (
          <>
            {connected.map((source) => (
              <MenuItem
                key={source.id}
                icon={Plug}
                label={source.name}
                sublabel="Em preparação"
                sublabelColor="#9ca3af"
                onClick={() => openModal("mainSystem")}
              />
            ))}
            <button onClick={() => openModal("system")} className="flex w-full items-center gap-4 p-4 transition-colors hover:bg-gray-50">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                <Plug className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-[#0a0a0a]">Conectar nova fonte</div>
                <div className="text-sm text-gray-500">Adicione mais sistemas ou canais</div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </button>
          </>
        )}
      </Section>

      <Section title="Faturamento COS" delay={0.26}>
        <MenuItem icon={Receipt} label="Faturamento do COS" sublabel="Histórico, notas fiscais e cobranças" onClick={() => setSheet("faturamento")} />
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
        <MenuItem icon={Lock} label="Senha e sessões" sublabel="Gerencie acessos e dispositivos" href="/connect/voce/seguranca" />
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
                      <input type="text" value={profileForm.fullName} onChange={(e) => setProfileForm((current) => ({ ...current, fullName: e.target.value }))} placeholder="Seu nome" className={fieldClassName} />
                    </Field>
                    <Field label="E-mail">
                      <input type="email" value={profile?.email || user?.email || ""} readOnly className={`${fieldClassName} cursor-not-allowed opacity-70`} />
                    </Field>
                    <Field label="Telefone">
                      <input type="text" value={profileForm.phone} onChange={(e) => setProfileForm((current) => ({ ...current, phone: e.target.value }))} placeholder="Telefone" className={fieldClassName} />
                    </Field>
                    <Field label="Avatar URL">
                      <input type="text" value={profileForm.avatarUrl} onChange={(e) => setProfileForm((current) => ({ ...current, avatarUrl: e.target.value }))} placeholder="https://..." className={fieldClassName} />
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
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
                    <p className="text-sm leading-relaxed text-gray-500">
                      Nenhum faturamento registrado ainda. Os dados de assinatura e cobrança aparecerão aqui após a integração do backend.
                    </p>
                  </div>
                  <div className="space-y-1">
                    {[
                      { icon: Receipt, label: "Histórico de cobranças" },
                      { icon: FileText, label: "Notas fiscais" },
                      { icon: CreditCard, label: "Forma de pagamento" },
                    ].map((item) => (
                      <button key={item.label} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-gray-50">
                        <item.icon className="h-5 w-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "empresa" && (
                <>
                  <SheetHeader title="Minha empresa" onClose={closeSheet} />
                  <div className="space-y-4">
                    {!workspace?.name && !companyForm.segment && <InfoCard text="Sem dados cadastrados ainda." />}
                    {!canManageWorkspace && <InfoCard text="Você pode visualizar os dados da empresa, mas apenas owner, admin ou master podem editar." />}
                    <Field label="Nome da empresa">
                      <input type="text" value={companyForm.companyName} onChange={(e) => setCompanyForm((current) => ({ ...current, companyName: e.target.value }))} placeholder="Nome da empresa" className={fieldClassName} disabled={!canManageWorkspace} />
                    </Field>
                    <Field label="Segmento">
                      <input type="text" value={companyForm.segment} onChange={(e) => setCompanyForm((current) => ({ ...current, segment: e.target.value }))} placeholder="Segmento" className={fieldClassName} disabled={!canManageWorkspace} />
                    </Field>
                    <Field label="CNPJ">
                      <input type="text" value={companyForm.cnpj} onChange={(e) => setCompanyForm((current) => ({ ...current, cnpj: e.target.value }))} placeholder="CNPJ" className={fieldClassName} disabled={!canManageWorkspace} />
                    </Field>
                    <Field label="Telefone">
                      <input type="text" value={companyForm.phone} onChange={(e) => setCompanyForm((current) => ({ ...current, phone: e.target.value }))} placeholder="Telefone" className={fieldClassName} disabled={!canManageWorkspace} />
                    </Field>
                    <Field label="E-mail">
                      <input type="text" value={companyForm.email} onChange={(e) => setCompanyForm((current) => ({ ...current, email: e.target.value }))} placeholder="E-mail" className={fieldClassName} disabled={!canManageWorkspace} />
                    </Field>
                    <Field label="Site">
                      <input type="text" value={companyForm.site} onChange={(e) => setCompanyForm((current) => ({ ...current, site: e.target.value }))} placeholder="Site" className={fieldClassName} disabled={!canManageWorkspace} />
                    </Field>
                    <Field label="Endereço">
                      <textarea value={companyForm.address} onChange={(e) => setCompanyForm((current) => ({ ...current, address: e.target.value }))} rows={3} placeholder="Endereço" className={`${fieldClassName} resize-none`} disabled={!canManageWorkspace} />
                    </Field>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Sistema principal</span>
                        <span className="text-sm font-medium text-[#0a0a0a]">{mainSystem?.name || "Não configurado"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openModal("mainSystem")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#0a0a0a] underline underline-offset-4"
                      >
                        <Settings2 className="h-4 w-4" />
                        {mainSystem ? "Editar sistema principal" : "Configurar sistema principal"}
                      </button>
                    </div>
                    {companyError && <ErrorCard text={companyError} />}
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={closeSheet} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={canManageWorkspace ? saveCompany : showPermissionToast}
                        disabled={savingCompany}
                        className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingCompany ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {sheet === "equipe" && (
                <>
                  <SheetHeader title="Equipe" onClose={closeSheet} />
                  <div className="space-y-4">
                    {teamLoading ? (
                      <InfoCard text="Carregando equipe..." />
                    ) : teamMembers.length === 0 ? (
                      <InfoCard text="Nenhum usuário cadastrado ainda." />
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-gray-100">
                        {teamMembers.map((member) => (
                          <div key={member.userId} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                              {member.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-[#0a0a0a]">{member.fullName}</div>
                              <div className="truncate text-xs text-gray-500">{member.email}</div>
                            </div>
                            <span className="text-xs font-medium text-gray-400">{formatRole(member.role)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {hasOnlyOwner && <InfoCard text="Nenhum outro membro convidado ainda." />}
                    {teamError && <ErrorCard text={teamError} />}
                    {!canManageWorkspace && <InfoCard text="Você pode visualizar a equipe, mas apenas owner, admin ou master podem editar membros e permissões." />}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => (canManageWorkspace ? setInviteOpen((prev) => !prev) : showPermissionToast())}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
                      >
                        <UserPlus className="h-4 w-4" />
                        Convidar membro
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          canManageWorkspace
                            ? toast("O gerenciamento avançado de permissões será expandido na próxima etapa.")
                            : showPermissionToast()
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Gerenciar permissões
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {inviteOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <Field label="Nome">
                              <input type="text" value={inviteForm.name} onChange={(e) => setInviteForm((current) => ({ ...current, name: e.target.value }))} placeholder="Nome" className={fieldClassName} />
                            </Field>
                            <Field label="E-mail">
                              <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((current) => ({ ...current, email: e.target.value }))} placeholder="E-mail" className={fieldClassName} />
                            </Field>
                            <div className="space-y-1.5">
                              <span className="text-sm font-medium text-[#0a0a0a]">Papel</span>
                              <div className="flex flex-wrap gap-2">
                                {["Proprietário", "Admin", "Membro"].map((roleLabel) => (
                                  <button
                                    key={roleLabel}
                                    type="button"
                                    onClick={() =>
                                      setInviteForm((current) => ({
                                        ...current,
                                        role: roleLabel === "Proprietário" ? "owner" : roleLabel === "Admin" ? "admin" : "member",
                                      }))
                                    }
                                    className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                                      roleLabel === formatRole(inviteForm.role)
                                        ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                    }`}
                                  >
                                    {roleLabel}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <InfoCard text="Se o e-mail já existir em profiles, o usuário será adicionado ao workspace. Caso contrário, o convite por e-mail será ativado posteriormente." />
                            {inviteError && <ErrorCard text={inviteError} />}
                            <button
                              type="button"
                              onClick={sendInvite}
                              disabled={invitingMember || !inviteForm.email.trim()}
                              className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {invitingMember ? "Enviando..." : "Enviar convite"}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {sheet === "assinatura" && (
                <>
                  <SheetHeader title="Assinatura e plano" onClose={closeSheet} />
                  <div className="mb-4 rounded-xl bg-gray-50 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Plano atual</span>
                      <span className="text-sm font-medium text-gray-400">Nenhum plano ativo</span>
                    </div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Usuários incluídos</span>
                      <span className="text-sm font-medium text-gray-400">—</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Status</span>
                      <span className="text-sm font-medium text-gray-400">Não configurado</span>
                    </div>
                  </div>
                  <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-gray-50">
                    <Sparkles className="h-5 w-5 text-gray-600" />
                    <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">Gerenciar plano</span>
                    <span className="text-xs text-gray-400">Em preparação</span>
                  </button>
                </>
              )}

              {sheet === "pacotes" && (
                <>
                  <SheetHeader title="Pacotes extras" onClose={closeSheet} />
                  <div className="space-y-2">
                    {[
                      { icon: Sparkles, label: "Créditos IA", description: "Mais respostas e automações", detail: "Disponível após configuração comercial" },
                      { icon: HardDrive, label: "Armazenamento", description: "Mais espaço para arquivos e documentos", detail: "Disponível após configuração comercial" },
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
  "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-gray-300 disabled:cursor-not-allowed disabled:opacity-70"

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
