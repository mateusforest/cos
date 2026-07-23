import Image from 'next/image'
import { cn } from '@/lib/utils'

type CosLogoProps = {
  className?: string
  variant?: 'full' | 'mark'
}

export function CosLogo({ className, variant = 'full' }: CosLogoProps) {
  return (
    <Image
      src={variant === 'mark' ? '/cos-logo-mark.png' : '/cos-logo.png'}
      alt="COS"
      width={3396}
      height={1007}
      priority
      className={cn('h-6 w-auto select-none', className)}
    />
  )
}
