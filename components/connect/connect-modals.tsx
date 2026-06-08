"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  X,
  Database,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Server,
  Upload,
  Camera,
  Users,
  Info,
  Check,
} from "lucide-react"
import { useConnect, type ConnectSource } from "./connect-store"
import { useAuth } from "@/components/auth/auth-provider"
import { addWorkspaceMemberAction, getWorkspaceMembersAction } from "@/actions/workspace"

const sourceTypes = ["ERP", "CRM", "Planilha", "Portal interno", "Banco de dados", "Outro"]
const emailProviders = ["Gmail", "Outlook", "Zoho", "Outro"]

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className="fixed bottom-0 left-0 right-0 z-[70] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[85vh] lg:max-w-md lg:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 transition-colors hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {children}
      </motion.div>
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#0a0a0a]">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-gray-400 focus:border-gray-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"

function PrepNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-500">
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-xl bg-[#0a0a0a] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  )
}

export function ConnectModals() {
  const { modal, closeModal, addSource, setMainSystem, toast, mainSystem } = useConnect()
  const { canManageWorkspace } = useAuth()

  const [sourceName, setSourceName] = useState("")
  const [sourceType, setSourceType] = useState(sourceTypes[0])
  const [sourceDesc, setSourceDesc] = useState("")

  const [sheetName, setSheetName] = useState("")
  const [sheetType, setSheetType] = useState("")

  const [emailProvider, setEmailProvider] = useState(emailProviders[0])
  const [emailAddress, setEmailAddress] = useState("")

  const [waNumber, setWaNumber] = useState("")
  const [waChannel, setWaChannel] = useState("")

  const [sysName, setSysName] = useState("")
  const [sysType, setSysType] = useState(sourceTypes[0])
  const [sysUrl, setSysUrl] = useState("")
  const [sysNotes, setSysNotes] = useState("")
  const [systemError, setSystemError] = useState("")

  const [teamMembers, setTeamMembers] = useState<Array<{ userId: string; role: string; fullName: string; email: string }>>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviteError, setInviteError] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setSourceName("")
    setSourceType(sourceTypes[0])
    setSourceDesc("")
    setSheetName("")
    setSheetType("")
    setEmailProvider(emailProviders[0])
    setEmailAddress("")
    setWaNumber("")
    setWaChannel("")
    setSysName("")
    setSysType(sourceTypes[0])
    setSysUrl("")
    setSysNotes("")
    setSystemError("")
    setInviteName("")
    setInviteEmail("")
    setInviteRole("member")
    setInviteError("")
  }

  useEffect(() => {
    if (modal !== "mainSystem") return

    setSysName(mainSystem?.name || "")
    setSysType(mainSystem?.type || sourceTypes[0])
    setSysUrl(mainSystem?.url || "")
    setSysNotes(mainSystem?.notes || "")
    setSystemError("")
  }, [modal, mainSystem])

  useEffect(() => {
    if (modal !== "equipe") return

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
  }, [modal])

  const finish = (source: Omit<ConnectSource, "status">, message: string) => {
    addSource({ ...source, status: "preparing" })
    reset()
    closeModal()
    toast(message)
  }

  return (
    <AnimatePresence>
      {modal && (
        <>
          {modal === "system" && (
            <ModalShell title="Conectar sistema" onClose={closeModal}>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  finish(
                    { id: slugify(sourceName) || "fonte", name: sourceName, type: sourceType, sections: [] },
                    "Sistema adicionado. Conexão em preparação.",
                  )
                }}
              >
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                    <Database className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <Field label="Nome da fonte">
                  <input className={inputClass} value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Nome da fonte" required />
                </Field>
                <Field label="Tipo da fonte">
                  <select className={inputClass} value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                    {sourceTypes.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="URL ou descrição">
                  <input className={inputClass} value={sourceDesc} onChange={(e) => setSourceDesc(e.target.value)} placeholder="https:// ou breve descrição" />
                </Field>
                <PrepNotice>
                  A conexão real será habilitada na integração backend. Esta estrutura já está preparada para receber seus sistemas.
                </PrepNotice>
                <SubmitButton label="Adicionar fonte" disabled={!sourceName} />
              </form>
            </ModalShell>
          )}

          {modal === "spreadsheet" && (
            <ModalShell title="Importar planilha" onClose={closeModal}>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  finish(
                    { id: slugify(sheetName) || "planilha", name: sheetName, type: "Planilha", sections: [] },
                    "Planilha registrada. Leitura em preparação.",
                  )
                }}
              >
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
                    <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <Field label="Nome da planilha">
                  <input className={inputClass} value={sheetName} onChange={(e) => setSheetName(e.target.value)} placeholder="Nome da planilha" required />
                </Field>
                <Field label="Tipo de dados">
                  <input className={inputClass} value={sheetType} onChange={(e) => setSheetType(e.target.value)} placeholder="Tipo de dados" />
                </Field>
                <button type="button" onClick={() => uploadRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 transition-colors hover:border-gray-300">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <span className="text-sm text-gray-500">Selecionar arquivo .xlsx / .csv</span>
                </button>
                <input ref={uploadRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" />
                <PrepNotice>A leitura real será conectada posteriormente.</PrepNotice>
                <SubmitButton label="Importar planilha" disabled={!sheetName} />
              </form>
            </ModalShell>
          )}

          {modal === "email" && (
            <ModalShell title="Conectar e-mail" onClose={closeModal}>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  finish(
                    { id: "email-" + slugify(emailAddress), name: emailAddress, type: "E-mail", sections: [] },
                    "E-mail registrado. Integração em preparação.",
                  )
                }}
              >
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <Field label="Provedor">
                  <select className={inputClass} value={emailProvider} onChange={(e) => setEmailProvider(e.target.value)}>
                    {emailProviders.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="E-mail">
                  <input type="email" className={inputClass} value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="contato@empresa.com" required />
                </Field>
                <PrepNotice>Integração em preparação.</PrepNotice>
                <SubmitButton label="Conectar e-mail" disabled={!emailAddress} />
              </form>
            </ModalShell>
          )}

          {modal === "whatsapp" && (
            <ModalShell title="Conectar WhatsApp" onClose={closeModal}>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  finish(
                    { id: "whatsapp-" + slugify(waChannel || waNumber), name: waChannel || waNumber, type: "WhatsApp", sections: [] },
                    "WhatsApp registrado. Integração em preparação.",
                  )
                }}
              >
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <Field label="Número">
                  <input className={inputClass} value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="+55 (00) 00000-0000" required />
                </Field>
                <Field label="Nome do canal">
                  <input className={inputClass} value={waChannel} onChange={(e) => setWaChannel(e.target.value)} placeholder="Nome do canal" />
                </Field>
                <PrepNotice>Integração em preparação.</PrepNotice>
                <SubmitButton label="Conectar WhatsApp" disabled={!waNumber} />
              </form>
            </ModalShell>
          )}

          {modal === "mainSystem" && (
            <ModalShell title="Configurar sistema principal" onClose={closeModal}>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setSystemError("")

                  if (!canManageWorkspace) {
                    setSystemError("Você não tem permissão para editar o sistema principal.")
                    return
                  }

                  let url = sysUrl.trim()
                  if (url && !/^https?:\/\//i.test(url)) url = "https://" + url
                  const result = await setMainSystem({ name: sysName, type: sysType, url, notes: sysNotes })

                  if (result.error) {
                    setSystemError(result.error)
                    return
                  }

                  reset()
                  closeModal()
                  toast("Sistema principal configurado.")
                }}
              >
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                    <Server className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <Field label="Nome do sistema">
                  <input className={inputClass} value={sysName} onChange={(e) => setSysName(e.target.value)} placeholder="Nome do sistema" required disabled={!canManageWorkspace} />
                </Field>
                <Field label="Tipo">
                  <select className={inputClass} value={sysType} onChange={(e) => setSysType(e.target.value)} disabled={!canManageWorkspace}>
                    {sourceTypes.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="URL de acesso">
                  <input className={inputClass} value={sysUrl} onChange={(e) => setSysUrl(e.target.value)} placeholder="https://sistema.suaempresa.com" required disabled={!canManageWorkspace} />
                </Field>
                <Field label="Observações">
                  <textarea className={inputClass + " resize-none"} rows={2} value={sysNotes} onChange={(e) => setSysNotes(e.target.value)} placeholder="Opcional" disabled={!canManageWorkspace} />
                </Field>
                {!canManageWorkspace && (
                  <PrepNotice>
                    Você pode visualizar o sistema principal, mas apenas owner, admin ou master podem editar.
                  </PrepNotice>
                )}
                {systemError && <p className="text-sm text-red-600">{systemError}</p>}
                <SubmitButton label="Salvar sistema" disabled={!canManageWorkspace || !sysName || !sysUrl} />
              </form>
            </ModalShell>
          )}

          {modal === "equipe" && (
            <ModalShell title="Equipe" onClose={closeModal}>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
                    <Users className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
                <p className="text-center text-sm leading-relaxed text-gray-500">
                  Gerencie quem pode usar o COS Connect neste workspace.
                </p>

                {teamLoading ? (
                  <PrepNotice>Carregando equipe...</PrepNotice>
                ) : teamMembers.length > 0 ? (
                  <div className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100">
                    {teamMembers.map((member) => (
                      <div key={member.userId} className="flex items-center gap-3 p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-[#0a0a0a]">{member.fullName}</span>
                          <span className="block text-xs text-gray-500">{member.email}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {member.role === "owner" ? "Proprietário" : member.role === "admin" ? "Admin" : "Membro"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <PrepNotice>Nenhum usuário cadastrado ainda.</PrepNotice>
                )}

                {teamMembers.length === 1 && <PrepNotice>Nenhum outro membro convidado ainda.</PrepNotice>}
                {teamError && <p className="text-sm text-red-600">{teamError}</p>}
                {!canManageWorkspace && (
                  <PrepNotice>
                    Você pode visualizar a equipe, mas apenas owner, admin ou master podem editar membros.
                  </PrepNotice>
                )}

                {canManageWorkspace ? (
                  <form
                    className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      setInviteLoading(true)
                      setInviteError("")

                      const result = await addWorkspaceMemberAction({
                        email: inviteEmail,
                        role: inviteRole,
                      })

                      setInviteLoading(false)

                      if (result.error) {
                        setInviteError(result.error)
                        return
                      }

                      const membersResult = await getWorkspaceMembersAction()
                      if (!membersResult.error) {
                        setTeamMembers(membersResult.members ?? [])
                      }

                      setInviteName("")
                      setInviteEmail("")
                      setInviteRole("member")
                      toast("Membro adicionado ao workspace.")
                    }}
                  >
                    <Field label="Nome">
                      <input className={inputClass} value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Nome" />
                    </Field>
                    <Field label="E-mail">
                      <input type="email" className={inputClass} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="E-mail" required />
                    </Field>
                    <Field label="Papel">
                      <select className={inputClass} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                        <option value="owner">Proprietário</option>
                        <option value="admin">Admin</option>
                        <option value="member">Membro</option>
                      </select>
                    </Field>
                    <PrepNotice>
                      Se o e-mail já existir em profiles, o membro será adicionado ao workspace. Caso contrário, o convite por e-mail será ativado posteriormente.
                    </PrepNotice>
                    {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
                    <button
                      type="submit"
                      disabled={inviteLoading || !inviteEmail.trim()}
                      className="w-full rounded-xl bg-[#0a0a0a] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {inviteLoading ? "Enviando..." : "Convidar membro"}
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => toast("Apenas owner, admin ou master podem convidar membros.")}
                    className="w-full rounded-xl bg-[#0a0a0a] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
                  >
                    Convidar membro
                  </button>
                )}
              </div>
            </ModalShell>
          )}

          {modal === "arquivo" && (
            <ModalShell title="Adicionar arquivo" onClose={closeModal}>
              <div className="space-y-4">
                <button type="button" onClick={() => uploadRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-10 transition-colors hover:border-gray-300">
                  <Upload className="h-7 w-7 text-gray-400" />
                  <span className="text-sm text-gray-500">Arraste ou selecione um arquivo</span>
                  <span className="text-xs text-gray-400">PDF, imagens, documentos</span>
                </button>
                <input ref={uploadRef} type="file" className="hidden" onChange={() => { closeModal(); toast("Arquivo adicionado.") }} />
              </div>
            </ModalShell>
          )}

          {modal === "foto" && (
            <ModalShell title="Adicionar foto" onClose={closeModal}>
              <div className="space-y-2">
                {[
                  { icon: Camera, label: "Tirar foto", desc: "Use a câmera do dispositivo", onClick: () => cameraRef.current?.click() },
                  { icon: Upload, label: "Upload de imagem", desc: "Selecione da galeria ou arquivos", onClick: () => uploadRef.current?.click() },
                ].map((opt) => (
                  <button key={opt.label} onClick={opt.onClick} className="flex w-full items-center gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <opt.icon className="h-5 w-5 text-gray-600" />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-sm font-medium text-[#0a0a0a]">{opt.label}</span>
                      <span className="block text-xs text-gray-500">{opt.desc}</span>
                    </span>
                  </button>
                ))}
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => { closeModal(); toast("Foto adicionada.") }} />
                <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={() => { closeModal(); toast("Imagem adicionada.") }} />
              </div>
            </ModalShell>
          )}
        </>
      )}
    </AnimatePresence>
  )
}
