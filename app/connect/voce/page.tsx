"use client"

import { useState } from "react"
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
} from "lucide-react"
import { useConnect } from "@/components/connect/connect-store"
import { useAuth } from "@/components/auth/auth-provider"

type SheetType =
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

export default function ConnectVocePage() {
  const { sources, mainSystem, openModal } = useConnect()
  const { user, profile, workspace } = useAuth()
  const connected = sources
  const [sheet, setSheet] = useState<SheetType>(null)
  const [language, setLanguage] = useState("Português")
  const [appearance, setAppearance] = useState("Sistema")
  const [notifications, setNotifications] = useState({ push: true, email: true, resumos: false })

  const displayUser = {
    name: profile?.name || user?.email || "Seu perfil",
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

  const closeSheet = () => setSheet(null)

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
        <p className="text-sm text-gray-500">Gerencie seu perfil, fontes e preferências.</p>
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
              <Image src={displayUser.avatar} alt={displayUser.name} width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <button type="button" aria-label="Alterar foto de perfil" className="absolute bottom-0 right-0 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white">
              <Camera className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
          <button type="button" className="flex items-center gap-4 flex-1 text-left min-w-0">
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-[#0a0a0a]">{displayUser.name}</div>
              <div className="text-sm text-gray-500 truncate">{displayUser.email}</div>
              <div className="text-sm text-gray-500">{displayUser.phone}</div>
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
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
          <Layers className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-base font-semibold text-[#0a0a0a] mb-1">
          {mainSystem ? "Seu sistema principal" : "Nenhum sistema principal"}
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {mainSystem
            ? `O COS está conectado ao ${mainSystem.name}. Abra-o quando precisar trabalhar diretamente no sistema.`
            : "Defina o sistema que você mais usa para acessá-lo rapidamente pelo COS."}
        </p>
        {mainSystem ? (
          <div className="flex items-center gap-2">
            <a
              href={mainSystem.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
            >
              <Plug className="w-4 h-4" />
              Acessar Sistema
            </a>
            <button
              onClick={() => openModal("mainSystem")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-[#0a0a0a] rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              Trocar
            </button>
          </div>
        ) : (
          <button
            onClick={() => openModal("mainSystem")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Definir sistema principal
          </button>
        )}
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
          <button onClick={() => openModal("system")} className="flex items-center gap-4 w-full p-4 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Plug className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-[#0a0a0a]">Conectar primeira fonte</div>
              <div className="text-sm text-gray-500">Sistemas, planilhas, e-mail ou WhatsApp</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
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
            <button onClick={() => openModal("system")} className="flex items-center gap-4 w-full p-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Plug className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-[#0a0a0a]">Conectar nova fonte</div>
                <div className="text-sm text-gray-500">Adicione mais sistemas ou canais</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
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
                  onClick={() => setNotifications((current) => ({ ...current, [opt.key]: !current[opt.key] }))}
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
        <MenuItem icon={Lock} label="Senha e sessões" sublabel="Gerencie acessos e dispositivos" href="/connect/voce/seguranca" />
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
                    {appearances.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          setAppearance(option.label)
                          closeSheet()
                        }}
                        className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <option.icon className="w-5 h-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{option.label}</span>
                        {appearance === option.label && <Check className="w-5 h-5 text-[#0a0a0a]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "faturamento" && (
                <>
                  <SheetHeader title="Faturamento do COS" onClose={closeSheet} />
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100 mb-4">
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Nenhum faturamento registrado ainda. Os dados de assinatura e cobrança aparecerão aqui após a integração do backend.
                    </p>
                  </div>
                  <div className="space-y-1">
                    {[
                      { icon: Receipt, label: "Histórico de cobranças" },
                      { icon: FileText, label: "Notas fiscais" },
                      { icon: CreditCard, label: "Forma de pagamento" },
                    ].map((item) => (
                      <button key={item.label} className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                        <item.icon className="w-5 h-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "empresa" && (
                <>
                  <SheetHeader title="Minha empresa" onClose={closeSheet} />
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Empresa</span>
                      <span className="text-sm font-medium text-gray-400">{workspace?.name || "Não informada"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Sistema principal</span>
                      <span className="text-sm font-medium text-[#0a0a0a]">{mainSystem ? mainSystem.name : "Não definido"}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {[
                      { icon: Building2, label: "Editar dados da empresa" },
                      { icon: Layers, label: "Gerenciar sistema principal" },
                      { icon: Settings2, label: "Preferências da empresa" },
                    ].map((item) => (
                      <button key={item.label} className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                        <item.icon className="w-5 h-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                        <span className="text-xs text-gray-400">Em preparação</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "equipe" && (
                <>
                  <SheetHeader title="Equipe" onClose={closeSheet} />
                  <div className="space-y-1">
                    {[
                      { icon: Users, label: "Membros", desc: "Pessoas com acesso ao espaço" },
                      { icon: UserPlus, label: "Convites", desc: "Convide novos membros" },
                      { icon: ShieldCheck, label: "Permissões", desc: "Defina papéis e acessos" },
                    ].map((item) => (
                      <button key={item.label} className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                        <item.icon className="w-5 h-5 text-gray-600" />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-[#0a0a0a]">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.desc}</div>
                        </div>
                        <span className="text-xs text-gray-400">Em preparação</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sheet === "assinatura" && (
                <>
                  <SheetHeader title="Assinatura e plano" onClose={closeSheet} />
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Plano atual</span>
                      <span className="text-sm font-medium text-gray-400">Nenhum plano ativo</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Usuários incluídos</span>
                      <span className="text-sm font-medium text-gray-400">—</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Status</span>
                      <span className="text-sm font-medium text-gray-400">Não configurado</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                    <Sparkles className="w-5 h-5 text-gray-600" />
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
