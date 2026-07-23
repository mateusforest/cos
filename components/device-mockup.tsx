import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DeviceMockupProps = {
  children: ReactNode
  /** Texto exibido na barra de endereço da moldura. */
  address?: string
  className?: string
}

/**
 * Moldura premium de navegador desktop.
 * Envolve um VideoPlayer para que o conteúdo pareça parte do produto,
 * e não apenas um player de vídeo solto.
 */
export function DeviceMockup({ children, address = 'app.cos.com', className }: DeviceMockupProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_40px_90px_-45px_rgba(24,20,50,0.45)]',
        className,
      )}
    >
      {/* Barra superior da janela */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-muted/50 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <div className="mx-auto flex w-full max-w-[220px] items-center justify-center rounded-md border border-border/60 bg-background px-3 py-1">
          <span className="truncate text-[11px] font-medium text-muted-foreground">{address}</span>
        </div>
        <div className="w-[52px]" aria-hidden />
      </div>

      {/* Conteúdo (vídeo) */}
      <div className="bg-muted">{children}</div>
    </div>
  )
}
