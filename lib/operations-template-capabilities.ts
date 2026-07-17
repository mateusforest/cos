import { getOperationsAreaSources, operationsSectorTemplates, slug } from "@/lib/area-configs"

export type OperationsCapabilityStructure = "clients" | "operations" | "documents" | "financial_entries" | "meetings"

export type OperationsCapabilitySupport = "supported" | "future"

export type OperationsCapabilityReuseMode = "shared-generic" | "dedicated" | "future"

export type OperationsCapabilityPortalActionType =
  | "cliente"
  | "documento"
  | "financeiro"
  | "operacao"
  | "reuniao"
  | "relatorio"

export type OperationsSessionCapability = {
  areaKey: string
  areaLabel: string
  sessionKey: string
  sessionLabel: string
  entity: string
  reusedStructure: OperationsCapabilityStructure | null
  allowedActions: string[]
  mainFields: string[]
  possibleStatuses: string[]
  existingRoute: string | null
  support: OperationsCapabilitySupport
  reuseMode: OperationsCapabilityReuseMode
  notes?: string
}

export type OperationsAreaCapabilityMap = {
  areaKey: string
  areaLabel: string
  sessions: OperationsSessionCapability[]
}

export type OperationsTemplateCapabilityMap = {
  segment: string
  label: string
  areas: OperationsAreaCapabilityMap[]
}

export type OperationsPortalSessionAction =
  | {
      kind: "route"
      label: string
      href: string
    }
  | {
      kind: "modal"
      label: string
      actionType: OperationsCapabilityPortalActionType
    }
  | {
      kind: "future"
      label: string
      message: string
    }
  | {
      kind: "global"
      label: string
    }

type CapabilityDefinition = Omit<
  OperationsSessionCapability,
  "areaKey" | "areaLabel" | "sessionKey" | "sessionLabel"
>

const CLIENT_FIELDS = ["name", "email", "phone", "company", "notes", "status"]
const CLIENT_STATUSES = ["active", "archived"]
const CLIENT_ACTIONS = ["list", "create", "update", "archive", "delete"]

const OPERATION_FIELDS = ["title", "description", "client_id", "status", "priority", "due_date"]
const OPERATION_STATUSES = ["open", "in_progress", "completed", "archived"]
const OPERATION_ACTIONS = ["list", "create", "update", "change_status", "archive", "delete"]

const DOCUMENT_FIELDS = ["title", "type", "file_url", "content", "status"]
const DOCUMENT_STATUSES = ["draft", "sent", "signed", "archived"]
const DOCUMENT_ACTIONS = ["list", "create", "update", "change_status", "delete"]

const FINANCIAL_FIELDS = ["type", "title", "amount", "category", "due_date", "paid_at", "notes"]
const FINANCIAL_STATUSES = ["pending", "paid"]
const FINANCIAL_ACTIONS = ["list", "create", "update", "delete", "summarize"]

const MEETING_FIELDS = [
  "title",
  "scheduledAt",
  "participants",
  "meetingType",
  "meetingLink",
  "meetingLocation",
  "description",
  "status",
]
const MEETING_STATUSES = ["scheduled", "in_progress", "finished"]
const MEETING_ACTIONS = ["list", "create", "update", "start", "finish"]

function buildClientsCapability(entity: string, existingRoute: string, notes?: string): CapabilityDefinition {
  return {
    entity,
    reusedStructure: "clients",
    allowedActions: CLIENT_ACTIONS,
    mainFields: CLIENT_FIELDS,
    possibleStatuses: CLIENT_STATUSES,
    existingRoute,
    support: "supported",
    reuseMode: "shared-generic",
    notes: notes || "Usa a estrutura generica de clients sem subtipo dedicado por sessao.",
  }
}

function buildOperationsCapability(entity: string, existingRoute = "/portal/operacoes", notes?: string): CapabilityDefinition {
  return {
    entity,
    reusedStructure: "operations",
    allowedActions: OPERATION_ACTIONS,
    mainFields: OPERATION_FIELDS,
    possibleStatuses: OPERATION_STATUSES,
    existingRoute,
    support: "supported",
    reuseMode: "shared-generic",
    notes: notes || "Usa a estrutura generica de operations e depende do contexto da sessao para especializacao.",
  }
}

function buildDocumentsCapability(entity: string, existingRoute: string, notes?: string): CapabilityDefinition {
  return {
    entity,
    reusedStructure: "documents",
    allowedActions: DOCUMENT_ACTIONS,
    mainFields: DOCUMENT_FIELDS,
    possibleStatuses: DOCUMENT_STATUSES,
    existingRoute,
    support: "supported",
    reuseMode: "shared-generic",
    notes: notes || "Usa a estrutura generica de documents com tipo flexivel e sem modelo setorial dedicado.",
  }
}

function buildFinancialCapability(entity: string, existingRoute = "/portal/financeiro", notes?: string): CapabilityDefinition {
  return {
    entity,
    reusedStructure: "financial_entries",
    allowedActions: FINANCIAL_ACTIONS,
    mainFields: FINANCIAL_FIELDS,
    possibleStatuses: FINANCIAL_STATUSES,
    existingRoute,
    support: "supported",
    reuseMode: "shared-generic",
    notes:
      notes ||
      "Usa financial_entries; o tipo da entrada fica em type (income ou expense) e o estado pago/pendente e derivado de paid_at.",
  }
}

function buildMeetingsCapability(entity: string, existingRoute = "/portal/reunioes", notes?: string): CapabilityDefinition {
  return {
    entity,
    reusedStructure: "meetings",
    allowedActions: MEETING_ACTIONS,
    mainFields: MEETING_FIELDS,
    possibleStatuses: MEETING_STATUSES,
    existingRoute,
    support: "supported",
    reuseMode: "dedicated",
    notes: notes || "Usa a estrutura real de meetings com status, participantes e metadados do COS Meet.",
  }
}

function buildFutureCapability(entity: string, notes?: string): CapabilityDefinition {
  return {
    entity,
    reusedStructure: null,
    allowedActions: [],
    mainFields: [],
    possibleStatuses: [],
    existingRoute: null,
    support: "future",
    reuseMode: "future",
    notes: notes || "Sessao prevista no template, mas ainda sem estrutura reutilizavel dedicada e sem fluxo operacional conectado.",
  }
}

const COMMON_CAPABILITIES: Record<string, Record<string, CapabilityDefinition>> = {
  cadastros: {
    clientes: buildClientsCapability("client", "/portal/cadastros/clientes"),
    pacientes: buildClientsCapability("patient", "/portal/cadastros/clientes"),
    alunos: buildClientsCapability("student", "/portal/cadastros/clientes"),
    candidatos: buildClientsCapability("candidate", "/portal/cadastros/clientes"),
    leads: buildFutureCapability("lead"),
    produtos: buildFutureCapability("product"),
    fornecedores: buildFutureCapability("supplier"),
    categorias: buildFutureCapability("category"),
    insumos: buildFutureCapability("supply"),
    convenios: buildFutureCapability("insurance_plan"),
    procedimentos: buildFutureCapability("procedure"),
    profissionais: buildFutureCapability("professional"),
    turmas: buildFutureCapability("classroom"),
    cursos: buildFutureCapability("course"),
    motoristas: buildFutureCapability("driver"),
    veiculos: buildFutureCapability("vehicle"),
    rotas: buildFutureCapability("route"),
    casos: buildFutureCapability("case"),
    contrapartes: buildFutureCapability("counterparty"),
    prazos: buildFutureCapability("deadline"),
    empresas: buildFutureCapability("company"),
    obrigacoes: buildFutureCapability("obligation"),
    obras: buildFutureCapability("construction_project"),
    colaboradores: buildFutureCapability("employee"),
    vagas: buildFutureCapability("job_opening"),
    gestores: buildFutureCapability("manager"),
  },
  operacoes: {
    projetos: buildOperationsCapability("project"),
    ordens: buildOperationsCapability("order"),
    processos: buildOperationsCapability("process"),
    pedidos: buildOperationsCapability("order"),
    entregas: buildOperationsCapability("delivery"),
    trocas: buildOperationsCapability("exchange"),
    "ordens-de-servico": buildOperationsCapability("service_order"),
    atendimentos: buildOperationsCapability("service_case"),
    agenda: buildOperationsCapability("schedule_entry"),
    "ordens-de-producao": buildOperationsCapability("production_order"),
    lotes: buildOperationsCapability("batch"),
    qualidade: buildOperationsCapability("quality_control"),
    expedicao: buildOperationsCapability("shipment"),
    consultas: buildOperationsCapability("appointment"),
    exames: buildOperationsCapability("exam_request", "/portal/operacoes", "Usa operations para controle operacional; nao implementa prontuario nem laudo."),
    retornos: buildOperationsCapability("follow_up"),
    matriculas: buildOperationsCapability("enrollment"),
    aulas: buildOperationsCapability("class_session"),
    presencas: buildOperationsCapability("attendance"),
    captacoes: buildOperationsCapability("property_capture"),
    visitas: buildOperationsCapability("visit"),
    negociacoes: buildOperationsCapability("negotiation"),
    locacoes: buildOperationsCapability("lease"),
    coletas: buildOperationsCapability("pickup"),
    cargas: buildOperationsCapability("cargo"),
    viagens: buildOperationsCapability("trip"),
    ocorrencias: buildOperationsCapability("occurrence"),
    andamentos: buildOperationsCapability("case_update"),
    audiencias: buildOperationsCapability("hearing"),
    fechamentos: buildOperationsCapability("closing"),
    apuracoes: buildOperationsCapability("calculation_cycle"),
    cronogramas: buildOperationsCapability("schedule"),
    execucoes: buildOperationsCapability("execution"),
    medicoes: buildOperationsCapability("measurement"),
    vistorias: buildOperationsCapability("inspection"),
    recrutamentos: buildOperationsCapability("recruitment"),
    admissoes: buildOperationsCapability("hiring"),
    treinamentos: buildOperationsCapability("training"),
    ferias: buildOperationsCapability("vacation"),
  },
  vendas: {
    negociacoes: buildFutureCapability("negotiation"),
    propostas: buildDocumentsCapability("proposal", "/portal/vendas/propostas"),
    pedidos: buildFutureCapability("sales_order"),
    funil: buildFutureCapability("pipeline"),
    oportunidades: buildFutureCapability("opportunity"),
    contratos: buildDocumentsCapability("contract", "/portal/documentos/contratos"),
    cotacoes: buildFutureCapability("quotation"),
    vendas: buildFutureCapability("sale"),
    "pos-venda": buildFutureCapability("after_sales"),
  },
  documentos: {
    contratos: buildDocumentsCapability("contract", "/portal/documentos/contratos"),
    arquivos: buildDocumentsCapability("file", "/portal/documentos"),
    relatorios: buildDocumentsCapability("report", "/portal/documentos/relatorios"),
    guias: buildDocumentsCapability("guide", "/portal/documentos"),
    exames: buildDocumentsCapability("exam_document", "/portal/documentos"),
    boletins: buildDocumentsCapability("report_card", "/portal/documentos"),
    peticoes: buildDocumentsCapability("petition", "/portal/documentos"),
    procuracoes: buildDocumentsCapability("power_of_attorney", "/portal/documentos"),
    balancetes: buildDocumentsCapability("balance_sheet", "/portal/documentos"),
    "ct-e": buildDocumentsCapability("cte_document", "/portal/documentos"),
    "mdf-e": buildDocumentsCapability("mdfe_document", "/portal/documentos"),
    comprovantes: buildDocumentsCapability("receipt", "/portal/documentos"),
    curriculos: buildDocumentsCapability("resume", "/portal/documentos"),
    projetos: buildDocumentsCapability("project_document", "/portal/documentos"),
  },
  financeiro: {
    ganhos: buildFinancialCapability("income"),
    gastos: buildFinancialCapability("expense"),
    "fluxo-de-caixa": buildFinancialCapability("cash_flow"),
    recebimentos: buildFinancialCapability("receivable"),
    pagamentos: buildFinancialCapability("payable"),
    despesas: buildFinancialCapability("expense"),
    honorarios: buildFinancialCapability("fee"),
    mensalidades: buildFinancialCapability("recurring_charge"),
    comissoes: buildFinancialCapability("commission"),
    custos: buildFinancialCapability("cost"),
    fretes: buildFinancialCapability("freight"),
    medicoes: buildFinancialCapability("measurement_billing"),
  },
  reunioes: {
    reunioes: buildMeetingsCapability("meeting"),
  },
}

const SEGMENT_OVERRIDES: Record<string, Record<string, Record<string, CapabilityDefinition>>> = {
  imobiliarias: {
    cadastros: {
      proprietarios: buildClientsCapability("property_owner", "/portal/cadastros/leads"),
      interessados: buildClientsCapability("interested_party", "/portal/cadastros/produtos"),
      imoveis: buildOperationsCapability(
        "property",
        "/portal/cadastros/servicos",
        "Usa OperationsManager em modo imobiliario para registrar imoveis na estrutura generica de operations.",
      ),
    },
  },
  servicos: {
    cadastros: {
      servicos: buildClientsCapability(
        "service_catalog_item",
        "/portal/cadastros/leads",
        "Usa ClientsManager em modo services; ainda nao existe estrutura dedicada para catalogo de servicos.",
      ),
      responsaveis: buildClientsCapability(
        "responsible_person",
        "/portal/cadastros/produtos",
        "Usa ClientsManager em modo services para responsaveis sem tabela dedicada.",
      ),
    },
  },
}

function normalizeSegment(segment?: string | null) {
  const normalized = slug((segment || "").trim())
  return normalized || "default"
}

function resolveDefinition(segment: string, areaKey: string, sessionLabel: string): CapabilityDefinition {
  const sessionKey = slug(sessionLabel)
  const segmentOverride = SEGMENT_OVERRIDES[segment]?.[areaKey]?.[sessionKey]

  if (segmentOverride) {
    return segmentOverride
  }

  const commonDefinition = COMMON_CAPABILITIES[areaKey]?.[sessionKey]

  if (commonDefinition) {
    return commonDefinition
  }

  if (areaKey === "reunioes") {
    return COMMON_CAPABILITIES.reunioes.reunioes
  }

  return buildFutureCapability(sessionKey.replace(/-/g, "_"))
}

function buildAreaSessions(segment: string, areaKey: string, areaLabel: string, subsections: string[]) {
  const sessions = subsections.length ? subsections : [areaLabel]

  return sessions.map((sessionLabel) => {
    const definition = resolveDefinition(segment, areaKey, sessionLabel)

    return {
      areaKey,
      areaLabel,
      sessionKey: slug(sessionLabel),
      sessionLabel,
      ...definition,
    } satisfies OperationsSessionCapability
  })
}

export function getOperationsTemplateCapabilityMap(segment?: string | null): OperationsTemplateCapabilityMap {
  const normalizedSegment = normalizeSegment(segment)
  const template = operationsSectorTemplates[normalizedSegment] || operationsSectorTemplates.default
  const areas = getOperationsAreaSources(normalizedSegment)

  return {
    segment: normalizedSegment,
    label: template.label,
    areas: areas.map((area) => ({
      areaKey: area.key,
      areaLabel: area.label,
      sessions: buildAreaSessions(normalizedSegment, area.key, area.label, area.subsections),
    })),
  }
}

export function getAllOperationsTemplateCapabilityMaps() {
  return Object.keys(operationsSectorTemplates).map((segment) => getOperationsTemplateCapabilityMap(segment))
}

export function getOperationsSessionCapability(segment: string | null | undefined, areaKey: string, sessionLabel: string) {
  const normalizedSegment = normalizeSegment(segment)
  const area = getOperationsAreaSources(normalizedSegment).find((item) => item.key === areaKey)

  if (!area) {
    return null
  }

  return {
    areaKey,
    areaLabel: area.label,
    sessionKey: slug(sessionLabel),
    sessionLabel,
    ...resolveDefinition(normalizedSegment, areaKey, sessionLabel),
  } satisfies OperationsSessionCapability
}

function singularizeSessionLabel(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return "item"
  }

  const irregulars: Record<string, string> = {
    Clientes: "cliente",
    Pacientes: "paciente",
    Alunos: "aluno",
    Candidatos: "candidato",
    Imoveis: "imovel",
    Imóveis: "imovel",
    Motoristas: "motorista",
    Fornecedores: "fornecedor",
    Veículos: "veiculo",
    Rotas: "rota",
    Casos: "caso",
    Obrigacoes: "obrigacao",
    Obrigações: "obrigacao",
    Curriculos: "curriculo",
    Currículos: "curriculo",
    Cargas: "carga",
    Produtos: "produto",
    Leads: "lead",
    Honorarios: "honorario",
    Honorários: "honorario",
    Recebimentos: "recebimento",
    Pedidos: "pedido",
    Cotacoes: "cotacao",
    Cotações: "cotacao",
    Propostas: "proposta",
    Contratos: "contrato",
    Relatorios: "relatorio",
    Relatórios: "relatorio",
    Exames: "exame",
    Consultas: "consulta",
    Processos: "processo",
    Entregas: "entrega",
    Viagens: "viagem",
    Audiencias: "audiencia",
    Audiências: "audiencia",
    Veiculos: "veiculo",
    Obras: "obra",
  }

  if (irregulars[trimmed]) {
    return irregulars[trimmed]
  }

  const normalized = trimmed.toLowerCase()

  if (normalized.endsWith("oes")) return `${normalized.slice(0, -3)}ao`
  if (normalized.endsWith("ães")) return `${normalized.slice(0, -3)}ao`
  if (normalized.endsWith("s")) return normalized.slice(0, -1)
  return normalized
}

function buildPortalActionLabel(sessionLabel: string) {
  const singular = singularizeSessionLabel(sessionLabel)

  if (
    singular.startsWith("ordem") ||
    singular.startsWith("rota") ||
    singular.startsWith("audiencia") ||
    singular.startsWith("audiencia") ||
    singular.startsWith("obrigacao") ||
    singular.startsWith("obrigação") ||
    singular.startsWith("carga") ||
    singular.startsWith("cotacao") ||
    singular.startsWith("cotação") ||
    singular.startsWith("proposta") ||
    singular.startsWith("consulta") ||
    singular.startsWith("viagem") ||
    singular.startsWith("despesa") ||
    singular.startsWith("peticao") ||
    singular.startsWith("petição") ||
    singular.startsWith("reuniao") ||
    singular.startsWith("reunião")
  ) {
    return `Nova ${singular}`
  }

  return `Novo ${singular}`
}

function resolvePortalActionType(capability: OperationsSessionCapability): OperationsCapabilityPortalActionType | null {
  if (capability.reusedStructure === "clients") return "cliente"
  if (capability.reusedStructure === "operations") return "operacao"
  if (capability.reusedStructure === "financial_entries") return "financeiro"
  if (capability.reusedStructure === "meetings") return "reuniao"

  if (capability.reusedStructure === "documents") {
    return capability.sessionKey === "relatorios" ? "relatorio" : "documento"
  }

  return null
}

export function getOperationsPortalSessionAction(segment: string | null | undefined, areaKey: string, sessionLabel: string): OperationsPortalSessionAction {
  const capability = getOperationsSessionCapability(segment, areaKey, sessionLabel)
  const label = buildPortalActionLabel(sessionLabel)

  if (!capability) {
    return {
      kind: "global",
      label,
    }
  }

  if (capability.support === "future" || !capability.allowedActions.includes("create")) {
    return {
      kind: "future",
      label,
      message: `${sessionLabel} ainda nao possui fluxo real de criacao nesta sessao do Portal.`,
    }
  }

  if (capability.existingRoute) {
    return {
      kind: "route",
      label,
      href: capability.existingRoute,
    }
  }

  const actionType = resolvePortalActionType(capability)

  if (actionType) {
    return {
      kind: "modal",
      label,
      actionType,
    }
  }

  return {
    kind: "global",
    label,
  }
}

export const operationsTemplateCapabilityMaps = getAllOperationsTemplateCapabilityMaps()
