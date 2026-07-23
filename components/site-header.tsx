'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Menu, X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { CosLogo } from '@/components/cos-logo'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Soluções', href: '#solucoes', hasCaret: true },
  { label: 'Recursos', href: '#recursos', hasCaret: true },
  { label: 'Sobre', href: '#sobre', hasCaret: false },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <Link href="/" aria-label="Página inicial COS">
          <CosLogo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
              {item.hasCaret && <ChevronDown className="size-3.5" />}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link href="/login" className={cn(buttonVariants(), 'h-10 rounded-full px-5')}>
            Acessar o COS
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-lg text-foreground md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background px-5 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center justify-between py-3 text-sm font-medium text-foreground"
              >
                {item.label}
                {item.hasCaret && <ChevronDown className="size-4 text-muted-foreground" />}
              </a>
            ))}
          </nav>
          <Link href="/login" className={cn(buttonVariants(), 'mt-3 h-11 w-full rounded-full')}>
            Acessar o COS
          </Link>
        </div>
      )}
    </header>
  )
}
