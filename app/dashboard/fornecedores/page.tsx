import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/dashboard/header"
import { FornecedoresClient } from "@/components/fornecedores/fornecedores-client"
import { redirect } from "next/navigation"

export default async function FornecedoresPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // First check if user is a funcionario
  const { data: funcionario } = await supabase
    .from("funcionarios")
    .select("empresa_id")
    .eq("user_id", user.id)
    .maybeSingle()

  let empresaId = funcionario?.empresa_id

  // If not a funcionario, check if user owns an empresa
  if (!empresaId) {
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
    empresaId = empresa?.id
  }

  // If still no empresaId, user has no access - show empty state instead of redirect loop
  if (!empresaId) {
    return (
      <div>
        <Header title="Fornecedores" subtitle="Gestão de fornecedores e catálogo de produtos" />
        <div className="p-6 text-center text-muted-foreground">
          Nenhuma empresa associada. Configure a sua empresa primeiro.
        </div>
      </div>
    )
  }

  let fornecedoresRes, produtosRes, fornecedorProdutosRes
  try {
    [fornecedoresRes, produtosRes] = await Promise.all([
      supabase.from("fornecedores").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      supabase.from("produtos").select("id, nome, preco, custo_unitario").eq("empresa_id", empresaId).order("nome"),
    ])

    // Get fornecedor_produtos separately - may be empty if table was just created
    fornecedorProdutosRes = await supabase.from("fornecedor_produtos").select("*").eq("empresa_id", empresaId)
  } catch (error) {
    console.error("[v0] Error fetching fornecedores data:", error)
    fornecedoresRes = { data: [] }
    produtosRes = { data: [] }
    fornecedorProdutosRes = { data: [] }
  }

  return (
    <div>
      <Header title="Fornecedores" subtitle="Gestão de fornecedores e catálogo de produtos" />
      <FornecedoresClient 
        fornecedores={fornecedoresRes.data || []} 
        produtos={produtosRes.data || []}
        fornecedorProdutos={fornecedorProdutosRes.data || []}
        empresaId={empresaId}
      />
    </div>
  )
}
