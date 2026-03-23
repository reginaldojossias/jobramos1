"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { logLogout } from "@/lib/audit-log"
import type { Permissoes, PermissionLevel } from "@/components/funcionarios/permissions-editor"
import {
  Home,
  FileText,
  FileSpreadsheet,
  Users,
  Package,
  Truck,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  Mail,
  ScrollText,
  Send,
  Receipt,
  Wallet,
  Banknote,
  Calculator,
  Activity,
} from "lucide-react"

interface MenuItem {
  href: string
  label: string
  icon: any
  permissionKey?: keyof Permissoes
}

const menuItems: MenuItem[] = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/facturas", label: "Facturas", icon: FileText, permissionKey: "facturas" },
  { href: "/dashboard/recibos", label: "Recibos", icon: Receipt, permissionKey: "recibos" },
  { href: "/dashboard/despesas", label: "Despesas", icon: Wallet, permissionKey: "despesas" },
  { href: "/dashboard/cotacoes", label: "Cotacoes", icon: FileSpreadsheet, permissionKey: "cotacoes" },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, permissionKey: "clientes" },
  { href: "/dashboard/produtos", label: "Produtos", icon: Package, permissionKey: "produtos" },
  { href: "/dashboard/fornecedores", label: "Fornecedores", icon: Truck, permissionKey: "fornecedores" },
  { href: "/dashboard/cartas", label: "Cartas", icon: ScrollText, permissionKey: "cartas" },
  { href: "/dashboard/emails", label: "Emails Enviados", icon: Send },
]

const adminMenuItems: MenuItem[] = [
  { href: "/dashboard/funcionarios", label: "Funcionarios", icon: UserCog, permissionKey: "funcionarios" },
  { href: "/dashboard/salarios", label: "Salarios", icon: Banknote, permissionKey: "salarios" },
  { href: "/dashboard/conciliacao", label: "Conciliacao", icon: Calculator, permissionKey: "conciliacao" },
  { href: "/dashboard/relatorios", label: "Relatorios", icon: BarChart3, permissionKey: "relatorios" },
  { href: "/dashboard/logs", label: "Logs Actividade", icon: Activity, permissionKey: "logs" },
  { href: "/dashboard/configuracoes", label: "Configuracoes", icon: Settings, permissionKey: "configuracoes" },
]

const DEFAULT_PERMISSOES: Permissoes = {
  facturas: "editar",
  recibos: "editar",
  despesas: "editar",
  cotacoes: "editar",
  clientes: "editar",
  produtos: "editar",
  fornecedores: "editar",
  cartas: "editar",
  funcionarios: "sem_acesso",
  salarios: "sem_acesso",
  conciliacao: "sem_acesso",
  relatorios: "visualizar",
  logs: "sem_acesso",
  configuracoes: "sem_acesso",
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [permissoes, setPermissoes] = useState<Permissoes>(DEFAULT_PERMISSOES)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          // Check if user owns the empresa (owner has full access)
          const { data: empresa } = await supabase
            .from("empresas")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle()

          if (empresa) {
            // User is the owner - full admin access
            setIsAdmin(true)
            setPermissoes({
              facturas: "editar",
              recibos: "editar",
              despesas: "editar",
              cotacoes: "editar",
              clientes: "editar",
              produtos: "editar",
              fornecedores: "editar",
              cartas: "editar",
              funcionarios: "editar",
              salarios: "editar",
              conciliacao: "editar",
              relatorios: "editar",
              logs: "editar",
              configuracoes: "editar",
            })
          } else {
            // Check funcionario permissions
            const { data: funcionario } = await supabase
              .from("funcionarios")
              .select("nivel_acesso, permissoes")
              .eq("user_id", user.id)
              .maybeSingle()

            if (funcionario) {
              const isAdminUser = funcionario.nivel_acesso === "admin"
              setIsAdmin(isAdminUser)
              
              if (isAdminUser) {
                // Admin has full access
                setPermissoes({
                  facturas: "editar",
                  recibos: "editar",
                  despesas: "editar",
                  cotacoes: "editar",
                  clientes: "editar",
                  produtos: "editar",
                  fornecedores: "editar",
                  cartas: "editar",
                  funcionarios: "editar",
                  salarios: "editar",
                  conciliacao: "editar",
                  relatorios: "editar",
                  logs: "editar",
                  configuracoes: "editar",
                })
              } else if (funcionario.permissoes) {
                // Use custom permissions
                setPermissoes(funcionario.permissoes as Permissoes)
              }
            }
          }
        }
      } catch (error) {
        console.error("[v0] Erro ao verificar permissoes:", error)
      } finally {
        setIsLoaded(true)
      }
    }

    checkPermissions()
  }, [])

  const handleLogout = async () => {
    await logLogout()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Filter menu items based on permissions
  const filterByPermissions = (items: MenuItem[]) => {
    return items.filter(item => {
      // Items without permissionKey are always visible (like Home, Emails)
      if (!item.permissionKey) return true
      
      // Check if user has at least "visualizar" permission
      const permission = permissoes[item.permissionKey]
      return permission === "visualizar" || permission === "editar"
    })
  }

  const visibleMenuItems = filterByPermissions(menuItems)
  const visibleAdminItems = filterByPermissions(adminMenuItems)
  
  // Only show admin section if user has access to at least one admin item
  const showAdminSection = visibleAdminItems.length > 0

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-muted p-4">
        <Image src="/images/logo.png" alt="Magic Pro Services" width={40} height={40} className="h-10 w-10 object-contain" />
        <div>
          <h1 className="font-semibold leading-tight">Magic Pro</h1>
          <p className="text-xs text-sidebar-foreground/60">Services</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 p-3">
        {visibleMenuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-muted text-sidebar-accent"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
        
        {/* Admin Section Divider */}
        {showAdminSection && (
          <>
            <div className="my-2 border-t border-sidebar-muted" />
            <p className="px-3 py-1 text-xs font-medium text-sidebar-foreground/40 uppercase tracking-wider">
              Administracao
            </p>
            {visibleAdminItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-muted text-sidebar-accent"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-muted p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-muted hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair do Sistema
        </button>
        <p className="mt-2 px-3 text-xs text-sidebar-foreground/40">Magic Pro Services v1.0</p>
      </div>
    </aside>
  )
}

// Export function to check permissions from other components
export function usePermissions() {
  const [permissoes, setPermissoes] = useState<Permissoes | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Check if user owns the empresa
          const { data: empresa } = await supabase
            .from("empresas")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle()

          if (empresa) {
            setIsAdmin(true)
            setPermissoes({
              facturas: "editar",
              recibos: "editar",
              despesas: "editar",
              cotacoes: "editar",
              clientes: "editar",
              produtos: "editar",
              fornecedores: "editar",
              cartas: "editar",
              funcionarios: "editar",
              salarios: "editar",
              conciliacao: "editar",
              relatorios: "editar",
              logs: "editar",
              configuracoes: "editar",
            })
          } else {
            const { data: funcionario } = await supabase
              .from("funcionarios")
              .select("nivel_acesso, permissoes")
              .eq("user_id", user.id)
              .maybeSingle()

            if (funcionario) {
              setIsAdmin(funcionario.nivel_acesso === "admin")
              setPermissoes(funcionario.permissoes as Permissoes || DEFAULT_PERMISSOES)
            }
          }
        }
      } catch (error) {
        console.error("[v0] Error loading permissions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPermissions()
  }, [])

  const canView = (module: keyof Permissoes): boolean => {
    if (isAdmin) return true
    if (!permissoes) return false
    const level = permissoes[module]
    return level === "visualizar" || level === "editar"
  }

  const canEdit = (module: keyof Permissoes): boolean => {
    if (isAdmin) return true
    if (!permissoes) return false
    return permissoes[module] === "editar"
  }

  return { permissoes, isAdmin, isLoading, canView, canEdit }
}
