"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, FileText, Loader2, Paperclip, Pencil, Plus, Search, Trash2, TrendingUp, Upload } from "lucide-react"
import {
  createDocumentAction,
  deleteDocumentAction,
  getDocumentsAction,
  updateDocumentAction,
  type DocumentStatus,
  type DocumentType,
} from "@/actions/documents"
import { uploadDocumentFile } from "@/lib/document-upload"
import { useAuth } from "@/components/auth/auth-provider"

type DocumentRecord = {
  id: string
  title: string
  type: DocumentType
  fileUrl: string
  content: string
  status: DocumentStatus
  createdAt: string | null
}

type DocumentFormState = {
  title: string
  type: DocumentType
  fileUrl: string
  content: string
  status: DocumentStatus
}

const defaultForm: DocumentFormState = {
  title: "",
  type: "outro",
  fileUrl: "",
  content: "",
  status: "draft",
}

function formatDateLabel(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function statusLabel(status: DocumentStatus) {
  if (status === "sent") return "Enviado"
  if (status === "signed") return "Assinado"
  if (status === "archived") return "Arquivado"
  return "Rascunho"
}

function typeLabel(type: DocumentType) {
  if (type === "relatório") return "Relatório"
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function normalizeFilterType(filterType?: string | null): DocumentType | null {
  if (!filterType) return null
  const normalized = filterType.trim().toLowerCase()
  if (normalized === "contrato" || normalized === "contratos") return "contrato"
  if (normalized === "arquivo" || normalized === "arquivos") return "arquivo"
  if (normalized === "relatório" || normalized === "relatorios" || normalized === "relatórios" || normalized === "relatorio" || normalized === "relatórios") return "relatório"
  if (normalized === "proposta" || normalized === "propostas") return "proposta"
  return null
}

function buildDocumentUiCopy(filterType?: string | null) {
  const normalized = normalizeFilterType(filterType)

  if (normalized === "proposta") {
    return {
      createLabel: "Nova proposta",
      editLabel: "Editar proposta",
      searchPlaceholder: "Buscar por titulo ou conteudo da proposta...",
      emptyLabel: "Nenhuma proposta criada ainda.",
      loadingLabel: "Carregando propostas...",
      createSuccess: "Proposta criada com sucesso.",
      updateSuccess: "Proposta atualizada com sucesso.",
      titlePlaceholder: "Titulo da proposta",
      fileLabel: "Referencia comercial",
      filePlaceholder: "Link ou referencia opcional",
      contentLabel: "Detalhes",
      contentPlaceholder: "Escreva o resumo ou escopo da proposta",
      helperText: "Os dados reais da proposta ficam salvos no workspace sem depender de um modal generico de documento.",
      fixedType: true,
      icon: TrendingUp,
      iconClassName: "text-blue-500",
      iconBackgroundClassName: "bg-blue-50",
    }
  }

  if (normalized === "relatório") {
    return {
      createLabel: "Novo relatorio",
      editLabel: "Editar relatorio",
      searchPlaceholder: "Buscar por titulo ou conteudo do relatorio...",
      emptyLabel: "Nenhum relatorio criado ainda.",
      loadingLabel: "Carregando relatorios...",
      createSuccess: "Relatorio criado com sucesso.",
      updateSuccess: "Relatorio atualizado com sucesso.",
      titlePlaceholder: "Titulo do relatorio",
      fileLabel: "Referencia",
      filePlaceholder: "Link ou referencia opcional",
      contentLabel: "Analise",
      contentPlaceholder: "Escreva o conteudo ou a analise do relatorio",
      helperText: "O relatorio fica salvo com seus dados reais do workspace nesta sessao dedicada.",
      fixedType: true,
      icon: BarChart3,
      iconClassName: "text-amber-500",
      iconBackgroundClassName: "bg-amber-50",
    }
  }

  return {
    createLabel: "Novo documento",
    editLabel: "Editar documento",
    searchPlaceholder: "Buscar por titulo, tipo ou conteudo...",
    emptyLabel: "Nenhum documento criado ainda.",
    loadingLabel: "Carregando documentos...",
    createSuccess: "Documento criado com sucesso.",
    updateSuccess: "Documento atualizado com sucesso.",
    titlePlaceholder: "Titulo do documento",
    fileLabel: "Referencia do arquivo",
    filePlaceholder: "URL ou referencia do arquivo",
    contentLabel: "Conteudo",
    contentPlaceholder: "Escreva o conteudo ou resumo do documento",
    helperText: "O upload real pode continuar visivel na interface, mas nesta etapa apenas metadados e conteudo sao salvos.",
    fixedType: false,
    icon: FileText,
    iconClassName: "text-blue-500",
    iconBackgroundClassName: "bg-blue-50",
  }
}

export function DocumentsManager({
  title,
  description,
  variant,
  filterType,
}: {
  title: string
  description: string
  variant: "app" | "portal"
  filterType?: string
}) {
  const { canManageWorkspace, user, workspace } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | DocumentStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [form, setForm] = useState<DocumentFormState>({
    ...defaultForm,
    type: normalizeFilterType(filterType) ?? "outro",
  })

  const currentTypeFilter = normalizeFilterType(filterType)
  const uiCopy = useMemo(() => buildDocumentUiCopy(filterType), [filterType])

  const loadDocuments = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getDocumentsAction()

    if (result.error) {
      setError(result.error)
      setDocuments([])
      setIsLoading(false)
      return
    }

    setDocuments((result.documents ?? []) as DocumentRecord[])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadDocuments()
  }, [])

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const matchesStatus = filter === "all" ? true : document.status === filter
      const matchesType = currentTypeFilter ? document.type === currentTypeFilter : true
      const term = search.trim().toLowerCase()
      const matchesSearch = !term || [document.title, document.type, document.content].join(" ").toLowerCase().includes(term)
      return matchesStatus && matchesType && matchesSearch
    })
  }, [currentTypeFilter, documents, filter, search])

  const startCreate = () => {
    setEditingDocumentId(null)
    setForm({
      ...defaultForm,
      type: currentTypeFilter ?? "outro",
    })
    setError(null)
    setFeedback(null)
    setSelectedFile(null)
    setModalOpen(true)
  }

  const startEdit = (document: DocumentRecord) => {
    setEditingDocumentId(document.id)
    setForm({
      title: document.title,
      type: document.type,
      fileUrl: document.fileUrl,
      content: document.content,
      status: document.status,
    })
    setError(null)
    setFeedback(null)
    setSelectedFile(null)
    setModalOpen(true)
  }

  const submit = async () => {
    setIsSaving(true)
    setError(null)
    setFeedback(null)

    let resolvedFileUrl = form.fileUrl

    if (selectedFile) {
      if (!user?.id || !workspace?.id) {
        setIsSaving(false)
        setError("Nao foi possivel identificar a sessao atual para enviar o arquivo.")
        return
      }

      const uploadResult = await uploadDocumentFile({
        file: selectedFile,
        userId: user.id,
        workspaceId: workspace.id,
      })

      if (uploadResult.error || !uploadResult.publicUrl) {
        setIsSaving(false)
        setError(uploadResult.error || "Nao foi possivel enviar o anexo.")
        return
      }

      resolvedFileUrl = uploadResult.publicUrl
    }

    const payload = {
      title: form.title,
      type: form.type,
      fileUrl: resolvedFileUrl,
      content: form.content,
      status: form.status,
    }

    const result = editingDocumentId
      ? await updateDocumentAction({ documentId: editingDocumentId, ...payload })
      : await createDocumentAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingDocumentId ? uiCopy.updateSuccess : uiCopy.createSuccess)
    setSelectedFile(null)
    setModalOpen(false)
    await loadDocuments()
  }

  const archiveDocument = async (documentId: string) => {
    setError(null)
    setFeedback(null)

    const result = await deleteDocumentAction({ documentId })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback("Documento arquivado com sucesso.")
    await loadDocuments()
  }

  return (
    <div className={variant === "portal" ? "flex-1 flex flex-col h-full" : ""}>
      <div className={variant === "portal" ? "max-w-7xl mx-auto w-full px-6 py-8" : "px-4 py-4 max-w-6xl mx-auto"}>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0a0a0a]">{title}</h1>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
          >
            <Plus className="h-4 w-4" />
            {uiCopy.createLabel}
          </button>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {feedback && <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={uiCopy.searchPlaceholder}
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todos", value: "all" as const },
                { label: "Rascunhos", value: "draft" as const },
                { label: "Enviados", value: "sent" as const },
                { label: "Assinados", value: "signed" as const },
                { label: "Arquivados", value: "archived" as const },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    filter === option.value ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uiCopy.loadingLabel}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">{uiCopy.emptyLabel}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Conteúdo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{document.title}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{typeLabel(document.type)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{document.content || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          document.status === "signed"
                            ? "bg-emerald-50 text-emerald-600"
                            : document.status === "sent"
                              ? "bg-blue-50 text-blue-600"
                              : document.status === "archived"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-amber-50 text-amber-700"
                        }`}>
                          {statusLabel(document.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateLabel(document.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(document)}
                            disabled={!canManageWorkspace}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            onClick={() => archiveDocument(document.id)}
                            disabled={!canManageWorkspace || document.status === "archived"}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Arquivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[80] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-lg lg:rounded-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${uiCopy.iconBackgroundClassName}`}>
                <uiCopy.icon className={`h-5 w-5 ${uiCopy.iconClassName}`} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingDocumentId ? uiCopy.editLabel : uiCopy.createLabel}</h2>
                <p className="text-sm text-gray-500">Salve conteúdo real e mantenha o upload apenas como metadado enquanto o storage não estiver conectado.</p>
              </div>
            </div>

            {!canManageWorkspace && editingDocumentId && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                Apenas owner, admin ou master podem editar e arquivar documentos.
              </div>
            )}

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <FormField label="Título">
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder={uiCopy.titlePlaceholder} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {uiCopy.fixedType ? (
                  <FormField label="Tipo">
                    <input value={typeLabel(form.type)} readOnly className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none" />
                  </FormField>
                ) : (
                  <FormField label="Tipo">
                    <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as DocumentType }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                      <option value="contrato">Contrato</option>
                      <option value="arquivo">Arquivo</option>
                      <option value="relatório">Relatório</option>
                      <option value="proposta">Proposta</option>
                      <option value="outro">Outro</option>
                    </select>
                  </FormField>
                )}
                <FormField label="Status">
                  <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as DocumentStatus }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="draft">Rascunho</option>
                    <option value="sent">Enviado</option>
                    <option value="signed">Assinado</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </FormField>
              </div>
              <FormField label={uiCopy.fileLabel}>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition-colors hover:border-gray-400">
                    <Upload className="h-4 w-4 text-gray-500" />
                    <span>{selectedFile ? selectedFile.name : "Anexar arquivo ou imagem"}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.txt,.rtf,.xlsx,.xls,.csv,.ppt,.pptx"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </label>
                  <div className="relative">
                    <Paperclip className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input value={form.fileUrl} onChange={(event) => setForm((prev) => ({ ...prev, fileUrl: event.target.value }))} placeholder={uiCopy.filePlaceholder} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                  </div>
                </div>
              </FormField>
              <FormField label={uiCopy.contentLabel}>
                <textarea value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} placeholder={uiCopy.contentPlaceholder} rows={5} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
            </div>

            <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
              {selectedFile ? "O anexo selecionado sera enviado e salvo como referencia real do documento." : uiCopy.helperText}
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isSaving || (Boolean(editingDocumentId) && !canManageWorkspace)}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : editingDocumentId ? "Salvar alterações" : uiCopy.createLabel}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      {children}
    </label>
  )
}
