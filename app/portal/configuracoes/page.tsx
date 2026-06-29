"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Bell, Building2, Globe, Settings } from "lucide-react"
import { updatePrimarySystemAction, updateWorkspaceDetailsAction } from "@/actions/workspace"
import { useAuth } from "@/components/auth/auth-provider"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"
import { toast } from "@/hooks/use-toast"

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-[#0a0a0a]" : "bg-gray-200"}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  )
}

export default function ConfiguracoesPage() {
  const { workspace, canManageWorkspace, refresh } = useAuth()
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyPush, setNotifyPush] = useState(false)
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false)
  const [company, setCompany] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    segmento: "",
    site: "",
    endereco: "",
  })
  const [primarySystem, setPrimarySystem] = useState({
    nome: "",
    url: "",
    tipo: "",
    observacoes: "",
  })

  useEffect(() => {
    setCompany({
      nome: workspace?.name || "",
      cnpj: String(workspace?.metadata?.cnpj || ""),
      email: String(workspace?.metadata?.email || ""),
      telefone: String(workspace?.metadata?.phone || ""),
      segmento: String(workspace?.metadata?.segment || ""),
      site: String(workspace?.metadata?.site || ""),
      endereco: String(workspace?.metadata?.address || ""),
    })
    setPrimarySystem({
      nome: workspace?.primary_system_name || "",
      url: workspace?.primary_system_url || "",
      tipo: String(workspace?.metadata?.primary_system_type || ""),
      observacoes: String(workspace?.metadata?.primary_system_notes || ""),
    })
  }, [workspace])

  const handleSaveCompany = async () => {
    const result = await updateWorkspaceDetailsAction({
      name: company.nome,
      segment: company.segmento,
      cnpj: company.cnpj,
      phone: company.telefone,
      email: company.email,
      site: company.site,
      address: company.endereco,
    })

    if (result.error) {
      toast({
        title: "Nao foi possivel salvar",
        description: result.error,
      })
      return
    }

    await refresh()
    toast({
      title: "Empresa atualizada",
      description: "As configuracoes reais da empresa foram salvas com sucesso.",
    })
  }

  const handleSavePrimarySystem = async () => {
    const result = await updatePrimarySystemAction({
      primarySystemName: primarySystem.nome,
      primarySystemUrl: primarySystem.url,
      primarySystemType: primarySystem.tipo,
      primarySystemNotes: primarySystem.observacoes,
    })

    if (result.error) {
      toast({
        title: "Nao foi possivel salvar",
        description: result.error,
      })
      return
    }

    await refresh()
    toast({
      title: "Sistema principal atualizado",
      description: "As configuracoes reais do sistema principal foram salvas com sucesso.",
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <PortalPageHeader title="Configurações" description="Gerencie preferências, empresa e configurações reais do workspace." />

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Dados da empresa</h2>
            </div>

            <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-4 mb-5">
              <p className="text-sm text-muted-foreground">
                {workspace?.name ? "Dados reais carregados do workspace." : "Preencha os dados reais do workspace para concluir a configuracao."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ConfigField label="Nome da empresa">
                <input
                  type="text"
                  value={company.nome}
                  onChange={(e) => setCompany((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome da empresa"
                  disabled={!canManageWorkspace}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </ConfigField>
              <ConfigField label="Segmento">
                <input
                  type="text"
                  value={company.segmento}
                  onChange={(e) => setCompany((prev) => ({ ...prev, segmento: e.target.value }))}
                  placeholder="Segmento"
                  disabled={!canManageWorkspace}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </ConfigField>
              <ConfigField label="CNPJ">
                <input
                  type="text"
                  value={company.cnpj}
                  onChange={(e) => setCompany((prev) => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="CNPJ"
                  disabled={!canManageWorkspace}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </ConfigField>
              <ConfigField label="E-mail de contato">
                <input
                  type="email"
                  value={company.email}
                  onChange={(e) => setCompany((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                  disabled={!canManageWorkspace}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </ConfigField>
              <ConfigField label="Telefone">
                <input
                  type="tel"
                  value={company.telefone}
                  onChange={(e) => setCompany((prev) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="+55 00 00000-0000"
                  disabled={!canManageWorkspace}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </ConfigField>
              <ConfigField label="Site">
                <input
                  type="text"
                  value={company.site}
                  onChange={(e) => setCompany((prev) => ({ ...prev, site: e.target.value }))}
                  placeholder="https://empresa.com"
                  disabled={!canManageWorkspace}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </ConfigField>
            </div>

            <div className="mt-4">
              <ConfigField label="Endereço">
                <textarea
                  value={company.endereco}
                  onChange={(e) => setCompany((prev) => ({ ...prev, endereco: e.target.value }))}
                  placeholder="Endereço da empresa"
                  disabled={!canManageWorkspace}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </ConfigField>
            </div>

            <div className="flex justify-end mt-5">
              <button onClick={handleSaveCompany} disabled={!canManageWorkspace} className="px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                Salvar alterações
              </button>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Preferências regionais</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ConfigField label="Idioma">
                <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                  <option>Português (Brasil)</option>
                  <option>English (US)</option>
                  <option>Español</option>
                </select>
              </ConfigField>
              <ConfigField label="Moeda">
                <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                  <option>Real (R$)</option>
                  <option>Dólar (US$)</option>
                  <option>Euro (€)</option>
                </select>
              </ConfigField>
              <ConfigField label="Fuso horário">
                <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                  <option>Brasília (GMT-3)</option>
                  <option>Lisboa (GMT)</option>
                </select>
              </ConfigField>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Notificações</h2>
            </div>
            <div className="divide-y divide-gray-50">
              <ToggleRow
                title="Por e-mail"
                description="Resumo diário e alertas importantes."
                checked={notifyEmail}
                onChange={() => setNotifyEmail((value) => !value)}
              />
              <ToggleRow
                title="Push no navegador"
                description="Notificações em tempo real."
                checked={notifyPush}
                onChange={() => setNotifyPush((value) => !value)}
              />
              <ToggleRow
                title="Por WhatsApp"
                description="Alertas críticos quando a integração estiver disponível."
                checked={notifyWhatsapp}
                onChange={() => setNotifyWhatsapp((value) => !value)}
              />
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Sistema principal</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ConfigField label="Nome">
                <input
                  type="text"
                  value={primarySystem.nome}
                  onChange={(e) => setPrimarySystem((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do sistema principal"
                  disabled={!canManageWorkspace}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </ConfigField>
              <ConfigField label="Tipo">
                <input
                  type="text"
                  value={primarySystem.tipo}
                  onChange={(e) => setPrimarySystem((prev) => ({ ...prev, tipo: e.target.value }))}
                  placeholder="ERP, CRM, sistema interno..."
                  disabled={!canManageWorkspace}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </ConfigField>
              <div className="md:col-span-2">
                <ConfigField label="URL">
                  <input
                    type="text"
                    value={primarySystem.url}
                    onChange={(e) => setPrimarySystem((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="https://sistema.empresa.com"
                    disabled={!canManageWorkspace}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </ConfigField>
              </div>
            </div>

            <div className="mt-4">
              <ConfigField label="Observações">
                <textarea
                  value={primarySystem.observacoes}
                  onChange={(e) => setPrimarySystem((prev) => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Notas sobre o sistema principal do workspace"
                  disabled={!canManageWorkspace}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </ConfigField>
            </div>

            <div className="flex justify-end mt-5">
              <button onClick={handleSavePrimarySystem} disabled={!canManageWorkspace} className="px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                Salvar sistema principal
              </button>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}

function ConfigField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}
