"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Camera, Check, ChevronLeft, FileQuestion, Upload } from "lucide-react"
import { createClientAction } from "@/actions/clients"
import { createDocumentAction } from "@/actions/documents"
import { createFinancialEntryAction } from "@/actions/financial"
import { createMeetingAction } from "@/actions/meetings"
import { createOperationAction } from "@/actions/operations"
import { useAuth } from "@/components/auth/auth-provider"
import { fotoConfig, novoConfigs, type NovoConfig } from "@/lib/novo-configs"

export default function NovoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = use(params)
  const { workspace } = useAuth()
  const isClinicWorkspace = workspace?.metadata?.segment === "clinicas"
  const isRealEstateWorkspace = workspace?.metadata?.segment === "imobiliarias"
  const isServicesWorkspace = workspace?.metadata?.segment === "servicos"
  const searchParams = useSearchParams()
  const realEstateClientRole = searchParams.get("role") === "proprietario" ? "proprietario" : searchParams.get("role") === "interessado" ? "interessado" : "cliente"
  const realEstateOperationKind = searchParams.get("kind") === "imovel" ? "imovel" : searchParams.get("kind") === "visita" ? "visita" : "negociacao"
  const servicesClientRole = searchParams.get("role") === "servico" ? "servico" : searchParams.get("role") === "responsavel" ? "responsavel" : "cliente"
  const servicesOperationKind = searchParams.get("kind") === "atendimento" ? "atendimento" : "ordem"
  const [submitted, setSubmitted] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const baseConfig: NovoConfig | undefined = tipo === "foto" ? fotoConfig : novoConfigs[tipo]
  const config: NovoConfig | undefined = useMemo(() => {
    if (!baseConfig || (!isClinicWorkspace && !isRealEstateWorkspace && !isServicesWorkspace)) {
      return baseConfig
    }

    if (tipo === "cliente") {
      if (isServicesWorkspace) {
        const roleLabel = servicesClientRole === "servico" ? "servico" : servicesClientRole === "responsavel" ? "responsavel" : "cliente"
        const roleLabelCapitalized = servicesClientRole === "servico" ? "Servico" : servicesClientRole === "responsavel" ? "Responsavel" : "Cliente"

        return {
          ...baseConfig,
          title: `Novo ${roleLabel}`,
          subtitle: `Cadastre um novo ${roleLabel} usando a estrutura existente do COS.`,
          cta: `Cadastrar ${roleLabel}`,
          fields: [
            { name: "nome", label: roleLabelCapitalized, type: "text", placeholder: `Nome do ${roleLabel}`, required: true },
            { name: "email", label: "E-mail", type: "email", placeholder: "email@contato.com" },
            { name: "telefone", label: "Telefone", type: "tel", placeholder: "(11) 99999-9999" },
            { name: "servico", label: "Servico", type: "text", placeholder: "Servico principal" },
            { name: "valor", label: "Valor", type: "text", placeholder: "R$ 0,00" },
            { name: "responsavel", label: "Responsavel", type: "text", placeholder: "Responsavel principal" },
            { name: "observacoes", label: "Observacoes", type: "textarea", placeholder: `Observacoes sobre o ${roleLabel}...` },
          ],
        }
      }

      if (isRealEstateWorkspace) {
        const roleLabel = realEstateClientRole === "proprietario" ? "proprietario" : realEstateClientRole === "interessado" ? "interessado" : "cliente"
        const roleLabelCapitalized = realEstateClientRole === "proprietario" ? "Proprietario" : realEstateClientRole === "interessado" ? "Interessado" : "Cliente"

        return {
          ...baseConfig,
          title: `Novo ${roleLabel}`,
          subtitle: `Cadastre um novo ${roleLabel} usando a estrutura existente do COS.`,
          cta: `Cadastrar ${roleLabel}`,
          fields: [
            { name: "nome", label: roleLabelCapitalized, type: "text", placeholder: `Nome do ${roleLabel}`, required: true },
            { name: "email", label: "E-mail", type: "email", placeholder: "email@contato.com" },
            { name: "telefone", label: "Telefone", type: "tel", placeholder: "(11) 99999-9999" },
            { name: "interesse", label: "Interesse", type: "text", placeholder: "Imovel, bairro ou necessidade" },
            { name: "responsavel", label: "Responsavel", type: "text", placeholder: "Corretor responsavel" },
            { name: "observacoes", label: "Observacoes", type: "textarea", placeholder: `Observacoes sobre o ${roleLabel}...` },
          ],
        }
      }

      return {
        ...baseConfig,
        title: "Novo paciente",
        subtitle: "Cadastre um novo paciente usando a estrutura existente do COS.",
        cta: "Cadastrar paciente",
        fields: [
          { name: "nome", label: "Paciente", type: "text", placeholder: "Nome do paciente", required: true },
          { name: "email", label: "E-mail", type: "email", placeholder: "email@contato.com" },
          { name: "telefone", label: "Telefone", type: "tel", placeholder: "(11) 99999-9999" },
          { name: "convenio", label: "Convenio", type: "text", placeholder: "Nome do convenio" },
          { name: "procedimento", label: "Procedimento", type: "text", placeholder: "Procedimento principal" },
          { name: "profissional", label: "Profissional", type: "text", placeholder: "Profissional responsavel" },
          { name: "observacoes", label: "Observacoes", type: "textarea", placeholder: "Observacoes iniciais do paciente..." },
        ],
      }
    }

    if (tipo === "operacao") {
      if (isServicesWorkspace) {
        const kindLabel = servicesOperationKind === "atendimento" ? "atendimento" : "ordem de servico"
        const kindLabelCapitalized = servicesOperationKind === "atendimento" ? "Atendimento" : "Ordem de servico"

        return {
          ...baseConfig,
          title: `Nova ${kindLabel}`,
          subtitle: `Registre uma ${kindLabel} com os dados essenciais da operacao de servicos.`,
          cta: `Registrar ${kindLabel}`,
          fields: [
            { name: "nome", label: kindLabelCapitalized, type: "text", placeholder: `Nome da ${kindLabel}`, required: true },
            { name: "servico", label: "Servico", type: "text", placeholder: "Servico principal" },
            { name: "valor", label: "Valor", type: "text", placeholder: "R$ 0,00" },
            { name: "responsavel", label: "Responsavel", type: "text", placeholder: "Responsavel principal" },
            { name: "prazo", label: "Prazo", type: "date" },
            { name: "descricao", label: "Descricao", type: "textarea", placeholder: `Detalhes da ${kindLabel}...` },
          ],
        }
      }

      if (isRealEstateWorkspace) {
        const kindLabel = realEstateOperationKind === "imovel" ? "imovel" : realEstateOperationKind === "visita" ? "visita" : "negociacao"
        const kindLabelCapitalized = realEstateOperationKind === "imovel" ? "Imovel" : realEstateOperationKind === "visita" ? "Visita" : "Negociacao"

        return {
          ...baseConfig,
          title: `Novo ${kindLabel}`,
          subtitle: `Registre um ${kindLabel} com os dados essenciais da operacao imobiliaria.`,
          cta: `Registrar ${kindLabel}`,
          fields: [
            { name: "nome", label: kindLabelCapitalized, type: "text", placeholder: `Nome do ${kindLabel}`, required: true },
            { name: "imovel", label: "Imovel", type: "text", placeholder: "Nome ou referencia do imovel" },
            { name: "finalidade", label: "Finalidade", type: "text", placeholder: "Venda ou locacao" },
            { name: "valor", label: "Valor", type: "text", placeholder: "R$ 0,00" },
            { name: "responsavel", label: "Responsavel", type: "text", placeholder: "Corretor responsavel" },
            { name: "prazo", label: "Data", type: "date" },
            { name: "descricao", label: "Descricao", type: "textarea", placeholder: `Detalhes do ${kindLabel}...` },
          ],
        }
      }

      return {
        ...baseConfig,
        title: "Novo atendimento",
        subtitle: "Registre um atendimento com os dados clinicos essenciais.",
        cta: "Registrar atendimento",
        fields: [
          { name: "nome", label: "Atendimento", type: "text", placeholder: "Nome do atendimento", required: true },
          { name: "paciente", label: "Paciente", type: "text", placeholder: "Nome do paciente" },
          { name: "procedimento", label: "Procedimento", type: "text", placeholder: "Procedimento realizado" },
          { name: "profissional", label: "Profissional", type: "text", placeholder: "Profissional responsavel" },
          { name: "prazo", label: "Data", type: "date" },
          { name: "descricao", label: "Observacoes", type: "textarea", placeholder: "Detalhes do atendimento..." },
        ],
      }
    }

    if (tipo === "documento") {
      if (isRealEstateWorkspace) {
        return {
          ...baseConfig,
          title: "Novo documento imobiliario",
          subtitle: "Crie um documento imobiliario usando o modulo ja existente.",
          cta: "Criar documento imobiliario",
        }
      }

      return {
        ...baseConfig,
        title: "Novo documento clinico",
        subtitle: "Crie um documento clinico usando o modulo ja existente.",
        cta: "Criar documento clinico",
      }
    }

    return baseConfig
  }, [baseConfig, isClinicWorkspace, isRealEstateWorkspace, isServicesWorkspace, realEstateClientRole, realEstateOperationKind, servicesClientRole, servicesOperationKind, tipo])
  const hasRealPersistence = ["cliente", "financeiro", "operacao", "documento", "reuniao"].includes(tipo)

  if (!config) {
    return (
      <div className="mx-auto max-w-lg px-4 py-4">
        <BackButton />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <FileQuestion className="h-7 w-7 text-gray-400" />
          </div>
          <h1 className="mb-1 text-lg font-semibold text-[#0a0a0a]">Em preparacao</h1>
          <p className="max-w-xs text-sm text-gray-500">
            Este recurso ainda esta sendo preparado e estara disponivel em breve.
          </p>
          <Link href="/app" className="mt-5 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white">
            Voltar ao inicio
          </Link>
        </div>
      </div>
    )
  }

  const Icon = config.icon

  const submitForm = async () => {
    if (tipo === "cliente") {
      return createClientAction({
        name: formValues.nome ?? "",
        email: formValues.email ?? "",
        phone: formValues.telefone ?? "",
        company: isClinicWorkspace ? formValues.convenio ?? "" : formValues.empresa ?? "",
        notes: isClinicWorkspace
          ? [
              formValues.procedimento ? `Procedimento: ${formValues.procedimento}` : "",
              formValues.profissional ? `Profissional: ${formValues.profissional}` : "",
              formValues.observacoes ? `Observacoes: ${formValues.observacoes}` : "",
            ]
              .filter(Boolean)
              .join("\n")
          : isRealEstateWorkspace
            ? [
                `Perfil: ${realEstateClientRole === "proprietario" ? "Proprietario" : realEstateClientRole === "interessado" ? "Interessado" : "Cliente"}`,
                formValues.interesse ? `Interesse: ${formValues.interesse}` : "",
                formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
                formValues.observacoes ? `Observacoes: ${formValues.observacoes}` : "",
              ]
                .filter(Boolean)
                .join("\n")
            : isServicesWorkspace
              ? [
                  `Perfil: ${servicesClientRole === "servico" ? "Servico" : servicesClientRole === "responsavel" ? "Responsavel" : "Cliente"}`,
                  formValues.servico ? `Servico: ${formValues.servico}` : "",
                  formValues.valor ? `Valor: ${formValues.valor}` : "",
                  formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
                  formValues.observacoes ? `Observacoes: ${formValues.observacoes}` : "",
                ]
                  .filter(Boolean)
                  .join("\n")
            : formValues.observacoes ?? "",
        status: (formValues.status ?? "Ativo").toLowerCase() === "arquivado" ? "archived" : "active",
      })
    }

    if (tipo === "financeiro") {
      return createFinancialEntryAction({
        type: formValues.tipo ?? "Ganho",
        title: formValues.titulo ?? "",
        amount: formValues.valor ?? "",
        category: formValues.categoria ?? "",
        dueDate: formValues.data ?? "",
        notes: formValues.observacoes ?? "",
      })
    }

    if (tipo === "operacao") {
      return createOperationAction({
        title: formValues.nome ?? "",
        description: [
          isClinicWorkspace && formValues.paciente ? `Paciente: ${formValues.paciente}` : "",
          isClinicWorkspace && formValues.procedimento ? `Procedimento: ${formValues.procedimento}` : "",
          isClinicWorkspace && formValues.profissional ? `Profissional: ${formValues.profissional}` : "",
          isRealEstateWorkspace ? `Tipo: ${realEstateOperationKind === "imovel" ? "Imovel" : realEstateOperationKind === "visita" ? "Visita" : "Negociacao"}` : "",
          isRealEstateWorkspace && formValues.imovel ? `Imovel: ${formValues.imovel}` : "",
          isRealEstateWorkspace && formValues.finalidade ? `Finalidade: ${formValues.finalidade}` : "",
          isRealEstateWorkspace && formValues.valor ? `Valor: ${formValues.valor}` : "",
          isRealEstateWorkspace && formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
          isServicesWorkspace ? `Tipo: ${servicesOperationKind === "atendimento" ? "Atendimento" : "Ordem de servico"}` : "",
          isServicesWorkspace && formValues.servico ? `Servico: ${formValues.servico}` : "",
          isServicesWorkspace && formValues.valor ? `Valor: ${formValues.valor}` : "",
          isServicesWorkspace && formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
          !isClinicWorkspace && formValues.tipo ? `Tipo: ${formValues.tipo}` : "",
          !isClinicWorkspace && !isRealEstateWorkspace && !isServicesWorkspace && formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
          formValues.descricao ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
        dueDate: formValues.prazo ?? "",
        status: "open",
        priority: "medium",
      })
    }

    if (tipo === "documento") {
      return createDocumentAction({
        title: formValues.titulo ?? "",
        type: formValues.tipo ?? "Outro",
        content: formValues.conteudo ?? "",
        status: "draft",
      })
    }

    if (tipo === "reuniao") {
      return createMeetingAction({
        title: formValues.titulo ?? "",
        summary: [
          formValues.participantes ? `Participantes: ${formValues.participantes}` : "",
          formValues.data ? `Data: ${formValues.data}` : "",
          formValues.tipo ? `Modalidade: ${formValues.tipo}` : "",
          formValues.pauta ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
        status: "draft",
      })
    }

    return {
      error: "Este recurso ainda esta em preparacao e nao possui persistencia real no COS.",
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mb-1 text-lg font-semibold text-[#0a0a0a]">Tudo certo!</h1>
          <p className="mb-6 text-sm text-gray-500">{config.title} salvo com sucesso.</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSubmitted(false)
                setFormValues({})
              }}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Criar outro
            </button>
            <Link href="/app" className="rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
              Concluir
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <BackButton />

      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: config.bg }}>
          <Icon className="h-6 w-6" style={{ color: config.color }} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#0a0a0a]">{config.title}</h1>
          <p className="text-sm text-gray-500">{config.subtitle}</p>
        </div>
      </div>

      {!hasRealPersistence && (
        <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Este fluxo ainda esta em preparacao. O preenchimento pode ser revisado, mas nada sera salvo no sistema por enquanto.
        </div>
      )}

      {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <form
        onSubmit={async (event) => {
          event.preventDefault()
          setIsSubmitting(true)
          setError("")

          const result = await submitForm()

          setIsSubmitting(false)

          if ("error" in result && result.error) {
            setError(result.error)
            return
          }

          setSubmitted(true)
        }}
        className="space-y-4"
      >
        {tipo === "foto" ? (
          <PhotoCapture />
        ) : (
          config.fields.map((field) => (
            <div key={field.name}>
              <label className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              ) : field.type === "select" ? (
                <select
                  required={field.required}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === "file" ? (
                <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-white py-8 transition-colors hover:border-gray-300">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <span className="text-sm text-gray-500">Clique para selecionar um arquivo</span>
                  <input type="file" className="hidden" />
                </label>
              ) : (
                <input
                  type={field.type}
                  required={field.required}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              )}
            </div>
          ))
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-xl bg-[#0a0a0a] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : config.cta}
        </button>
      </form>
    </div>
  )
}

function BackButton() {
  const router = useRouter()
  return (
    <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700">
      <ChevronLeft className="h-4 w-4" /> Voltar
    </button>
  )
}

function PhotoCapture() {
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  return (
    <div className="space-y-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview || "/placeholder.svg"} alt="Pre-visualizacao" className="w-full rounded-2xl border border-gray-200" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-8 transition-colors hover:bg-gray-50">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50">
              <Camera className="h-5 w-5 text-pink-500" />
            </span>
            <span className="text-sm font-medium text-[#0a0a0a]">Tirar foto</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-8 transition-colors hover:bg-gray-50">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
              <Upload className="h-5 w-5 text-blue-500" />
            </span>
            <span className="text-sm font-medium text-[#0a0a0a]">Upload</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        </div>
      )}
      {preview && (
        <button
          type="button"
          onClick={() => setPreview(null)}
          className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Trocar imagem
        </button>
      )}
    </div>
  )
}
