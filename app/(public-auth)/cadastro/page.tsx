"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Eye, EyeOff, Layers, Plug } from "lucide-react"
import { signupAction } from "@/actions/auth"
import { FloatingField } from "@/components/auth/floating-field"
import { PreparingOverlay } from "@/components/auth/preparing-overlay"
import { Button } from "@/components/ui/button"
import type { WorkspaceType } from "@/lib/auth"

type ProductType = WorkspaceType

const operationsSectors = [
  { value: "default", label: "Padrão (Recomendado)" },
  { value: "comercio", label: "Comércio" },
  { value: "servicos", label: "Serviços" },
  { value: "industria", label: "Indústria" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "imobiliarias", label: "Imobiliárias" },
  { value: "logistica", label: "Logística" },
  { value: "advocacia", label: "Advocacia" },
  { value: "contabilidade", label: "Contabilidade" },
  { value: "construcao", label: "Construção" },
  { value: "recursos-humanos", label: "Recursos Humanos" },
  { value: "outro", label: "Outro segmento" },
] as const

function ProductCard({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean
  icon: typeof Layers
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl border p-4 text-left transition-all ${
        active
          ? "border-brand/35 bg-brand/5 shadow-[0_18px_36px_-28px_rgba(98,59,232,0.4)]"
          : "border-border/70 bg-background hover:border-brand/25 hover:bg-brand/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {active && <Check className="size-4 text-brand" />}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  )
}

export default function CadastroPage() {
  const router = useRouter()
  const [productType, setProductType] = useState<ProductType>("operations")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [operationsSegment, setOperationsSegment] = useState("default")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const selectedProductCopy = useMemo(
    () =>
      productType === "connect"
        ? {
            title: "COS Connect",
            description: "Conecte o COS ao sistema, ERP, CRM, planilha ou portal que sua empresa já utiliza.",
          }
        : {
            title: "COS Operações",
            description: "Centralize clientes, financeiro, documentos, equipe e processos em uma única operação.",
          },
    [productType],
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (productType === "operations" && !operationsSegment) {
      setError("Escolha o setor do COS Operações antes de continuar.")
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    if (!acceptTerms) {
      setError("Você precisa aceitar os termos de uso.")
      return
    }

    startTransition(async () => {
      const result = await signupAction({
        name,
        email,
        password,
        productType,
        segment: productType === "operations" ? operationsSegment : null,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.replace(result.redirectTo || "/app")
      router.refresh()
    })
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-background/92 p-7 shadow-[0_30px_80px_-45px_rgba(31,24,68,0.42)] backdrop-blur-sm md:p-8">
      {isPending && <PreparingOverlay />}
      <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Cadastro</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-foreground">Criar conta</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Escolha seu produto, mantenha o mesmo fluxo atual de workspace e comece a operar no COS.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <ProductCard
            active={productType === "operations"}
            icon={Layers}
            title="COS Operações"
            description="Seu sistema operacional conversacional para centralizar a operação do negócio."
            onClick={() => setProductType("operations")}
          />
          <ProductCard
            active={productType === "connect"}
            icon={Plug}
            title="COS Connect"
            description="Conecte seus sistemas atuais ao COS sem alterar o backend nem a lógica existente."
            onClick={() => setProductType("connect")}
          />
        </div>

        <div className="mt-5 rounded-2xl border border-border/70 bg-muted/25 px-4 py-3">
          <p className="text-sm font-medium text-foreground">{selectedProductCopy.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{selectedProductCopy.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FloatingField
            label="Nome completo"
            name="name"
            value={name}
            onChange={setName}
            autoComplete="name"
            required
            disabled={isPending}
          />

          <FloatingField
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
            disabled={isPending}
          />

          {productType === "operations" && (
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <label htmlFor="segment" className="block text-[11px] font-medium text-brand">
                Setor
              </label>
              <select
                id="segment"
                value={operationsSegment}
                onChange={(event) => setOperationsSegment(event.target.value)}
                disabled={isPending}
                className="mt-1 w-full bg-transparent text-sm text-foreground outline-none"
              >
                {operationsSectors.map((sector) => (
                  <option key={sector.value} value={sector.value}>
                    {sector.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <FloatingField
            label="Senha"
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
            disabled={isPending}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />

          <FloatingField
            label="Confirmar senha"
            type={showConfirmPassword ? "text" : "password"}
            name="confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            required
            disabled={isPending}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />

          <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              className="mt-0.5 size-4 rounded border-border text-brand focus:ring-brand/20"
            />
            <span>
              Aceito os{" "}
              <Link href="/termos" className="font-medium text-foreground hover:text-brand">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" className="font-medium text-foreground hover:text-brand">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>

          <Button
            type="submit"
            disabled={isPending}
            className="h-12 w-full rounded-full bg-[linear-gradient(135deg,rgba(120,62,255,0.92),rgba(90,38,236,0.92))] text-sm font-medium text-white shadow-[0_18px_40px_-24px_rgba(96,57,228,0.7)] hover:opacity-95"
          >
            {isPending ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>
      </div>
    </div>
  )
}
