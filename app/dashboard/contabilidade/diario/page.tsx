import { createClient } from "@/lib/supabase/server"
import { DiarioClient } from "@/components/contabilidade/diario-client"

export const metadata = {
  title: "Diário Contabilístico | JobRamos",
  description: "Visualização do diário de lançamentos contabilísticos",
}

export default async function DiarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Buscar empresa do utilizador (mesma lógica das outras páginas)
  const { data: funcionario } = await supabase
    .from("funcionarios")
    .select("id, nome, empresa_id")
    .eq("user_id", user?.id)
    .maybeSingle()

  let empresaId = funcionario?.empresa_id
  if (!empresaId) {
    const { data: emp } = await supabase
      .from("empresas")
      .select("id")
      .eq("user_id", user?.id)
      .maybeSingle()
    empresaId = emp?.id
  }

  // Buscar lançamentos com linhas
  const { data: lancamentos } = empresaId
    ? await supabase
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
        .eq("empresa_id", empresaId)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] }

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
      empresaId={empresaId || ""}
    />
  )
}
