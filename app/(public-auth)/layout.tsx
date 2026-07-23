import { PublicAuthRouteGuard } from "@/components/auth/auth-route-guard"
import { AuthLayout } from "@/components/cos/auth-layout"

export default function PublicAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PublicAuthRouteGuard>
      <AuthLayout>{children}</AuthLayout>
    </PublicAuthRouteGuard>
  )
}
