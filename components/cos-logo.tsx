import Image from 'next/image'
import { cn } from '@/lib/utils'

export function CosLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/cos-logo.png"
      alt="COS"
      width={3396}
      height={1007}
      priority
      className={cn('h-6 w-auto select-none', className)}
    />
  )
}
