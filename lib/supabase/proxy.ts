import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Validar variáveis de ambiente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Supabase environment variables not configured:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
    })
    
    // Permitir acesso apenas à página de login/registro sem auth
    if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/registar" || request.nextUrl.pathname === "/") {
      return supabaseResponse
    }
    
    // Redirecionar para login se tentar acessar área protegida
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Proteger rotas do dashboard
  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (request.nextUrl.pathname.startsWith("/dashboard") && user) {
    const { data: funcionario } = await supabase
      .from("funcionarios")
      .select("estado")
      .eq("user_id", user.id)
      .maybeSingle()

    // Se funcionário está inativo ou não existe, fazer logout e redirecionar
    if (!funcionario || funcionario.estado === "inativo") {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("error", "conta_inativa")

      const response = NextResponse.redirect(url)

      // Remover cookies do Supabase para forçar logout
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith("sb-")) {
          response.cookies.delete(cookie.name)
        }
      })

      return response
    }

    // Se funcionário está pendente, redirecionar para página de espera
    if (funcionario.estado === "pendente") {
      const url = request.nextUrl.clone()
      url.pathname = "/pendente"
      return NextResponse.redirect(url)
    }
  }

  // Redirecionar utilizadores autenticados do login para dashboard
  if ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/registar") && user) {
    const { data: funcionario } = await supabase
      .from("funcionarios")
      .select("estado")
      .eq("user_id", user.id)
      .maybeSingle()

    if (funcionario?.estado === "ativo") {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    } else if (funcionario?.estado === "pendente") {
      const url = request.nextUrl.clone()
      url.pathname = "/pendente"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
