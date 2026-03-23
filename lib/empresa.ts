import { createClient } from "@/lib/supabase/client"

/**
 * Obtém o empresa_id do funcionário logado
 * Usa a função RPC do banco de dados que tem SECURITY DEFINER
 * Retorna null se não encontrar
 */
export async function getUserEmpresaId(): Promise<string | null> {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) return null

  // Usa a função RPC do banco que tem SECURITY DEFINER
  const { data: empresaId, error } = await supabase.rpc("get_user_empresa_id")

  if (error) {
    console.error("[v0] Erro ao obter empresa_id via RPC:", error)
    
    // Fallback: tenta buscar diretamente da tabela empresas (para donos)
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("user_id", user.id)
      .single()

    return empresa?.id || null
  }

  return empresaId || null
}
