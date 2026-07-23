'use client'

import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FloatingFieldProps = {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
  name?: string
  /** Conteúdo à direita, ex.: botão de mostrar senha. */
  rightSlot?: ReactNode
  disabled?: boolean
}

/**
 * Campo de formulário premium com label flutuante.
 * Microinterações: a borda responde ao foco e o label sobe ao focar/preencher.
 */
export function FloatingField({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required,
  name,
  rightSlot,
  disabled,
}: FloatingFieldProps) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const floating = focused || value.length > 0

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-background transition-all duration-200',
        focused
          ? 'border-brand ring-4 ring-brand/10'
          : 'border-border hover:border-foreground/20',
        disabled && 'opacity-60',
      )}
    >
      <label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute left-4 origin-left text-muted-foreground transition-all duration-200 ease-out',
          floating
            ? 'top-2 text-[11px] font-medium text-brand'
            : 'top-1/2 -translate-y-1/2 text-sm',
          !focused && floating && 'text-muted-foreground',
        )}
      >
        {label}
      </label>

      <div className="flex items-center">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className="h-14 w-full flex-1 rounded-xl bg-transparent px-4 pt-4 pb-1 text-sm text-foreground outline-none placeholder:text-transparent"
        />
        {rightSlot && <div className="pr-2">{rightSlot}</div>}
      </div>
    </div>
  )
}
