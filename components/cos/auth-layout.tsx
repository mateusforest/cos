"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { CosLogo } from "@/components/cos-logo"
import { HeroLiveDemo } from "@/components/hero-live-demo"
import { CosGreeting } from "@/components/auth/cos-greeting"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname()
  const mode = pathname?.startsWith("/cadastro") ? "signup" : "login"

  const processingMessage =
    mode === "signup"
      ? ["Enquanto você finaliza seu cadastro,", "eu preparo tudo para começarmos."]
      : ["Enquanto você retorna,", "eu mantenho tudo pronto para você."]

  return (
    <main className="min-h-svh bg-background">
      <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden overflow-hidden border-r border-border/60 bg-background lg:flex lg:flex-col">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          >
            <div className="w-[138%] max-w-none translate-x-10 scale-[1.03] animate-breathe opacity-35 blur-[10px] saturate-75">
              <HeroLiveDemo />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/82 to-background/94" />
          </div>

          <div className="relative z-10 flex flex-col gap-9 p-10">
            <Link href="/" className="w-fit transition-opacity hover:opacity-70">
              <CosLogo className="h-6" />
            </Link>

            <div className="flex items-start gap-3">
              <span className="relative mt-1 flex size-2.5 shrink-0 items-center justify-center">
                <span className="absolute inline-flex size-2.5 rounded-full bg-brand/20 animate-slow-glow" />
                <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
              </span>
              <p className="animate-soft-breathe max-w-xs text-sm leading-relaxed text-muted-foreground">
                {processingMessage[0]}
                <br />
                {processingMessage[1]}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-1 items-center px-14">
            <CosGreeting />
          </div>

          <div className="relative z-10 flex justify-end p-10">
            <div className="text-right">
              <p
                className="text-3xl leading-none text-foreground/70"
                style={{ fontFamily: "var(--font-signature-family), 'Segoe Script', cursive" }}
              >
                — COS
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                Software Operacional Conversacional
              </p>
            </div>
          </div>
        </aside>

        <section className="relative flex flex-col">
          <div className="flex items-center justify-between p-6 lg:justify-end lg:p-8">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <CosLogo className="h-6" />
            </Link>
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:flex"
            >
              <ArrowLeft className="size-4" />
              Voltar ao site
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 pb-12 lg:px-8">
            <div className="w-full max-w-md">{children}</div>
          </div>

          <div className="p-6 text-center lg:p-8">
            {mode === "signup" ? (
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link href="/login" className="font-medium text-brand hover:underline">
                  Entrar
                </Link>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda não tem uma conta?{" "}
                <Link href="/cadastro" className="font-medium text-brand hover:underline">
                  Criar conta
                </Link>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
