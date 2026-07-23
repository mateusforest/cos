import { AuthFrame } from '@/components/auth/auth-frame'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return <AuthFrame>{children}</AuthFrame>
}
