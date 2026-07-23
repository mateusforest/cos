"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FloatingField } from "@/components/auth/floating-field"
import { SectorSelect } from "@/components/auth/sector-select"
import { ProductToggle, type ProductKey } from "@/components/auth/product-toggle"
import { PreparingOverlay } from "@/components/auth/preparing-overlay"
import { signupAction } from "@/actions/auth"

export default function CadastroPage() {
  const router = useRouter()
  const [product, setProduct] = useState<ProductKey>("operacoes")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [sector, setSector] = useState("default")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }

    if (!accepted) {
      setError("Você precisa aceitar os termos de uso.")
      return
    }

    setPreparing(true)

    startTransition(async () => {
      const result = await signupAction({
        name,
        email,
        password,
        productType: product === "connect" ? "connect" : "operations",
        segment: product === "operacoes" ? sector : null,
      })

      if (result.error) {
        setPreparing(false)
        setError(result.error)
        return
      }

      router.replace(result.redirectTo || "/app")
      router.refresh()
    })
  }

  return (
    <div className="relative">
      {preparing && <PreparingOverlay />}

      <header className="mb-8">
        <h1 className="text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          Vamos começar.
        </h1>
        <p className="mt-2 text-pretty text-muted-foreground">
          Em menos de um minuto você já estará operando com o COS.
        </p>
      </header>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <span className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Produto
          </span>
          <ProductToggle value={product} onChange={setProduct} />
        </div>

        <FloatingField
          label="Nome"
          value={name}
          onChange={setName}
          autoComplete="name"
          required
          disabled={isPending}
        />
        <FloatingField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
          disabled={isPending}
        />

        <SectorSelect value={sector} onChange={setSector} />

        <FloatingField
          label="Senha"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          disabled={isPending}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((state) => !state)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
        <FloatingField
          label="Confirmar senha"
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          required
          disabled={isPending}
        />

        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            required
            className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
          />
          <span>
            Li e concordo com os{" "}
            <Link href="/termos" className="font-medium text-brand hover:underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="font-medium text-brand hover:underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="group h-14 w-full rounded-xl text-base [&_svg]:size-4"
        >
          {isPending ? "Criando conta..." : "Criar conta"}
          <ArrowRight className="ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      </form>
    </div>
  )
}
