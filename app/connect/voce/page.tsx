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
  const connected = sources

  const [user] = useState({
    name: "Mateus Maraschin",
    email: "mateus@conta.com",
    phone: "+55 (54) 99999-9999",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face",
  })

  const [sheet, setSheet] = useState<SheetType>(null)
  const [language, setLanguage] = useState("Portugu\u00eas")
  const [appearance, setAppearance] = useState("Sistema")
  const [notifications, setNotifications] = useState({ push: true, email: true, resumos: false })

  const languages = ["Portugu\u00eas", "Ingl\u00eas", "Espanhol"]
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
        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-0.5">{"Voc\u00ea"}</h1>
        <p className="text-sm text-gray-500">{"Gerencie seu perfil, fontes e prefer\u00eancias."}</p>
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
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
          <Layers className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-base font-semibold text-[#0a0a0a] mb-1">
          {mainSystem ? "Seu sistema principal" : "Nenhum sistema principal"}
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {mainSystem
            ? `O COS est\u00e1 conectado ao ${mainSystem.name}. Abra-o quando precisar trabalhar diretamente no sistema.`
            : "Defina o sistema que voc\u00ea mais usa para acess\u00e1-lo rapidamente pelo COS."}
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
        <MenuItem icon={Building2} label="Dados da empresa" sublabel={"Raz\u00e3o social, CNPJ e endere\u00e7o"} onClick={() => setSheet("empresa")} />
        <MenuItem
          icon={Layers}
          label="Sistema principal conectado"
          sublabel={mainSystem ? mainSystem.name : "Nenhum sistema definido"}
          sublabelColor={mainSystem ? "#22c55e" : "#9ca3af"}
          onClick={() => openModal("mainSystem")}
        />
        <MenuItem icon={Settings2} label={"Prefer\u00eancias da empresa"} sublabel={"Configura\u00e7\u00f5es gerais do espa\u00e7o"} onClick={() => setSheet("empresa")} />
      </Section>

      <Section title="Equipe" delay={0.2}>
        <MenuItem icon={Users} label="Membros" sublabel={"Pessoas com acesso ao espa\u00e7o"} onClick={() => setSheet("equipe")} />
        <MenuItem icon={UserPlus} label="Convites" sublabel="Convide novos membros" onClick={() => setSheet("equipe")} />
        <MenuItem icon={ShieldCheck} label={"Permiss\u00f5es"} sublabel={"Defina pap\u00e9is e acessos"} onClick={() => setSheet("equipe")} />
      </Section>

      <Section title="Assinatura e plano" delay={0.22}>
        <MenuItem icon={CreditCard} label="Plano atual" sublabel="Nenhum plano ativo" onClick={() => setSheet("assinatura")} />
        <MenuItem icon={Users} label={"Usu\u00e1rios inclu\u00eddos"} sublabel="Limites e uso do plano" onClick={() => setSheet("assinatura")} />
        <MenuItem icon={Check} label="Status da assinatura" sublabel={"N\u00e3o configurado"} onClick={() => setSheet("assinatura")} />
      </Section>

      <Section title="Fontes conectadas" delay={0.2}>
        {connected.length === 0 ? (
          <button
            onClick={() => openModal("system")}
            className="flex items-center gap-4 w-full p-4 hover:bg-gray-50 transition-colors"
          >
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
            {connected.map((s) => (
              <MenuItem
                key={s.id}
                icon={Plug}
                label={s.name}
                sublabel={"Em prepara\u00e7\u00e3o"}
                sublabelColor="#9ca3af"
                onClick={() => openModal("mainSystem")}
              />
            ))}
            <button
              onClick={() => openModal("system")}
              className="flex items-center gap-4 w-full p-4 hover:bg-gray-50 transition-colors"
            >
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
        <MenuItem icon={Receipt} label="Faturamento do COS" sublabel={"Hist\u00f3rico, notas fiscais e cobran\u00e7as"} onClick={() => setSheet("faturamento")} />
        <MenuItem icon={Package} label="Pacotes extras" sublabel={"Cr\u00e9ditos IA, armazenamento e usu\u00e1rios"} onClick={() => setSheet("pacotes")} />
      </Section>

      <Section title={"Prefer\u00eancias"} delay={0.3}>
        <MenuItem icon={Globe} label={"Idioma e regi\u00e3o"} sublabel={language} onClick={() => setSheet("idioma")} />
        <MenuItem icon={Moon} label={"Apar\u00eancia"} sublabel={appearance} onClick={() => setSheet("aparencia")} />
        <div className="p-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-[#0a0a0a]">{"Notifica\u00e7\u00f5es"}</div>
              <div className="text-sm text-gray-500">{"Gerencie como voc\u00ea recebe alertas"}</div>
            </div>
          </div>
          <div className="space-y-2 pl-14">
            {[
              { key: "push" as const, label: "Notifica\u00e7\u00f5es push" },
              { key: "email" as const, label: "Alertas por e-mail" },
              { key: "resumos" as const, label: "Resumos di\u00e1rios" },
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

      <Section title={"Seguran\u00e7a"} delay={0.35}>
        <MenuItem icon={Smartphone} label="PIN de acesso" sublabel="Ativado" sublabelColor="#22c55e" onClick={() => setSheet("pin")} />
        <MenuItem icon={Scan} label="Face ID / Biometria" sublabel="Ativado neste dispositivo" sublabelColor="#22c55e" onClick={() => setSheet("biometria")} />
        <MenuItem icon={Lock} label={"Senha e sess\u00f5es"} sublabel="Gerencie acessos e dispositivos" href="/connect/voce/seguranca" />
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
                  <SheetHeader title={"Idioma e regi\u00e3o"} onClose={closeSheet} />
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
                  <SheetHeader title={"Apar\u00eancia"} onClose={closeSheet} />
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
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100 mb-4">
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {"Nenhum faturamento registrado ainda. Os dados de assinatura e cobran\u00e7a aparecer\u00e3o aqui ap\u00f3s a integra\u00e7\u00e3o do backend."}
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
                      <span className="text-sm text-gray-500">{"Raz\u00e3o social"}</span>
                      <span className="text-sm font-medium text-gray-400">{"N\u00e3o informada"}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">CNPJ</span>
                      <span className="text-sm font-medium text-gray-400">{"N\u00e3o informado"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Sistema principal</span>
                      <span className="text-sm font-medium text-[#0a0a0a]">{mainSystem ? mainSystem.name : "N\u00e3o definido"}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {[
                      { icon: Building2, label: "Editar dados da empresa" },
                      { icon: Layers, label: "Gerenciar sistema principal" },
                      { icon: Settings2, label: "Prefer\u00eancias da empresa" },
                    ].map((item) => (
                      <button key={item.label} className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                        <item.icon className="w-5 h-5 text-gray-600" />
                        <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                        <span className="text-xs text-gray-400">{"Em prepara\u00e7\u00e3o"}</span>
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
                      { icon: Users, label: "Membros", desc: "Pessoas com acesso ao espa\u00e7o" },
                      { icon: UserPlus, label: "Convites", desc: "Convide novos membros" },
                      { icon: ShieldCheck, label: "Permiss\u00f5es", desc: "Defina pap\u00e9is e acessos" },
                    ].map((item) => (
                      <button key={item.label} className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                        <item.icon className="w-5 h-5 text-gray-600" />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-[#0a0a0a]">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.desc}</div>
                        </div>
                        <span className="text-xs text-gray-400">{"Em prepara\u00e7\u00e3o"}</span>
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
                      <span className="text-sm text-gray-500">{"Usu\u00e1rios inclu\u00eddos"}</span>
                      <span className="text-sm font-medium text-gray-400">{"\u2014"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Status</span>
                      <span className="text-sm font-medium text-gray-400">{"N\u00e3o configurado"}</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-3 w-full py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                    <Sparkles className="w-5 h-5 text-gray-600" />
                    <span className="flex-1 text-left text-sm font-medium text-[#0a0a0a]">Gerenciar plano</span>
                    <span className="text-xs text-gray-400">{"Em prepara\u00e7\u00e3o"}</span>
                  </button>
                </>
              )}

              {sheet === "pacotes" && (
                <>
                  <SheetHeader title="Pacotes extras" onClose={closeSheet} />
                  <div className="space-y-2">
                    {[
                      { icon: Sparkles, label: "Cr\u00e9ditos IA", description: "Mais respostas e automa\u00e7\u00f5es", detail: "Dispon\u00edvel ap\u00f3s configura\u00e7\u00e3o comercial" },
                      { icon: HardDrive, label: "Armazenamento", description: "Mais espa\u00e7o para arquivos e documentos", detail: "Dispon\u00edvel ap\u00f3s configura\u00e7\u00e3o comercial" },
                      { icon: UserPlus, label: "Usu\u00e1rios adicionais", description: "Adicione mais membros \u00e0 equipe", detail: "Dispon\u00edvel ap\u00f3s configura\u00e7\u00e3o comercial" },
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
