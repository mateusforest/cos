"use client"

import Image from "next/image"
import { useEffect, useState, type ChangeEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Database, FileSpreadsheet, Mail, MessageCircle, Users, Paperclip, Camera, Settings2, Wrench, X, ExternalLink, Plus } from "lucide-react"
import {
  createConnectActionAction,
  createConnectSectionAction,
  createConnectSourceAction,
  deleteConnectSourceAction,
  type ConnectActionType,
  type ConnectSourceStatus,
} from "@/actions/connect"
import { addWorkspaceMemberAction } from "@/actions/workspace"
import { useConnect } from "@/components/connect/connect-store"

const sourceTypeOptions = [
  { value: "ERP", label: "Sistema", icon: Database },
  { value: "API", label: "API", icon: ExternalLink },
  { value: "Planilha", label: "Planilha", icon: FileSpreadsheet },
  { value: "E-mail", label: "E-mail", icon: Mail },
  { value: "WhatsApp", label: "WhatsApp", icon: MessageCircle },
  { value: "CRM", label: "CRM", icon: Users },
  { value: "Banco de dados", label: "Banco", icon: Database },
  { value: "Portal interno", label: "Portal", icon: Database },
  { value: "Outro", label: "Outro", icon: Database },
] as const
const actionTypes: Array<{ value: ConnectActionType; label: string }> = [
  { value: "read", label: "Consultar" },
  { value: "create", label: "Criar" },
  { value: "update", label: "Atualizar" },
  { value: "delete", label: "Remover" },
  { value: "send", label: "Enviar" },
  { value: "import", label: "Importar" },
  { value: "export", label: "Exportar" },
  { value: "report", label: "Relatorio" },
  { value: "custom", label: "Personalizada" },
]

const fieldClassName =
  "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-gray-300"

const COS_LOGO =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"

const preparationSteps = ["Identificar", "Analisar", "Organizar", "Finalizar"] as const

type SpreadsheetImportPayload = {
  fileName: string
  mimeType: string
  base64: string
}

type SourceFormState = {
  name: string
  sourceType: string
  status: ConnectSourceStatus
  accessUrl: string
  notes: string
  spreadsheetFileName: string
  spreadsheetSheetName: string
  emailConnectionType: string
  emailAddress: string
  whatsappConnectionType: string
  whatsappNumber: string
  whatsappInstance: string
  credentialsMode: string
  credentialUser: string
  credentialSecret: string
}

type SectionFormState = {
  name: string
  description: string
}

type ActionFormState = {
  name: string
  actionType: ConnectActionType
  notes: string
}

type TeamFormState = {
  email: string
  role: "owner" | "admin" | "member"
}

function defaultSourceForm(type = "", status: ConnectSourceStatus = "configured"): SourceFormState {
  return {
    name: "",
    sourceType: type,
    status,
    accessUrl: "",
    notes: "",
    spreadsheetFileName: "",
    spreadsheetSheetName: "",
    emailConnectionType: "imap_smtp",
    emailAddress: "",
    whatsappConnectionType: "cloud_api",
    whatsappNumber: "",
    whatsappInstance: "",
    credentialsMode: "none",
    credentialUser: "",
    credentialSecret: "",
  }
}

function getSourceTypeIcon(sourceType: string) {
  return sourceTypeOptions.find((option) => option.value === sourceType)?.icon ?? Database
}

function getSourceInfoText(sourceType: string) {
  if (sourceType === "Planilha") {
    return "O COS vai identificar as areas principais da planilha e deixar a fonte pronta para conversar."
  }

  if (sourceType === "E-mail") {
    return "O COS vai organizar a entrada deste canal para voce conversar com mais contexto."
  }

  if (sourceType === "WhatsApp") {
    return "O COS vai preparar este canal para leitura operacional e acompanhamento das conversas."
  }

  if (sourceType === "ERP" || sourceType === "API" || sourceType === "CRM" || sourceType === "Banco de dados" || sourceType === "Portal interno") {
    return "O COS vai ler os dados informados, organizar a operacao e preparar esta fonte para consulta."
  }

  return "O COS vai organizar esta fonte e deixar um ponto de partida claro para sua operacao."
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      const base64 = result.includes(",") ? result.split(",")[1] : ""

      if (!base64) {
        reject(new Error("Arquivo sem conteudo legivel."))
        return
      }

      resolve(base64)
    }

    reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo selecionado."))
    reader.readAsDataURL(file)
  })
}

export function ConnectModals() {
  const {
    modal,
    closeModal,
    setMainSystem,
    refreshData,
    canManage,
    selectedSource,
    selectedAction,
    toast,
    mainSystem,
  } = useConnect()

  const [sourceForm, setSourceForm] = useState<SourceFormState>(defaultSourceForm("ERP", "configured"))
  const [sectionForm, setSectionForm] = useState<SectionFormState>({ name: "", description: "" })
  const [actionForm, setActionForm] = useState<ActionFormState>({ name: "", actionType: "read", notes: "" })
  const [teamForm, setTeamForm] = useState<TeamFormState>({ email: "", role: "member" })
  const [mainSystemForm, setMainSystemForm] = useState({ name: "", type: "Sistema", url: "", notes: "" })
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preparationStepIndex, setPreparationStepIndex] = useState(0)
  const [spreadsheetImportPayload, setSpreadsheetImportPayload] = useState<SpreadsheetImportPayload | null>(null)

  const resetAndClose = () => {
    setError("")
    setIsSubmitting(false)
    setPreparationStepIndex(0)
    setSpreadsheetImportPayload(null)
    closeModal()
  }

  useEffect(() => {
    if (modal?.type !== "source") return

    const presetType = modal.sourceTypePreset ?? ""
    const defaultStatus = presetType === "E-mail" || presetType === "WhatsApp" ? "not_configured" : "configured"
    setSourceForm(defaultSourceForm(presetType, defaultStatus))
    setSpreadsheetImportPayload(null)
    setError("")
  }, [modal?.type, modal?.sourceTypePreset])

  useEffect(() => {
    if (!isSubmitting || modal?.type !== "source") {
      setPreparationStepIndex(0)
      return
    }

    const interval = setInterval(() => {
      setPreparationStepIndex((current) => (current < preparationSteps.length - 1 ? current + 1 : current))
    }, 900)

    return () => clearInterval(interval)
  }, [isSubmitting, modal?.type])

  useEffect(() => {
    if (modal?.type !== "mainSystem") return

    setMainSystemForm({
      name: mainSystem?.name || "",
      type: mainSystem?.type || "Sistema",
      url: mainSystem?.url || "",
      notes: mainSystem?.notes || "",
    })
    setError("")
  }, [mainSystem, modal?.type])

  const handleSourceTypeChange = (nextType: string) => {
    const nextStatus = nextType === "E-mail" || nextType === "WhatsApp" ? "not_configured" : "configured"

    setSourceForm((current) => ({
      ...defaultSourceForm(nextType, nextStatus),
      name: current.name,
      notes: current.notes,
    }))
    setSpreadsheetImportPayload(null)
  }

  const handleSpreadsheetFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    setSourceForm((current) => ({
      ...current,
      spreadsheetFileName: file?.name || "",
    }))

    setSpreadsheetImportPayload(null)

    if (!file) {
      return
    }

    try {
      const base64 = await readFileAsBase64(file)
      setSpreadsheetImportPayload({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        base64,
      })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Nao foi possivel ler a planilha selecionada.")
    }
  }

  const handleCreateSource = async () => {
    setIsSubmitting(true)
    setError("")

    const isSpreadsheet = sourceForm.sourceType === "Planilha"
    const isEmail = sourceForm.sourceType === "E-mail"
    const isWhatsapp = sourceForm.sourceType === "WhatsApp"
    const usesUrlAndCredentials =
      sourceForm.sourceType === "ERP" ||
      sourceForm.sourceType === "API" ||
      sourceForm.sourceType === "CRM" ||
      sourceForm.sourceType === "Banco de dados" ||
      sourceForm.sourceType === "Portal interno"

    const nextConfig: Record<string, unknown> = {}

    if (sourceForm.notes.trim()) {
      nextConfig.notes = sourceForm.notes.trim()
    }

    if (isSpreadsheet) {
      if (!spreadsheetImportPayload) {
        setIsSubmitting(false)
        setError("Selecione um arquivo CSV ou XLSX para preparar esta fonte.")
        return
      }

      nextConfig.uploadFileName = sourceForm.spreadsheetFileName.trim() || null
      nextConfig.sheetName = sourceForm.spreadsheetSheetName.trim() || null
      nextConfig.spreadsheetImport = spreadsheetImportPayload
    }

    if (isEmail) {
      nextConfig.connectionType = sourceForm.emailConnectionType
      nextConfig.emailAddress = sourceForm.emailAddress.trim() || null
    }

    if (isWhatsapp) {
      nextConfig.connectionType = sourceForm.whatsappConnectionType
      nextConfig.phoneNumber = sourceForm.whatsappNumber.trim() || null
      nextConfig.instanceName = sourceForm.whatsappInstance.trim() || null
    }

    if (usesUrlAndCredentials) {
      nextConfig.credentialsMode = sourceForm.credentialsMode
      nextConfig.credentialUser = sourceForm.credentialUser.trim() || null
      nextConfig.credentialSecret = sourceForm.credentialSecret.trim() || null
    }

    const result = await createConnectSourceAction({
      name: sourceForm.name,
      sourceType: sourceForm.sourceType,
      status: "not_configured",
      accessUrl: usesUrlAndCredentials ? sourceForm.accessUrl : "",
      config: nextConfig,
    })
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    await refreshData({ silent: true })
    toast("Fonte pronta para conversar.")
    setSourceForm(defaultSourceForm())
    resetAndClose()
  }

  const handleCreateSection = async () => {
    if (!selectedSource) {
      setError("Escolha uma fonte para criar a sessao.")
      return
    }
    setIsSubmitting(true)
    setError("")
    const result = await createConnectSectionAction({
      sourceId: selectedSource.id,
      name: sectionForm.name,
      description: sectionForm.description,
      config: {},
    })
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    await refreshData({ silent: true })
    toast("Sessao criada com sucesso.")
    setSectionForm({ name: "", description: "" })
    resetAndClose()
  }

  const handleCreateAction = async () => {
    if (!selectedSource) {
      setError("Escolha uma fonte para criar a acao.")
      return
    }
    setIsSubmitting(true)
    setError("")
    const result = await createConnectActionAction({
      sourceId: selectedSource.id,
      name: actionForm.name,
      actionType: actionForm.actionType,
      config: actionForm.notes.trim() ? { notes: actionForm.notes.trim() } : {},
    })
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    await refreshData({ silent: true })
    toast("Acao criada com sucesso.")
    setActionForm({ name: "", actionType: "read", notes: "" })
    resetAndClose()
  }

  const handleDeleteSource = async () => {
    if (!selectedSource) {
      setError("Escolha uma fonte para remover.")
      return
    }

    setIsSubmitting(true)
    setError("")
    const result = await deleteConnectSourceAction({
      sourceId: selectedSource.id,
    })
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    await refreshData({ silent: true })
    toast("Fonte removida com sucesso.")
    resetAndClose()
  }

  const handleInviteMember = async () => {
    setIsSubmitting(true)
    setError("")
    const result = await addWorkspaceMemberAction({
      email: teamForm.email,
      role: teamForm.role,
    })
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    toast("Membro adicionado ao workspace.")
    setTeamForm({ email: "", role: "member" })
    resetAndClose()
  }

  const handleSaveMainSystem = async () => {
    setIsSubmitting(true)
    setError("")
    const result = await setMainSystem({
      name: mainSystemForm.name,
      type: mainSystemForm.type,
      url: mainSystemForm.url,
      notes: mainSystemForm.notes,
    })
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    toast("Sistema principal salvo com sucesso.")
    resetAndClose()
  }

  const renderBody = () => {
    if (!modal?.type) return null

    if (modal.type === "source") {
      const SourceIcon = getSourceTypeIcon(sourceForm.sourceType)
      const isSpreadsheet = sourceForm.sourceType === "Planilha"
      const isEmail = sourceForm.sourceType === "E-mail"
      const isWhatsapp = sourceForm.sourceType === "WhatsApp"
      const usesUrlAndCredentials =
        sourceForm.sourceType === "ERP" ||
        sourceForm.sourceType === "API" ||
        sourceForm.sourceType === "CRM" ||
        sourceForm.sourceType === "Banco de dados" ||
        sourceForm.sourceType === "Portal interno"

      return (
        <>
          <ModalHeader title="Nova fonte" onClose={resetAndClose} icon={SourceIcon} />
          <div className="space-y-4">
            {isSubmitting ? (
              <div className="rounded-3xl border border-gray-100 bg-gray-50 px-6 py-10 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2, ease: "linear" }}
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm"
                >
                  <Image src={COS_LOGO} alt="COS" width={34} height={34} className="h-8 w-8" />
                </motion.div>
                <p className="text-base font-semibold text-[#0a0a0a]">O COS esta preparando sua operacao.</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Estamos analisando a fonte e organizando tudo para voce.
                </p>
                <div className="mt-6 overflow-hidden rounded-full bg-white">
                  <motion.div
                    className="h-2 rounded-full bg-[#0a0a0a]"
                    animate={{ width: `${((preparationStepIndex + 1) / preparationSteps.length) * 100}%` }}
                  />
                </div>
                <div className="mt-5 space-y-2 text-left">
                  {preparationSteps.map((step, index) => {
                    const isDone = index <= preparationStepIndex
                    return (
                      <div key={step} className="flex items-center gap-2 text-sm">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                            isDone ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-white text-gray-300"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className={isDone ? "text-[#0a0a0a]" : "text-gray-400"}>{step}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <>
            <InfoCard text={getSourceInfoText(sourceForm.sourceType)} />
            <Field label="Tipo de fonte">
              <div className="grid grid-cols-3 gap-2">
                {sourceTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSourceTypeChange(option.value)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                      sourceForm.sourceType === option.value
                        ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <option.icon className="mb-2 h-4 w-4" />
                    <span className="block text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Nome da fonte">
              <input
                type="text"
                value={sourceForm.name}
                onChange={(event) => setSourceForm((current) => ({ ...current, name: event.target.value }))}
                placeholder={
                  isSpreadsheet
                    ? "Ex.: Planilha Comercial"
                    : isEmail
                      ? "Ex.: Caixa de atendimento"
                      : isWhatsapp
                        ? "Ex.: WhatsApp Comercial"
                        : "Ex.: ERP Interno"
                }
                className={fieldClassName}
              />
            </Field>

            {isSpreadsheet && (
              <>
                <Field label="Upload da planilha">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleSpreadsheetFileChange}
                    className={fieldClassName}
                  />
                </Field>
                <Field label="Aba ou referencia da planilha">
                  <input
                    type="text"
                    value={sourceForm.spreadsheetSheetName}
                    onChange={(event) => setSourceForm((current) => ({ ...current, spreadsheetSheetName: event.target.value }))}
                    placeholder="Ex.: Clientes"
                    className={fieldClassName}
                  />
                </Field>
              </>
            )}

            {isEmail && (
              <>
                <Field label="Tipo de conexao">
                  <select
                    value={sourceForm.emailConnectionType}
                    onChange={(event) => setSourceForm((current) => ({ ...current, emailConnectionType: event.target.value }))}
                    className={fieldClassName}
                  >
                    <option value="imap_smtp">IMAP / SMTP</option>
                    <option value="google_workspace">Google Workspace</option>
                    <option value="microsoft_365">Microsoft 365</option>
                    <option value="other">Outro</option>
                  </select>
                </Field>
                <Field label="E-mail da conta">
                  <input
                    type="email"
                    value={sourceForm.emailAddress}
                    onChange={(event) => setSourceForm((current) => ({ ...current, emailAddress: event.target.value }))}
                    placeholder="contato@empresa.com"
                    className={fieldClassName}
                  />
                </Field>
              </>
            )}

            {isWhatsapp && (
              <>
                <Field label="Modo de conexao">
                  <select
                    value={sourceForm.whatsappConnectionType}
                    onChange={(event) => setSourceForm((current) => ({ ...current, whatsappConnectionType: event.target.value }))}
                    className={fieldClassName}
                  >
                    <option value="cloud_api">Cloud API</option>
                    <option value="webhook">Webhook</option>
                    <option value="other">Outro</option>
                  </select>
                </Field>
                <Field label="Numero">
                  <input
                    type="text"
                    value={sourceForm.whatsappNumber}
                    onChange={(event) => setSourceForm((current) => ({ ...current, whatsappNumber: event.target.value }))}
                    placeholder="+55 11 99999-9999"
                    className={fieldClassName}
                  />
                </Field>
                <Field label="Instancia ou identificador">
                  <input
                    type="text"
                    value={sourceForm.whatsappInstance}
                    onChange={(event) => setSourceForm((current) => ({ ...current, whatsappInstance: event.target.value }))}
                    placeholder="Opcional"
                    className={fieldClassName}
                  />
                </Field>
              </>
            )}

            {usesUrlAndCredentials && (
              <>
                <Field label="URL de acesso">
                  <input
                    type="text"
                    value={sourceForm.accessUrl}
                    onChange={(event) => setSourceForm((current) => ({ ...current, accessUrl: event.target.value }))}
                    placeholder="https://..."
                    className={fieldClassName}
                  />
                </Field>
                <Field label="Credenciais">
                  <select
                    value={sourceForm.credentialsMode}
                    onChange={(event) => setSourceForm((current) => ({ ...current, credentialsMode: event.target.value }))}
                    className={fieldClassName}
                  >
                    <option value="none">Sem credenciais</option>
                    <option value="user_password">Usuario e senha</option>
                    <option value="api_key">API key / token</option>
                  </select>
                </Field>
                {sourceForm.credentialsMode !== "none" && (
                  <>
                    <Field label={sourceForm.credentialsMode === "api_key" ? "Identificador" : "Usuario"}>
                      <input
                        type="text"
                        value={sourceForm.credentialUser}
                        onChange={(event) => setSourceForm((current) => ({ ...current, credentialUser: event.target.value }))}
                        placeholder={sourceForm.credentialsMode === "api_key" ? "Opcional" : "Usuario"}
                        className={fieldClassName}
                      />
                    </Field>
                    <Field label={sourceForm.credentialsMode === "api_key" ? "API key / token" : "Senha"}>
                      <input
                        type="password"
                        value={sourceForm.credentialSecret}
                        onChange={(event) => setSourceForm((current) => ({ ...current, credentialSecret: event.target.value }))}
                        placeholder={sourceForm.credentialsMode === "api_key" ? "Cole a chave" : "Digite a senha"}
                        className={fieldClassName}
                      />
                    </Field>
                  </>
                )}
              </>
            )}

            <Field label="Observacoes">
              <textarea
                value={sourceForm.notes}
                onChange={(event) => setSourceForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Opcional"
                className={`${fieldClassName} resize-none`}
              />
            </Field>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleCreateSource}
              confirmLabel="Criar fonte"
              disabled={isSubmitting}
            />
              </>
            )}
          </div>
        </>
      )
    }

    if (modal.type === "section") {
      return (
        <>
          <ModalHeader title="Criar sessao" onClose={resetAndClose} icon={Plus} />
          <div className="space-y-4">
            <InfoCard text={selectedSource ? `Fonte selecionada: ${selectedSource.name}` : "Escolha uma fonte antes de criar a sessao."} />
            <Field label="Nome da sessao">
              <input
                type="text"
                value={sectionForm.name}
                onChange={(event) => setSectionForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Clientes"
                className={fieldClassName}
              />
            </Field>
            <Field label="Descricao">
              <textarea
                value={sectionForm.description}
                onChange={(event) => setSectionForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Explique o contexto desta sessao."
                className={`${fieldClassName} resize-none`}
              />
            </Field>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleCreateSection}
              confirmLabel={isSubmitting ? "Salvando..." : "Criar sessao"}
              disabled={isSubmitting}
            />
          </div>
        </>
      )
    }

    if (modal.type === "action") {
      return (
        <>
          <ModalHeader title="Criar acao" onClose={resetAndClose} icon={Wrench} />
          <div className="space-y-4">
            <InfoCard text={selectedSource ? `Fonte selecionada: ${selectedSource.name}` : "Escolha uma fonte antes de criar a acao."} />
            <Field label="Nome da acao">
              <input
                type="text"
                value={actionForm.name}
                onChange={(event) => setActionForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Consultar cliente"
                className={fieldClassName}
              />
            </Field>
            <Field label="Tipo de acao">
              <select
                value={actionForm.actionType}
                onChange={(event) =>
                  setActionForm((current) => ({
                    ...current,
                    actionType: event.target.value as ConnectActionType,
                  }))
                }
                className={fieldClassName}
              >
                {actionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Observacoes">
              <textarea
                value={actionForm.notes}
                onChange={(event) => setActionForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Descreva quando esta acao deve ser usada."
                className={`${fieldClassName} resize-none`}
              />
            </Field>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleCreateAction}
              confirmLabel={isSubmitting ? "Salvando..." : "Criar acao"}
              disabled={isSubmitting}
            />
          </div>
        </>
      )
    }

    if (modal.type === "configuredAction") {
      return (
        <>
          <ModalHeader title={selectedAction?.name || "Acao configurada"} onClose={resetAndClose} icon={Wrench} />
          <div className="space-y-4">
            <InfoCard text="Esta acao esta configurada, mas a execucao real sera conectada quando a fonte estiver integrada." />
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
              <div className="flex items-center justify-between">
                <span>Tipo de acao</span>
                <span className="font-medium text-[#0a0a0a]">{selectedAction?.actionType || "custom"}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
            >
              Entendi
            </button>
          </div>
        </>
      )
    }

    if (modal.type === "deleteSource") {
      return (
        <>
          <ModalHeader title="Remover fonte" onClose={resetAndClose} icon={Database} />
          <div className="space-y-4">
            <InfoCard text={`Fonte selecionada: ${selectedSource?.name || "Fonte nao encontrada."}`} />
            <p className="text-sm leading-relaxed text-gray-500">
              Tem certeza que deseja remover esta fonte? As sessoes e acoes vinculadas tambem serao removidas.
            </p>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleDeleteSource}
              confirmLabel={isSubmitting ? "Removendo..." : "Remover fonte"}
              disabled={isSubmitting || !selectedSource}
            />
          </div>
        </>
      )
    }

    if (modal.type === "mainSystem") {
      return (
        <>
          <ModalHeader title="Configurar sistema principal" onClose={resetAndClose} icon={Settings2} />
          <div className="space-y-4">
            <Field label="Nome do sistema">
              <input
                type="text"
                value={mainSystemForm.name}
                onChange={(event) => setMainSystemForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: ERP Interno"
                className={fieldClassName}
              />
            </Field>
            <Field label="Tipo">
              <input
                type="text"
                value={mainSystemForm.type}
                onChange={(event) => setMainSystemForm((current) => ({ ...current, type: event.target.value }))}
                placeholder="Sistema"
                className={fieldClassName}
              />
            </Field>
            <Field label="URL">
              <input
                type="text"
                value={mainSystemForm.url}
                onChange={(event) => setMainSystemForm((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://..."
                className={fieldClassName}
              />
            </Field>
            <Field label="Observacoes">
              <textarea
                value={mainSystemForm.notes}
                onChange={(event) => setMainSystemForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Opcional"
                className={`${fieldClassName} resize-none`}
              />
            </Field>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleSaveMainSystem}
              confirmLabel={isSubmitting ? "Salvando..." : "Salvar sistema"}
              disabled={isSubmitting}
            />
          </div>
        </>
      )
    }

    if (modal.type === "equipe") {
      return (
        <>
          <ModalHeader title="Equipe" onClose={resetAndClose} icon={Users} />
          <div className="space-y-4">
            <InfoCard text="Convites por e-mail serao ativados posteriormente. Se o usuario ja existir, ele podera ser vinculado ao workspace agora." />
            <Field label="E-mail">
              <input
                type="email"
                value={teamForm.email}
                onChange={(event) => setTeamForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="membro@empresa.com"
                className={fieldClassName}
              />
            </Field>
            <Field label="Papel">
              <select
                value={teamForm.role}
                onChange={(event) =>
                  setTeamForm((current) => ({
                    ...current,
                    role: event.target.value as TeamFormState["role"],
                  }))
                }
                className={fieldClassName}
              >
                <option value="owner">Proprietario</option>
                <option value="admin">Admin</option>
                <option value="member">Membro</option>
              </select>
            </Field>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleInviteMember}
              confirmLabel={isSubmitting ? "Enviando..." : "Adicionar membro"}
              disabled={isSubmitting}
            />
          </div>
        </>
      )
    }

    if (modal.type === "arquivo" || modal.type === "foto") {
      const Icon = modal.type === "arquivo" ? Paperclip : Camera
      return (
        <>
          <ModalHeader title={modal.type === "arquivo" ? "Arquivo" : "Foto"} onClose={resetAndClose} icon={Icon} />
          <div className="space-y-4">
            <InfoCard
              text={
                modal.type === "arquivo"
                  ? "O envio real de arquivos sera habilitado quando a integracao da fonte estiver ativa."
                  : "O envio real de fotos sera habilitado quando a integracao da fonte estiver ativa."
              }
            />
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
            >
              Entendi
            </button>
          </div>
        </>
      )
    }

    return null
  }

  return (
    <AnimatePresence>
      {modal?.type && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={resetAndClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-[90] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-md lg:rounded-3xl"
          >
            {renderBody()}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ModalHeader({
  title,
  onClose,
  icon: Icon,
}: {
  title: string
  onClose: () => void
  icon: typeof Database
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
      </div>
      <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-gray-100" aria-label="Fechar">
        <X className="h-5 w-5 text-gray-500" />
      </button>
    </div>
  )
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
}: {
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {confirmLabel}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
