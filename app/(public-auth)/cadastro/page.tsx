"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SignupForm } from "@/components/auth/signup-form"
import { signupAction } from "@/actions/auth"
import type { ProductKey } from "@/components/auth/product-toggle"

const SEGMENT_MAP: Record<string, string> = {
  padrao: "default",
  rh: "recursos-humanos",
}

export default function CadastroPage() {
  const router = useRouter()
  const [product, setProduct] = useState<ProductKey>("operacoes")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [sector, setSector] = useState("padrao")
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
        segment: product === "operacoes" ? (SEGMENT_MAP[sector] ?? sector) : null,
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
    <SignupForm
      product={product}
      name={name}
      email={email}
      sector={sector}
      password={password}
      confirm={confirm}
      showPassword={showPassword}
      accepted={accepted}
      preparing={preparing}
      error={error}
      isPending={isPending}
      onProductChange={setProduct}
      onNameChange={setName}
      onEmailChange={setEmail}
      onSectorChange={setSector}
      onPasswordChange={setPassword}
      onConfirmChange={setConfirm}
      onTogglePassword={() => setShowPassword((state) => !state)}
      onAcceptedChange={setAccepted}
      onSubmit={onSubmit}
    />
  )
}
