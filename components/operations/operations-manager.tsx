"use client"

import { useEffect, useMemo, useState } from "react"
import { Briefcase, CalendarDays, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
import {
  createOperationAction,
  deleteOperationAction,
  getOperationsAction,
  updateOperationAction,
  type OperationPriority,
  type OperationStatus,
} from "@/actions/operations"
import { useAuth } from "@/components/auth/auth-provider"

type OperationRecord = {
  id: string
  clientId: string | null
  title: string
  description: string
  status: OperationStatus
  priority: OperationPriority
  dueDate: string | null
  createdAt: string | null
}

type OperationFormState = {
  title: string
  description: string
  patient: string
  procedure: string
  professional: string
  property: string
  purpose: string
  value: string
  responsible: string
  status: OperationStatus
  priority: OperationPriority
  dueDate: string
}

const defaultForm: OperationFormState = {
  title: "",
  description: "",
  patient: "",
  procedure: "",
  professional: "",
  property: "",
  purpose: "",
  value: "",
  responsible: "",
  status: "open",
  priority: "medium",
  dueDate: "",
}

function formatDateLabel(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function statusLabel(status: OperationStatus) {
  if (status === "in_progress") return "Em andamento"
  if (status === "completed") return "Concluida"
  if (status === "archived") return "Arquivada"
  return "Aberta"
}

function priorityLabel(priority: OperationPriority) {
  if (priority === "low") return "Baixa"
  if (priority === "high") return "Alta"
  if (priority === "urgent") return "Urgente"
  return "Media"
}

function parseClinicDescription(value: string) {
  const lines = value.split("\n")
  let patient = ""
  let procedure = ""
  let professional = ""
  const notes: string[] = []

  for (const line of lines) {
    if (line.startsWith("Paciente: ")) {
      patient = line.replace("Paciente: ", "").trim()
      continue
    }

    if (line.startsWith("Procedimento: ")) {
      procedure = line.replace("Procedimento: ", "").trim()
      continue
    }

    if (line.startsWith("Profissional: ")) {
      professional = line.replace("Profissional: ", "").trim()
      continue
    }

    if (line.trim()) {
      notes.push(line.trim())
    }
  }

  return {
    patient,
    procedure,
    professional,
    description: notes.join("\n").trim(),
  }
}

function buildClinicDescription(form: OperationFormState) {
  return [
    form.patient ? `Paciente: ${form.patient.trim()}` : "",
    form.procedure ? `Procedimento: ${form.procedure.trim()}` : "",
    form.professional ? `Profissional: ${form.professional.trim()}` : "",
    form.description ? form.description.trim() : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function parseRealEstateDescription(value: string) {
  const lines = value.split("\n")
  let kind = ""
  let property = ""
  let purpose = ""
  let amount = ""
  let responsible = ""
  const notes: string[] = []

  for (const line of lines) {
    if (line.startsWith("Tipo: ")) {
      kind = line.replace("Tipo: ", "").trim()
      continue
    }

    if (line.startsWith("Imovel: ")) {
      property = line.replace("Imovel: ", "").trim()
      continue
    }

    if (line.startsWith("Finalidade: ")) {
      purpose = line.replace("Finalidade: ", "").trim()
      continue
    }

    if (line.startsWith("Valor: ")) {
      amount = line.replace("Valor: ", "").trim()
      continue
    }

    if (line.startsWith("Responsavel: ")) {
      responsible = line.replace("Responsavel: ", "").trim()
      continue
    }

    if (line.trim()) {
      notes.push(line.trim())
    }
  }

  return {
    kind,
    property,
    purpose,
    value: amount,
    responsible,
    description: notes.join("\n").trim(),
  }
}

function buildRealEstateDescription(form: OperationFormState, kind: string) {
  return [
    `Tipo: ${kind}`,
    form.property ? `Imovel: ${form.property.trim()}` : "",
    form.purpose ? `Finalidade: ${form.purpose.trim()}` : "",
    form.value ? `Valor: ${form.value.trim()}` : "",
    form.responsible ? `Responsavel: ${form.responsible.trim()}` : "",
    form.description ? form.description.trim() : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function parseServicesDescription(value: string) {
  const lines = value.split("\n")
  let kind = ""
  let service = ""
  let amount = ""
  let responsible = ""
  const notes: string[] = []

  for (const line of lines) {
    if (line.startsWith("Tipo: ")) {
      kind = line.replace("Tipo: ", "").trim()
      continue
    }

    if (line.startsWith("Servico: ")) {
      service = line.replace("Servico: ", "").trim()
      continue
    }

    if (line.startsWith("Valor: ")) {
      amount = line.replace("Valor: ", "").trim()
      continue
    }

    if (line.startsWith("Responsavel: ")) {
      responsible = line.replace("Responsavel: ", "").trim()
      continue
    }

    if (line.trim()) {
      notes.push(line.trim())
    }
  }

  return {
    kind,
    service,
    value: amount,
    responsible,
    description: notes.join("\n").trim(),
  }
}

function buildServicesDescription(form: OperationFormState, kind: string) {
  return [
    `Tipo: ${kind}`,
    form.property ? `Servico: ${form.property.trim()}` : "",
    form.value ? `Valor: ${form.value.trim()}` : "",
    form.responsible ? `Responsavel: ${form.responsible.trim()}` : "",
    form.description ? form.description.trim() : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export function OperationsManager({
  title,
  description,
  variant,
  mode = "default",
  realEstateKind = "deal",
  servicesKind = "order",
}: {
  title: string
  description: string
  variant: "app" | "portal"
  mode?: "default" | "clinic" | "real-estate" | "services"
  realEstateKind?: "all" | "property" | "visit" | "deal"
  servicesKind?: "all" | "order" | "attendance"
}) {
  const isClinicMode = mode === "clinic"
  const isRealEstateMode = mode === "real-estate"
  const isServicesMode = mode === "services"
  const realEstateCopy =
    realEstateKind === "property"
      ? { singular: "imovel", plural: "imoveis", capitalized: "Imovel", typeLabel: "Imovel" }
      : realEstateKind === "visit"
        ? { singular: "visita", plural: "visitas", capitalized: "Visita", typeLabel: "Visita" }
        : realEstateKind === "all"
          ? { singular: "negociacao", plural: "registros", capitalized: "Negociacao", typeLabel: "" }
          : { singular: "negociacao", plural: "negociacoes", capitalized: "Negociacao", typeLabel: "Negociacao" }
  const servicesCopy =
    servicesKind === "attendance"
      ? { singular: "atendimento", plural: "atendimentos", capitalized: "Atendimento", typeLabel: "Atendimento" }
      : servicesKind === "all"
        ? { singular: "ordem de servico", plural: "registros", capitalized: "Ordem de servico", typeLabel: "" }
        : { singular: "ordem de servico", plural: "ordens de servico", capitalized: "Ordem de servico", typeLabel: "Ordem de servico" }
  const { canManageWorkspace } = useAuth()
  const [operations, setOperations] = useState<OperationRecord[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | OperationStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOperationId, setEditingOperationId] = useState<string | null>(null)
  const [form, setForm] = useState<OperationFormState>(defaultForm)

  const loadOperations = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getOperationsAction()

    if (result.error) {
      setError(result.error)
      setOperations([])
      setIsLoading(false)
      return
    }

    setOperations((result.operations ?? []) as OperationRecord[])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadOperations()
  }, [])

  const filteredOperations = useMemo(() => {
    return operations.filter((operation) => {
      const matchesFilter = filter === "all" ? true : operation.status === filter
      const term = search.trim().toLowerCase()
      const clinicDescription = isClinicMode ? parseClinicDescription(operation.description) : null
      const realEstateDescription = isRealEstateMode ? parseRealEstateDescription(operation.description) : null
      const servicesDescription = isServicesMode ? parseServicesDescription(operation.description) : null
      const matchesKind =
        !isRealEstateMode || realEstateKind === "all"
          ? true
          : (realEstateDescription?.kind || "") === realEstateCopy.typeLabel
      const matchesServicesKind =
        !isServicesMode || servicesKind === "all"
          ? true
          : (servicesDescription?.kind || "") === servicesCopy.typeLabel
      const matchesSearch =
        !term ||
        [
          operation.title,
          operation.description,
          clinicDescription?.patient ?? "",
          clinicDescription?.procedure ?? "",
          clinicDescription?.professional ?? "",
          realEstateDescription?.property ?? "",
          realEstateDescription?.purpose ?? "",
          realEstateDescription?.value ?? "",
          realEstateDescription?.responsible ?? "",
          servicesDescription?.service ?? "",
          servicesDescription?.value ?? "",
          servicesDescription?.responsible ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(term)
      return matchesFilter && matchesKind && matchesServicesKind && matchesSearch
    })
  }, [filter, isClinicMode, isRealEstateMode, isServicesMode, operations, realEstateCopy.typeLabel, realEstateKind, search, servicesCopy.typeLabel, servicesKind])

  const startCreate = () => {
    setEditingOperationId(null)
    setForm(defaultForm)
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const startEdit = (operation: OperationRecord) => {
    const clinicDescription = parseClinicDescription(operation.description)
    const realEstateDescription = parseRealEstateDescription(operation.description)
    const servicesDescription = parseServicesDescription(operation.description)

    setEditingOperationId(operation.id)
    setForm({
      title: operation.title,
      description: isClinicMode ? clinicDescription.description : isRealEstateMode ? realEstateDescription.description : isServicesMode ? servicesDescription.description : operation.description,
      patient: isClinicMode ? clinicDescription.patient : "",
      procedure: isClinicMode ? clinicDescription.procedure : "",
      professional: isClinicMode ? clinicDescription.professional : "",
      property: isRealEstateMode ? realEstateDescription.property : isServicesMode ? servicesDescription.service : "",
      purpose: isRealEstateMode ? realEstateDescription.purpose : "",
      value: isRealEstateMode ? realEstateDescription.value : isServicesMode ? servicesDescription.value : "",
      responsible: isRealEstateMode ? realEstateDescription.responsible : isServicesMode ? servicesDescription.responsible : "",
      status: operation.status,
      priority: operation.priority,
      dueDate: operation.dueDate ? operation.dueDate.slice(0, 10) : "",
    })
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const submit = async () => {
    setIsSaving(true)
    setError(null)
    setFeedback(null)

    const payload = {
      title: form.title,
      description: isClinicMode
        ? buildClinicDescription(form)
        : isRealEstateMode
          ? buildRealEstateDescription(form, realEstateCopy.typeLabel || "Negociacao")
          : isServicesMode
            ? buildServicesDescription(form, servicesCopy.typeLabel || "Ordem de servico")
            : form.description,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate,
    }

    const result = editingOperationId
      ? await updateOperationAction({ operationId: editingOperationId, ...payload })
      : await createOperationAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(
      editingOperationId
        ? isClinicMode
          ? "Atendimento atualizado com sucesso."
          : isRealEstateMode
            ? `${realEstateCopy.capitalized} atualizado com sucesso.`
            : isServicesMode
              ? `${servicesCopy.capitalized} atualizada com sucesso.`
          : "Operacao atualizada com sucesso."
        : isClinicMode
          ? "Atendimento registrado com sucesso."
          : isRealEstateMode
            ? `${realEstateCopy.capitalized} registrado com sucesso.`
            : isServicesMode
              ? `${servicesCopy.capitalized} registrada com sucesso.`
          : "Operacao criada com sucesso.",
    )
    setModalOpen(false)
    await loadOperations()
  }

  const archiveOperation = async (operationId: string) => {
    setError(null)
    setFeedback(null)

    const result = await deleteOperationAction({ operationId })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(
      isClinicMode
        ? "Atendimento arquivado com sucesso."
        : isRealEstateMode
          ? `${realEstateCopy.capitalized} arquivado com sucesso.`
          : isServicesMode
            ? `${servicesCopy.capitalized} arquivada com sucesso.`
          : "Operacao arquivada com sucesso.",
    )
    await loadOperations()
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
            {isClinicMode ? "Novo atendimento" : isRealEstateMode ? `Novo ${realEstateCopy.singular}` : isServicesMode ? `Nova ${servicesCopy.singular}` : "Nova operacao"}
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
                placeholder={
                  isClinicMode
                    ? "Buscar por atendimento, paciente, procedimento ou profissional..."
                    : isRealEstateMode
                      ? `Buscar por ${realEstateCopy.singular}, imovel, finalidade ou responsavel...`
                      : isServicesMode
                        ? `Buscar por ${servicesCopy.singular}, servico, valor ou responsavel...`
                      : "Buscar por titulo ou descricao..."
                }
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todas", value: "all" as const },
                { label: "Abertas", value: "open" as const },
                { label: "Em andamento", value: "in_progress" as const },
                { label: "Concluidas", value: "completed" as const },
                { label: "Arquivadas", value: "archived" as const },
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
              {isClinicMode
                ? "Carregando atendimentos..."
                : isRealEstateMode
                  ? `Carregando ${realEstateCopy.plural}...`
                  : isServicesMode
                    ? `Carregando ${servicesCopy.plural}...`
                  : "Carregando operacoes..."}
            </div>
          ) : filteredOperations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">
                {isClinicMode
                  ? "Nenhum atendimento registrado ainda."
                  : isRealEstateMode
                    ? `Nenhum ${realEstateCopy.singular} registrado ainda.`
                    : isServicesMode
                      ? `Nenhuma ${servicesCopy.singular} registrada ainda.`
                    : "Nenhuma operacao cadastrada ainda."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">{isClinicMode ? "Atendimento" : isRealEstateMode ? realEstateCopy.capitalized : isServicesMode ? servicesCopy.capitalized : "Titulo"}</th>
                    <th className="px-4 py-3">{isClinicMode ? "Paciente" : isRealEstateMode ? "Imovel" : isServicesMode ? "Servico" : "Descricao"}</th>
                    <th className="px-4 py-3">{isClinicMode ? "Profissional" : isRealEstateMode ? "Responsavel" : isServicesMode ? "Responsavel" : "Status"}</th>
                    <th className="px-4 py-3">{isClinicMode ? "Procedimento" : isRealEstateMode ? "Valor" : isServicesMode ? "Valor" : "Prioridade"}</th>
                    <th className="px-4 py-3">{isClinicMode ? "Data" : isRealEstateMode ? "Status" : isServicesMode ? "Prazo / Status" : "Prazo"}</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.map((operation) => {
                    const clinicDescription = isClinicMode ? parseClinicDescription(operation.description) : null
                    const realEstateDescription = isRealEstateMode ? parseRealEstateDescription(operation.description) : null
                    const servicesDescription = isServicesMode ? parseServicesDescription(operation.description) : null

                    return (
                      <tr key={operation.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{operation.title}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">
                          {isClinicMode ? clinicDescription?.patient || "-" : isRealEstateMode ? realEstateDescription?.property || "-" : isServicesMode ? servicesDescription?.service || "-" : operation.description || "-"}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">
                          {isClinicMode ? clinicDescription?.professional || "-" : isRealEstateMode ? realEstateDescription?.responsible || "-" : isServicesMode ? servicesDescription?.responsible || "-" : statusLabel(operation.status)}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">
                          {isClinicMode ? clinicDescription?.procedure || "-" : isRealEstateMode ? realEstateDescription?.value || "-" : isServicesMode ? servicesDescription?.value || "-" : priorityLabel(operation.priority)}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">
                          {isRealEstateMode
                            ? statusLabel(operation.status)
                            : isServicesMode
                              ? `${formatDateLabel(operation.dueDate || operation.createdAt)} · ${statusLabel(operation.status)}`
                              : formatDateLabel(operation.dueDate || operation.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(operation)}
                              disabled={!canManageWorkspace}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              onClick={() => archiveOperation(operation.id)}
                              disabled={!canManageWorkspace || operation.status === "archived"}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Arquivar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50">
                <Briefcase className="h-5 w-5 text-violet-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">
                  {editingOperationId
                    ? isClinicMode
                      ? "Editar atendimento"
                      : isRealEstateMode
                        ? `Editar ${realEstateCopy.singular}`
                        : isServicesMode
                          ? `Editar ${servicesCopy.singular}`
                        : "Editar operacao"
                    : isClinicMode
                      ? "Novo atendimento"
                      : isRealEstateMode
                        ? `Novo ${realEstateCopy.singular}`
                        : isServicesMode
                          ? `Nova ${servicesCopy.singular}`
                        : "Nova operacao"}
                </h2>
                <p className="text-sm text-gray-500">
                  {isClinicMode
                    ? "Registre atendimentos usando a estrutura existente de operacoes."
                    : isRealEstateMode
                      ? `Registre ${realEstateCopy.plural} com imovel, finalidade, valor e responsavel usando a estrutura existente.`
                      : isServicesMode
                        ? `Registre ${servicesCopy.plural} com servico, valor, prazo e responsavel usando a estrutura existente.`
                      : "Estruture processos reais do seu workspace."}
                </p>
              </div>
            </div>

            {!canManageWorkspace && editingOperationId && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                {isClinicMode
                  ? "Apenas owner, admin ou master podem editar e arquivar atendimentos."
                  : isRealEstateMode
                    ? `Apenas owner, admin ou master podem editar e arquivar ${realEstateCopy.plural}.`
                    : isServicesMode
                      ? `Apenas owner, admin ou master podem editar e arquivar ${servicesCopy.plural}.`
                    : "Apenas owner, admin ou master podem editar e arquivar operacoes."}
              </div>
            )}

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <FormField label={isClinicMode ? "Atendimento" : isRealEstateMode ? realEstateCopy.capitalized : isServicesMode ? servicesCopy.capitalized : "Titulo"}>
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder={
                    isClinicMode
                      ? "Nome do atendimento"
                      : isRealEstateMode
                        ? `Nome do ${realEstateCopy.singular}`
                        : isServicesMode
                          ? `Nome da ${servicesCopy.singular}`
                          : "Titulo da operacao"
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>
              {isClinicMode && (
                <>
                  <FormField label="Paciente">
                    <input
                      value={form.patient}
                      onChange={(event) => setForm((prev) => ({ ...prev, patient: event.target.value }))}
                      placeholder="Nome do paciente"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </FormField>
                  <FormField label="Procedimento">
                    <input
                      value={form.procedure}
                      onChange={(event) => setForm((prev) => ({ ...prev, procedure: event.target.value }))}
                      placeholder="Procedimento realizado"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </FormField>
                  <FormField label="Profissional">
                    <input
                      value={form.professional}
                      onChange={(event) => setForm((prev) => ({ ...prev, professional: event.target.value }))}
                      placeholder="Profissional responsavel"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </FormField>
                </>
              )}
              {isRealEstateMode && (
                <>
                  <FormField label="Imovel">
                    <input
                      value={form.property}
                      onChange={(event) => setForm((prev) => ({ ...prev, property: event.target.value }))}
                      placeholder="Nome ou referencia do imovel"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </FormField>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FormField label="Finalidade">
                      <input
                        value={form.purpose}
                        onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))}
                        placeholder="Venda ou locacao"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                      />
                    </FormField>
                    <FormField label="Valor">
                      <input
                        value={form.value}
                        onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                        placeholder="R$ 0,00"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                      />
                    </FormField>
                  </div>
                  <FormField label="Responsavel">
                    <input
                      value={form.responsible}
                      onChange={(event) => setForm((prev) => ({ ...prev, responsible: event.target.value }))}
                      placeholder="Corretor responsavel"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </FormField>
                </>
              )}
              {isServicesMode && (
                <>
                  <FormField label="Servico">
                    <input
                      value={form.property}
                      onChange={(event) => setForm((prev) => ({ ...prev, property: event.target.value }))}
                      placeholder="Nome do servico"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </FormField>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FormField label="Valor">
                      <input
                        value={form.value}
                        onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                        placeholder="R$ 0,00"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                      />
                    </FormField>
                    <FormField label="Responsavel">
                      <input
                        value={form.responsible}
                        onChange={(event) => setForm((prev) => ({ ...prev, responsible: event.target.value }))}
                        placeholder="Responsavel principal"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                      />
                    </FormField>
                  </div>
                </>
              )}
              <FormField label={isClinicMode ? "Observacoes" : isRealEstateMode ? "Descricao" : isServicesMode ? "Descricao" : "Descricao"}>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder={
                    isClinicMode
                      ? "Observacoes do atendimento"
                      : isRealEstateMode
                        ? `Detalhes da ${realEstateCopy.singular}`
                        : isServicesMode
                          ? `Detalhes da ${servicesCopy.singular}`
                          : "Detalhes da operacao"
                  }
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Status">
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as OperationStatus }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  >
                    <option value="open">Aberta</option>
                    <option value="in_progress">Em andamento</option>
                    <option value="completed">Concluida</option>
                    <option value="archived">Arquivada</option>
                  </select>
                </FormField>
                <FormField label="Prioridade">
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as OperationPriority }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </FormField>
              </div>
              <FormField label={isClinicMode ? "Data do atendimento" : isRealEstateMode ? "Data" : isServicesMode ? "Prazo" : "Prazo"}>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>
              </FormField>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isSaving || (Boolean(editingOperationId) && !canManageWorkspace)}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Salvando..."
                  : editingOperationId
                    ? "Salvar alteracoes"
                    : isClinicMode
                      ? "Salvar atendimento"
                      : isRealEstateMode
                        ? `Salvar ${realEstateCopy.singular}`
                        : isServicesMode
                          ? `Salvar ${servicesCopy.singular}`
                        : "Salvar operacao"}
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
