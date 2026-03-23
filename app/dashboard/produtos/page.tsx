import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/dashboard/header"
import { ProdutosClient } from "@/components/produtos/produtos-client"
import { redirect } from "next/navigation"

export default async function ProdutosPage() {
  const supabase = await createClient()

  // Get user and empresa (same logic as dashboard/facturas pages)
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
        <Header title="Produtos" subtitle="Gestão de produtos, stock e inventário" />
        <div className="p-6 text-center text-muted-foreground">
          Nenhuma empresa associada. Configure a sua empresa primeiro.
        </div>
      </div>
    )
  }

  // Get all data in parallel with error handling
  let produtosRes, fornecedoresRes, movimentosRes, facturasRes
  try {
    [produtosRes, fornecedoresRes, movimentosRes, facturasRes] = await Promise.all([
      supabase.from("produtos").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      supabase.from("fornecedores").select("id, nome").eq("empresa_id", empresaId).order("nome"),
      supabase.from("movimentos_stock").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      supabase.from("facturas").select("id, tipo_documento, estado").eq("empresa_id", empresaId),
    ])
  } catch (error) {
    console.error("[v0] Error fetching produtos data:", error)
    // Return empty data if queries fail
    produtosRes = { data: [] }
    fornecedoresRes = { data: [] }
    movimentosRes = { data: [] }
    facturasRes = { data: [] }
  }

  // Get factura_itens separately to avoid join issues
  const facturaIds = (facturasRes.data || []).map(f => f.id)
  const facturasItensRes = facturaIds.length > 0 
    ? await supabase.from("factura_itens").select("produto_id, quantidade, factura_id").in("factura_id", facturaIds)
    : { data: [] }
  
  // Map factura info to items
  const facturasMap = (facturasRes.data || []).reduce((acc: Record<string, any>, f) => {
    acc[f.id] = f
    return acc
  }, {})

  // Calculate statistics per product
  const produtosComStats = (produtosRes.data || []).map(produto => {
    const movsProduto = (movimentosRes.data || []).filter(m => m.produto_id === produto.id)
    const entradas = movsProduto.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.quantidade, 0)
    const saidasManuais = movsProduto.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.quantidade, 0)
    
    // Sales from invoices (FT) - exclude cancelled
    const vendasFacturas = (facturasItensRes.data || [])
      .filter((fi: any) => {
        const factura = facturasMap[fi.factura_id]
        return fi.produto_id === produto.id && 
          factura?.tipo_documento === 'FT' &&
          factura?.estado !== 'Anulada'
      })
      .reduce((acc: number, fi: any) => acc + (Number(fi.quantidade) || 0), 0)

    // Returns from credit notes (NC)
    const devolucoes = (facturasItensRes.data || [])
      .filter((fi: any) => {
        const factura = facturasMap[fi.factura_id]
        return fi.produto_id === produto.id && 
          factura?.tipo_documento === 'NC'
      })
      .reduce((acc: number, fi: any) => acc + (Number(fi.quantidade) || 0), 0)

    const totalVendido = vendasFacturas - devolucoes + saidasManuais
    const margemLucro = produto.custo_unitario && produto.preco 
      ? ((produto.preco - produto.custo_unitario) / produto.custo_unitario * 100)
      : null

    // Find main supplier from movements
    const fornecedoresMov = movsProduto
      .filter(m => m.tipo === 'entrada' && m.fornecedor_id)
      .reduce((acc: Record<string, number>, m) => {
        acc[m.fornecedor_id] = (acc[m.fornecedor_id] || 0) + m.quantidade
        return acc
      }, {})
    
    const fornecedorPrincipalId = Object.entries(fornecedoresMov)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0]
    
    const fornecedorPrincipal = (fornecedoresRes.data || []).find(f => f.id === fornecedorPrincipalId)

    return {
      ...produto,
      total_entradas: entradas,
      total_vendido: totalVendido,
      margem_lucro: margemLucro,
      fornecedor_principal: fornecedorPrincipal?.nome || null,
      movimentos: movsProduto,
    }
  })

  return (
    <div>
      <Header title="Produtos" subtitle="Gestão de produtos, stock e inventário" />
      <ProdutosClient 
        produtos={produtosComStats} 
        fornecedores={fornecedoresRes.data || []}
        empresaId={empresaId}
      />
    </div>
  )
}
