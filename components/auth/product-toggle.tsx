'use client'

import { cn } from '@/lib/utils'

export type ProductKey = 'operacoes' | 'connect'

const OPTIONS: { key: ProductKey; label: string; hint: string }[] = [
  { key: 'operacoes', label: 'COS Operações', hint: 'Opere seu negócio por conversa' },
  { key: 'connect', label: 'COS Connect', hint: 'Conecte seus sistemas ao COS' },
]

export function ProductToggle({
  value,
  onChange,
}: {
  value: ProductKey
  onChange: (value: ProductKey) => void
}) {
  const activeIndex = OPTIONS.findIndex((option) => option.key === value)

  return (
    <div>
      <div className="relative grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1">
        <span
          aria-hidden
          className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-lg bg-background shadow-sm ring-1 ring-border transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        {OPTIONS.map((option) => {
          const active = option.key === value
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={cn(
                'relative z-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <p key={value} className="mt-2 animate-in-soft px-1 text-xs text-muted-foreground">
        {OPTIONS[activeIndex]?.hint}
      </p>
    </div>
  )
}
