import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/dashboard/header"
import { CotacoesClient } from "@/components/cotacoes/cotacoes-client"

export default async function CotacoesPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get funcionario_id for the logged-in user
  const { data: funcionario } = await supabase
    .from("funcionarios")
    .select("id, nome")
    .eq("user_id", user?.id)
    .single()

  const { data: cotacoes } = await supabase
    .from("cotacoes")
    .select(`
      *,
      clientes(nome),
      funcionarios:criado_por_funcionario_id(nome)
    `)
    .order("created_at", { ascending: false })

  const { data: clientes } = await supabase.from("clientes").select("id, nome")
  const { data: produtos } = await supabase.from("produtos").select("*")

  return (
    <div>
      <Header title="Cotações" subtitle="Gestão de cotações" />
      <CotacoesClient 
        cotacoes={cotacoes || []} 
        clientes={clientes || []} 
        produtos={produtos || []}
        funcionarioId={funcionario?.id || null}
      />
    </div>
  )
}
