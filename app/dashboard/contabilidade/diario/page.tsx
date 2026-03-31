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

  // Buscar lançamentos com linhas (usando relação com plano_contas via conta_id)
  const { data: lancamentos } = empresaId
    ? await supabase
        .from("lancamentos")
        .select(`
          *,
          lancamento_linhas (
            id,
            conta_id,
            descricao,
            debito,
            credito,
            plano_contas (
              codigo,
              nome
            )
          )
        `)
        .eq("empresa_id", empresaId)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] }

  // Transformar dados para o formato esperado pelo componente
  const lancamentosFormatados = (lancamentos || []).map((l: any) => ({
    ...l,
    lancamento_linhas: (l.lancamento_linhas || []).map((linha: any) => ({
      ...linha,
      conta_codigo: linha.plano_contas?.codigo || "",
      conta_nome: linha.plano_contas?.nome || "",
    }))
  }))

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
      lancamentos={lancamentosFormatados} 
      contasMap={contasMap}
      empresaId={empresaId || ""}
    />
  )
}
