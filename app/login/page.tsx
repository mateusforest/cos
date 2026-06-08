"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { AuthLayout } from "@/components/cos/auth-layout"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simular login - integrar com backend real
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Redirecionar após login para o COS (responsivo: desktop = chat, mobile = PWA)
    window.location.href = "/app"
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    // Integrar com Google OAuth
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return (
    <AuthLayout>
      {/* Logo centralizado no card */}
      <div className="flex justify-center mb-8">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"
          alt="COS"
          width={56}
          height={56}
          className="w-14 h-14"
        />
      </div>

      {/* Título */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-[#0a0a0a] tracking-tight">
          Entrar no COS
        </h1>
        <p className="text-[#737373] mt-2">
          Continue sua operação.
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-[#0a0a0a]">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
          />
        </div>

        {/* Senha */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-[#0a0a0a]">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
          />
        </div>

        {/* Lembrar de mim + Esqueci senha */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[#e5e5e5] text-[#0a0a0a] focus:ring-[#0a0a0a]/20"
            />
            <span className="text-sm text-[#737373]">Lembrar de mim</span>
          </label>
          <Link 
            href="/recuperar-senha" 
            className="text-sm text-[#0a0a0a] hover:underline font-medium"
          >
            Esqueci minha senha
          </Link>
        </div>

        {/* Botão principal */}
        <motion.button
          type="submit"
          disabled={isLoading}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 px-4 bg-[#0a0a0a] text-white rounded-xl font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Entrar"
          )}
        </motion.button>

        {/* Divisor */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e5e5e5]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-[#a3a3a3]">ou</span>
          </div>
        </div>

        {/* Google Login */}
        <motion.button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 px-4 bg-white border border-[#e5e5e5] text-[#0a0a0a] rounded-xl font-medium hover:bg-[#fafafa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar com Google
        </motion.button>
      </form>

      {/* Link para cadastro */}
      <p className="mt-8 text-center text-sm text-[#737373]">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-[#0a0a0a] font-medium hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthLayout>
  )
}
