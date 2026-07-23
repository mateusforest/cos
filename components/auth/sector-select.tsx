'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Check, Star, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Sector = { value: string; label: string; recommended?: boolean }

const SECTORS: Sector[] = [
  { value: 'padrao', label: 'Padrão', recommended: true },
  { value: 'comercio', label: 'Comércio' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'industria', label: 'Indústria' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'imobiliarias', label: 'Imobiliárias' },
  { value: 'logistica', label: 'Logística' },
  { value: 'advocacia', label: 'Advocacia' },
  { value: 'contabilidade', label: 'Contabilidade' },
  { value: 'construcao', label: 'Construção' },
  { value: 'rh', label: 'Recursos Humanos' },
  { value: 'outro', label: 'Outro segmento' },
]

export function SectorSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = SECTORS.find((sector) => sector.value === value)

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return SECTORS
    return SECTORS.filter((sector) => sector.label.toLowerCase().includes(normalizedQuery))
  }, [query])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const commit = (sector: Sector) => {
    onChange(sector.value)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const sector = filtered[activeIndex]
      if (sector) commit(sector)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-14 w-full items-center justify-between rounded-xl border bg-background px-4 text-left transition-all duration-200',
          open
            ? 'border-brand ring-4 ring-brand/10'
            : 'border-border hover:border-foreground/20',
        )}
      >
        <span className="flex flex-col">
          <span className="text-[11px] font-medium text-brand">Setor</span>
          <span
            className={cn(
              'flex items-center gap-1.5 text-sm',
              selected ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {selected?.recommended && <Star className="size-3.5 fill-brand text-brand" />}
            {selected ? selected.label : 'Selecione o setor'}
            {selected?.recommended && (
              <span className="text-[11px] text-muted-foreground">(Recomendado)</span>
            )}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 origin-top animate-pop-in overflow-hidden rounded-xl border border-border bg-background shadow-[0_24px_60px_-30px_rgba(24,20,50,0.45)]">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar setor..."
              className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhum setor encontrado.
              </li>
            )}
            {filtered.map((sector, index) => {
              const isSelected = sector.value === value
              const isActive = index === activeIndex
              return (
                <li key={sector.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => commit(sector)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      isActive ? 'bg-muted text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {sector.recommended ? (
                      <Star className="size-4 shrink-0 fill-brand text-brand" />
                    ) : (
                      <span className="size-4 shrink-0" />
                    )}
                    <span className={cn('flex-1', isSelected && 'font-medium text-foreground')}>
                      {sector.label}
                      {sector.recommended && (
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          (Recomendado)
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="size-4 shrink-0 text-brand" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
