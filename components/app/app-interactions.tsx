"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  X,
  SlidersHorizontal,
  Building2,
  Users,
  CreditCard,
  Receipt,
  FileText,
  ShieldCheck,
  UserPlus,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

type FilterState = {
  period: string
  type: string
  status: string
  owner: string
  area: string
}

type CompanyState = {
  companyName: string
  segment: string
  cnpj: string
  phone: string
  email: string
  site: string
  address: string
}

type InviteState = {
  name: string
  email: string
  role: string
}

type PaymentState = {
  cardName: string
  cardLast4: string
  expiry: string
  billingDocument: string
}

type AppModal =
  | "filters"
  | "company"
  | "team"
  | "subscription"
  | "billingHistory"
  | "invoices"
  | "payment"
  | null

type AppInteractionsContextValue = {
  openFilters: () => void
  openCompany: () => void
  openTeam: () => void
  openSubscription: () => void
  openBillingHistory: () => void
  openInvoices: () => void
  openPayment: () => void
  closeModal: () => void
}

const AppInteractionsContext = createContext<AppInteractionsContextValue | null>(null)

const defaultFilters: FilterState = {
  period: "Hoje",
  type: "Clientes",
  status: "Todos",
  owner: "Todos",
  area: "Todas as áreas",
}

const defaultCompany: CompanyState = {
  companyName: "",
  segment: "",
  cnpj: "",
  phone: "",
  email: "",
  site: "",
  address: "",
}

const defaultInvite: InviteState = {
  name: "",
  email: "",
  role: "Membro",
}

const defaultPayment: PaymentState = {
  cardName: "",
  cardLast4: "",
  expiry: "",
  billingDocument: "",
}

export function useAppInteractions() {
  const context = useContext(AppInteractionsContext)
  if (!context) {
    throw new Error("useAppInteractions deve ser usado dentro de AppInteractionsProvider")
  }
  return context
}

export function AppInteractionsProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<AppModal>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [company, setCompany] = useState<CompanyState>(defaultCompany)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState<InviteState>(defaultInvite)
  const [payment, setPayment] = useState<PaymentState>(defaultPayment)

  const closeModal = () => {
    setModal(null)
    setInviteOpen(false)
  }

  const value = useMemo<AppInteractionsContextValue>(
    () => ({
      openFilters: () => setModal("filters"),
      openCompany: () => setModal("company"),
      openTeam: () => setModal("team"),
      openSubscription: () => setModal("subscription"),
      openBillingHistory: () => setModal("billingHistory"),
      openInvoices: () => setModal("invoices"),
      openPayment: () => setModal("payment"),
      closeModal,
    }),
    [],
  )

  const applyFilters = () => {
    toast({
      title: "Filtros aplicados",
      description: "Filtros aplicados localmente. A busca real será conectada ao backend.",
    })
    closeModal()
  }

  const saveCompany = () => {
    toast({
      title: "Dados da empresa",
      description: "Dados da empresa serão salvos quando o backend estiver conectado.",
    })
    closeModal()
  }

  const sendInvite = () => {
    toast({
      title: "Convite preparado",
      description: "Convites serão enviados quando o backend estiver conectado.",
    })
    setInvite(defaultInvite)
    setInviteOpen(false)
  }

  const showBillingToast = () => {
    toast({
      title: "Faturamento em preparação",
      description: "As notas fiscais serão exibidas após a integração de faturamento.",
    })
  }

  const showStripeToast = () => {
    toast({
      title: "Assinaturas em preparação",
      description: "Planos e assinaturas serão conectados ao Stripe posteriormente.",
    })
  }

  const showPaymentToast = () => {
    toast({
      title: "Checkout em preparação",
      description: "Checkout seguro será conectado posteriormente.",
    })
  }

  return (
    <AppInteractionsContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
              onClick={closeModal}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-[75] bg-white rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-md lg:rounded-3xl"
            >
              {modal === "filters" && (
                <ModalShell icon={SlidersHorizontal} title="Filtros" onClose={closeModal}>
                  <div className="space-y-4">
                    <ChoiceField
                      label="Período"
                      value={filters.period}
                      onChange={(period) => setFilters((prev) => ({ ...prev, period }))}
                      options={["Hoje", "Esta semana", "Este mês", "Personalizado"]}
                    />
                    <ChoiceField
                      label="Tipo"
                      value={filters.type}
                      onChange={(type) => setFilters((prev) => ({ ...prev, type }))}
                      options={["Clientes", "Operações", "Financeiro", "Equipe", "Documentos", "Reuniões", "Suporte"]}
                    />
                    <ChoiceField
                      label="Status"
                      value={filters.status}
                      onChange={(status) => setFilters((prev) => ({ ...prev, status }))}
                      options={["Todos", "Aberto", "Em andamento", "Concluído", "Em preparação"]}
                    />
                    <InputField label="Responsável" value={filters.owner} onChange={(owner) => setFilters((prev) => ({ ...prev, owner }))} placeholder="Todos" />
                    <InputField label="Área" value={filters.area} onChange={(area) => setFilters((prev) => ({ ...prev, area }))} placeholder="Todas as áreas" />
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={() => setFilters(defaultFilters)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                        Limpar filtros
                      </button>
                      <button type="button" onClick={applyFilters} className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors">
                        Aplicar filtros
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}

              {modal === "company" && (
                <ModalShell icon={Building2} title="Minha empresa" onClose={closeModal}>
                  <div className="space-y-4">
                    <EmptyHint text="Sem dados cadastrados ainda." />
                    <InputField label="Nome da empresa" value={company.companyName} onChange={(companyName) => setCompany((prev) => ({ ...prev, companyName }))} placeholder="Nome da empresa" />
                    <InputField label="Segmento" value={company.segment} onChange={(segment) => setCompany((prev) => ({ ...prev, segment }))} placeholder="Segmento" />
                    <InputField label="CNPJ" value={company.cnpj} onChange={(cnpj) => setCompany((prev) => ({ ...prev, cnpj }))} placeholder="CNPJ" />
                    <InputField label="Telefone" value={company.phone} onChange={(phone) => setCompany((prev) => ({ ...prev, phone }))} placeholder="Telefone" />
                    <InputField label="E-mail" value={company.email} onChange={(email) => setCompany((prev) => ({ ...prev, email }))} placeholder="E-mail" />
                    <InputField label="Site" value={company.site} onChange={(site) => setCompany((prev) => ({ ...prev, site }))} placeholder="Site" />
                    <TextareaField label="Endereço" value={company.address} onChange={(address) => setCompany((prev) => ({ ...prev, address }))} placeholder="Endereço" />
                    <ModalActions secondaryLabel="Cancelar" primaryLabel="Salvar" onSecondary={closeModal} onPrimary={saveCompany} />
                  </div>
                </ModalShell>
              )}

              {modal === "team" && (
                <ModalShell icon={Users} title="Equipe" onClose={closeModal}>
                  <div className="space-y-4">
                    <EmptyHint text="Nenhum usuário cadastrado ainda." />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setInviteOpen((prev) => !prev)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors">
                        <UserPlus className="w-4 h-4" />
                        Convidar membro
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toast({
                            title: "Permissões em preparação",
                            description: "O gerenciamento de permissões será conectado ao backend.",
                          })
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Gerenciar permissões
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {inviteOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                            <InputField label="Nome" value={invite.name} onChange={(name) => setInvite((prev) => ({ ...prev, name }))} placeholder="Nome" />
                            <InputField label="E-mail" value={invite.email} onChange={(email) => setInvite((prev) => ({ ...prev, email }))} placeholder="E-mail" />
                            <ChoiceField label="Papel" value={invite.role} onChange={(role) => setInvite((prev) => ({ ...prev, role }))} options={["Proprietário", "Admin", "Membro"]} />
                            <button type="button" onClick={sendInvite} className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors">
                              Enviar convite
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ModalShell>
              )}

              {modal === "subscription" && (
                <ModalShell icon={CreditCard} title="Assinatura e plano" onClose={closeModal}>
                  <div className="space-y-4">
                    <EmptyHint text="Nenhuma assinatura ativa ainda." />
                    <InfoRow label="Plano atual" value="—" />
                    <InfoRow label="Usuários incluídos" value="0" />
                    <InfoRow label="Créditos IA" value="0" />
                    <InfoRow label="Armazenamento" value="0 GB" />
                    <InfoRow label="Status da assinatura" value="Em preparação" />
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Planos e assinaturas serão conectados ao Stripe posteriormente.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={showStripeToast} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                        Ver planos
                      </button>
                      <button type="button" onClick={showStripeToast} className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors">
                        Alterar plano
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}

              {modal === "billingHistory" && (
                <ModalShell icon={Receipt} title="Histórico de cobrança" onClose={closeModal}>
                  <div className="space-y-4">
                    <TableCard headers={["Data", "Descrição", "Valor", "Status"]} emptyLabel="Nenhuma cobrança registrada ainda." />
                  </div>
                </ModalShell>
              )}

              {modal === "invoices" && (
                <ModalShell icon={FileText} title="Notas fiscais" onClose={closeModal}>
                  <div className="space-y-4">
                    <EmptyHint text="Nenhuma nota fiscal disponível ainda." />
                    <button type="button" onClick={showBillingToast} className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors">
                      Atualizar notas fiscais
                    </button>
                  </div>
                </ModalShell>
              )}

              {modal === "payment" && (
                <ModalShell icon={CreditCard} title="Forma de pagamento" onClose={closeModal}>
                  <div className="space-y-4">
                    <EmptyHint text="Nenhuma forma de pagamento cadastrada ainda." />
                    <InputField label="Nome no cartão" value={payment.cardName} onChange={(cardName) => setPayment((prev) => ({ ...prev, cardName }))} placeholder="Nome no cartão" />
                    <InputField label="Final do cartão" value={payment.cardLast4} onChange={(cardLast4) => setPayment((prev) => ({ ...prev, cardLast4 }))} placeholder="Últimos 4 dígitos" />
                    <InputField label="Vencimento" value={payment.expiry} onChange={(expiry) => setPayment((prev) => ({ ...prev, expiry }))} placeholder="MM/AA" />
                    <InputField label="CPF/CNPJ de cobrança" value={payment.billingDocument} onChange={(billingDocument) => setPayment((prev) => ({ ...prev, billingDocument }))} placeholder="CPF ou CNPJ" />
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Os dados de pagamento reais serão gerenciados com segurança pelo Stripe.
                      </p>
                    </div>
                    <button type="button" onClick={showPaymentToast} className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors">
                      Configurar pagamento
                    </button>
                  </div>
                </ModalShell>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppInteractionsContext.Provider>
  )
}

function ModalShell({
  icon: Icon,
  title,
  onClose,
  children,
}: {
  icon: typeof SlidersHorizontal
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-gray-600" />
          </span>
          <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors" aria-label="Fechar">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      {children}
    </>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-gray-300"
      />
    </label>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-gray-300 resize-none"
      />
    </label>
  )
}

function ChoiceField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
              option === value ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function ModalActions({
  secondaryLabel,
  primaryLabel,
  onSecondary,
  onPrimary,
}: {
  secondaryLabel: string
  primaryLabel: string
  onSecondary: () => void
  onPrimary: () => void
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button type="button" onClick={onSecondary} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
        {secondaryLabel}
      </button>
      <button type="button" onClick={onPrimary} className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors">
        {primaryLabel}
      </button>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-[#0a0a0a]">{value}</span>
    </div>
  )
}

function TableCard({ headers, emptyLabel }: { headers: string[]; emptyLabel: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100">
      <div className="grid grid-cols-4 gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
        {headers.map((header) => (
          <span key={header} className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {header}
          </span>
        ))}
      </div>
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      </div>
    </div>
  )
}
