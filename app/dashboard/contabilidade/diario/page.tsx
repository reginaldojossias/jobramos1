import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DiarioClient } from "@/components/contabilidade/diario-client"

export const metadata = {
  title: "Diário Contabilístico | JobRamos",
  description: "Visualização do diário de lançamentos contabilísticos",
}

export default async function DiarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect("/login")

  // Buscar empresa do utilizador
  const { data: perfil } = await supabase
    .from("perfis")
    .select("empresa_id")
    .eq("user_id", user.id)
    .single()

  if (!perfil?.empresa_id) redirect("/login")

  // Buscar lançamentos com linhas
  const { data: lancamentos } = await supabase
    .from("lancamentos")
    .select(`
      *,
      lancamento_linhas (
        id,
        conta_codigo,
        descricao,
        debito,
        credito,
        ordem
      )
    `)
    .eq("empresa_id", perfil.empresa_id)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100)

  // Buscar plano de contas para lookup
  const { data: planoContas } = await supabase
    .from("plano_contas")
    .select("codigo, nome")
    .eq("aceita_lancamentos", true)

  const contasMap = Object.fromEntries(
    (planoContas || []).map((c) => [c.codigo, c.nome])
  )

  return (
    <DiarioClient 
      lancamentos={lancamentos || []} 
      contasMap={contasMap}
      empresaId={perfil.empresa_id}
    />
  )
}
