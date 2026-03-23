import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DespesasClient } from "@/components/despesas/despesas-client"

export default async function DespesasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Obter empresa_id
  const { data: funcionario } = await supabase
    .from("funcionarios")
    .select("id, empresa_id")
    .eq("user_id", user.id)
    .maybeSingle()

  let empresaId = funcionario?.empresa_id
  if (!empresaId) {
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
    empresaId = empresa?.id
  }

  const [despesasRes, fornecedoresRes, contasBancariasRes] = await Promise.all([
    supabase
      .from("despesas")
      .select(`*, fornecedores:fornecedor_id(nome), conta_bancaria:conta_bancaria_id(id, nome, banco)`)
      .order("data", { ascending: false }),
    supabase.from("fornecedores").select("id, nome, nuit, telefone"),
    empresaId
      ? supabase.from("contas_bancarias").select("id, nome, banco, numero_conta").eq("empresa_id", empresaId).eq("ativa", true).order("nome")
      : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="space-y-6">
      <DespesasClient
        despesas={despesasRes.data || []}
        fornecedores={fornecedoresRes.data || []}
        contasBancarias={contasBancariasRes.data || []}
        funcionarioId={funcionario?.id || null}
        empresaId={empresaId || ""}
      />
    </div>
  )
}
