"use client"

import { Search, Menu, Command } from "lucide-react"
import { useMaster } from "./master-store"

export function MasterHeader({ placeholder = "Buscar no Master..." }: { placeholder?: string }) {
  const { setMobileMenuOpen } = useMaster()

  return (
    <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 bg-white flex-shrink-0">
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden p-2 hover:bg-gray-50 rounded-xl transition-colors mr-1"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={placeholder}
            className="w-full pl-10 pr-16 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-muted-foreground">
            <Command className="w-3.5 h-3.5" />
            <span className="text-xs">K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4 sm:ml-6">
        <span className="hidden sm:inline-flex items-center text-xs font-medium text-muted-foreground border border-gray-200 rounded-full px-2.5 py-1">
          Equipe COS
        </span>
        <div
          className="w-9 h-9 rounded-full bg-[#0a0a0a] flex items-center justify-center text-white text-sm font-medium"
          aria-label="Administrador COS"
        >
          M
        </div>
      </div>
    </header>
  )
}
