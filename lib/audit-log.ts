"use client"

import { createClient } from "@/lib/supabase/client"

export type AcaoTipo = 
  | "login" 
  | "logout" 
  | "criar" 
  | "editar" 
  | "eliminar" 
  | "visualizar"
  | "emitir"
  | "anular"
  | "pagar"
  | "enviar_email"

export interface LogOptions {
  tabela: string
  acao: AcaoTipo
  registoId?: string
  descricao: string
  dadosAnteriores?: Record<string, any>
  dadosNovos?: Record<string, any>
  camposAlterados?: string[]
}

export async function registarLog(options: LogOptions) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get empresa_id (try funcionario first, then empresa)
    let empresaId: string | null = null
    let userNome = user.email || "Utilizador"

    const { data: funcionario } = await supabase
      .from("funcionarios")
      .select("empresa_id, nome")
      .eq("user_id", user.id)
      .maybeSingle()

    if (funcionario) {
      empresaId = funcionario.empresa_id
      userNome = funcionario.nome
    } else {
      const { data: empresa } = await supabase
        .from("empresas")
        .select("id, nome")
        .eq("user_id", user.id)
        .maybeSingle()
      
      if (empresa) {
        empresaId = empresa.id
        userNome = empresa.nome + " (Admin)"
      }
    }

    if (!empresaId) return

    // Insert audit log
    await supabase.from("audit_logs").insert({
      empresa_id: empresaId,
      user_id: user.id,
      user_email: user.email,
      user_nome: userNome,
      tabela: options.tabela,
      acao: options.acao,
      registro_id: options.registoId || null,
      descricao: options.descricao,
      dados_anteriores: options.dadosAnteriores || null,
      dados_novos: options.dadosNovos || null,
      campos_alterados: options.camposAlterados || null,
    })
  } catch (error) {
    console.error("[v0] Error registering audit log:", error)
  }
}

// Helper functions for common actions
export const logLogin = () => registarLog({
  tabela: "auth",
  acao: "login",
  descricao: "Utilizador entrou no sistema"
})

export const logLogout = () => registarLog({
  tabela: "auth",
  acao: "logout",
  descricao: "Utilizador saiu do sistema"
})

export const logCriar = (tabela: string, registoId: string, descricao: string, dados?: Record<string, any>) => 
  registarLog({
    tabela,
    acao: "criar",
    registoId,
    descricao,
    dadosNovos: dados
  })

export const logEditar = (
  tabela: string, 
  registoId: string, 
  descricao: string, 
  dadosAnteriores?: Record<string, any>,
  dadosNovos?: Record<string, any>,
  camposAlterados?: string[]
) => registarLog({
    tabela,
    acao: "editar",
    registoId,
    descricao,
    dadosAnteriores,
    dadosNovos,
    camposAlterados
  })

export const logEliminar = (tabela: string, registoId: string, descricao: string, dadosAnteriores?: Record<string, any>) => 
  registarLog({
    tabela,
    acao: "eliminar",
    registoId,
    descricao,
    dadosAnteriores
  })

export const logEmitir = (tabela: string, registoId: string, descricao: string, dados?: Record<string, any>) => 
  registarLog({
    tabela,
    acao: "emitir",
    registoId,
    descricao,
    dadosNovos: dados
  })

export const logAnular = (tabela: string, registoId: string, descricao: string) => 
  registarLog({
    tabela,
    acao: "anular",
    registoId,
    descricao
  })

export const logEnviarEmail = (descricao: string, dados?: Record<string, any>) => 
  registarLog({
    tabela: "emails_enviados",
    acao: "enviar_email",
    descricao,
    dadosNovos: dados
  })
