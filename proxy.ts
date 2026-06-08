import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { canAccessPath, getUserAccessForUser, resolveHomePath } from "@/lib/auth"

function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error("As variáveis públicas do Supabase não estão configuradas.")
  }

  return { url, anonKey }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtectedRoute =
    pathname.startsWith("/app") ||
    pathname.startsWith("/connect") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/master")
  const isAuthRoute = pathname === "/login" || pathname === "/cadastro"

  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const { url, anonKey } = getPublicSupabaseEnv()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (isProtectedRoute) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  const access = await getUserAccessForUser(user, supabase)

  if (isAuthRoute) {
    return NextResponse.redirect(new URL(resolveHomePath(access), request.url))
  }

  if (!canAccessPath(pathname, access)) {
    return NextResponse.redirect(new URL(resolveHomePath(access), request.url))
  }

  return response
}

export const config = {
  matcher: ["/app/:path*", "/connect/:path*", "/portal/:path*", "/master/:path*", "/login", "/cadastro"],
}
