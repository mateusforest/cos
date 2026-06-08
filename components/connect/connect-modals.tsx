"use client"

import { useState, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  X, Database, FileSpreadsheet, Mail, MessageCircle, Server,
  Upload, Camera, Users, Info, Check,
} from "lucide-react"
import { useConnect, type ConnectSource } from "./connect-store"

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

/** Container de modal reutilizavel (bottom-sheet no mobile, dialog no desktop). */
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl p-5 pb-8 max-h-[88vh] overflow-y-auto lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[85vh] lg:max-w-md lg:rounded-3xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-gray-500" />
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
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#0a0a0a]">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-[#0a0a0a] placeholder:text-gray-400 focus:outline-none focus:border-gray-300"

function PrepNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-500">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full py-3 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}

export function ConnectModals() {
  const { modal, closeModal, addSource, setMainSystem, toast } = useConnect()

  // estados de formulario (resetam a cada fechamento via key)
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

  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setSourceName(""); setSourceType(sourceTypes[0]); setSourceDesc("")
    setSheetName(""); setSheetType("")
    setEmailProvider(emailProviders[0]); setEmailAddress("")
    setWaNumber(""); setWaChannel("")
    setSysName(""); setSysType(sourceTypes[0]); setSysUrl(""); setSysNotes("")
    setSystemError("")
  }

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
          {/* Conectar Sistema */}
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
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Database className="w-6 h-6 text-gray-600" />
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

          {/* Importar Planilha */}
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
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <Field label="Nome da planilha">
                  <input className={inputClass} value={sheetName} onChange={(e) => setSheetName(e.target.value)} placeholder="Nome da planilha" required />
                </Field>
                <Field label="Tipo de dados">
                  <input className={inputClass} value={sheetType} onChange={(e) => setSheetType(e.target.value)} placeholder="Tipo de dados" />
                </Field>
                <button type="button" onClick={() => uploadRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-gray-300 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-500">Selecionar arquivo .xlsx / .csv</span>
                </button>
                <input ref={uploadRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" />
                <PrepNotice>A leitura real será conectada posteriormente.</PrepNotice>
                <SubmitButton label="Importar planilha" disabled={!sheetName} />
              </form>
            </ModalShell>
          )}

          {/* Conectar E-mail */}
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
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
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

          {/* Conectar WhatsApp */}
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
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-green-600" />
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

          {/* Configurar Sistema Principal */}
          {modal === "mainSystem" && (
            <ModalShell title="Configurar sistema principal" onClose={closeModal}>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setSystemError("")
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
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Server className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <Field label="Nome do sistema">
                  <input className={inputClass} value={sysName} onChange={(e) => setSysName(e.target.value)} placeholder="Nome do sistema" required />
                </Field>
                <Field label="Tipo">
                  <select className={inputClass} value={sysType} onChange={(e) => setSysType(e.target.value)}>
                    {sourceTypes.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="URL de acesso">
                  <input className={inputClass} value={sysUrl} onChange={(e) => setSysUrl(e.target.value)} placeholder="https://sistema.suaempresa.com" required />
                </Field>
                <Field label="Observações">
                  <textarea className={inputClass + " resize-none"} rows={2} value={sysNotes} onChange={(e) => setSysNotes(e.target.value)} placeholder="Opcional" />
                </Field>
                {systemError && <p className="text-sm text-red-600">{systemError}</p>}
                <SubmitButton label="Salvar sistema" disabled={!sysName || !sysUrl} />
              </form>
            </ModalShell>
          )}

          {/* Equipe */}
          {modal === "equipe" && (
            <ModalShell title="Equipe" onClose={closeModal}>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center leading-relaxed">
                  Gerencie quem pode usar o COS Connect neste workspace.
                </p>
                <div className="rounded-xl border border-gray-100 divide-y divide-gray-50">
                  {[
                    
                  ].map((m) => (
                    <div key={m.email} className="flex items-center gap-3 p-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-[#0a0a0a]">{m.name}</span>
                        <span className="block text-xs text-gray-500">{m.email}</span>
                      </div>
                      <span className="text-xs text-gray-400">{m.role}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { closeModal(); toast("Convites por e-mail em preparação.") }}
                  className="w-full py-3 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
                >
                  Convidar membro
                </button>
              </div>
            </ModalShell>
          )}

          {/* Arquivo */}
          {modal === "arquivo" && (
            <ModalShell title="Adicionar arquivo" onClose={closeModal}>
              <div className="space-y-4">
                <button type="button" onClick={() => uploadRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center gap-2 hover:border-gray-300 transition-colors">
                  <Upload className="w-7 h-7 text-gray-400" />
                  <span className="text-sm text-gray-500">Arraste ou selecione um arquivo</span>
                  <span className="text-xs text-gray-400">PDF, imagens, documentos</span>
                </button>
                <input ref={uploadRef} type="file" className="hidden" onChange={() => { closeModal(); toast("Arquivo adicionado.") }} />
              </div>
            </ModalShell>
          )}

          {/* Foto */}
          {modal === "foto" && (
            <ModalShell title="Adicionar foto" onClose={closeModal}>
              <div className="space-y-2">
                {[
                  { icon: Camera, label: "Tirar foto", desc: "Use a câmera do dispositivo", onClick: () => cameraRef.current?.click() },
                  { icon: Upload, label: "Upload de imagem", desc: "Selecione da galeria ou arquivos", onClick: () => uploadRef.current?.click() },
                ].map((opt) => (
                  <button key={opt.label} onClick={opt.onClick} className="flex items-center gap-3 p-3 w-full rounded-xl hover:bg-gray-50 transition-colors">
                    <span className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <opt.icon className="w-5 h-5 text-gray-600" />
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

