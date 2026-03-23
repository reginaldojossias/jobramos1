import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/dashboard/header"
import { RelatoriosClient } from "@/components/relatorios/relatorios-client"
import { hasModuleAccess } from "@/lib/check-permission"

export default async function RelatoriosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: currentFuncionario } = await supabase
    .from("funcionarios")
    .select("nivel_acesso, empresa_id, permissoes")
    .eq("user_id", user.id)
    .maybeSingle()

  // Verificar se e dono da empresa
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  const isEmpresaOwner = !!empresa

  // Verificar permissao de acesso ao modulo relatorios
  if (!hasModuleAccess(currentFuncionario, isEmpresaOwner, "relatorios")) {
    redirect("/dashboard")
  }

  let empresaId = currentFuncionario?.empresa_id || empresa?.id

const [
  facturasRes,
  despesasRes,
  recibosRes,
  clientesRes,
  fornecedoresRes,
  produtosRes,
  empresaRes,
  auditRes,
  folhaSalariosRes,
] = await Promise.all([
    supabase
      .from("facturas")
      .select("id, numero, numero_documento, tipo_documento, total, subtotal, iva, estado, data, cliente_id, factura_origem_id, clientes(nome)")
      .order("data", { ascending: false }),
    supabase
      .from("despesas")
      .select("id, descricao, valor, iva_suportado, data, categoria, estado, fornecedor_id, fornecedores:fornecedor_id(nome)")
      .order("data", { ascending: false }),
    supabase
      .from("recibos")
      .select("id, numero_recibo, valor, factura_id, data_emissao, forma_pagamento, clientes:cliente_id(nome)")
      .order("data_emissao", { ascending: false }),
    supabase.from("clientes").select("id, nome, nuit, telefone, email"),
    supabase.from("fornecedores").select("id, nome, nuit, telefone"),
    supabase.from("produtos").select("id, nome, preco, stock"),
    empresaId
      ? supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle()
      : Promise.resolve({ data: null }),
supabase
  .from("audit_logs")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(100),
  // Buscar folha de salarios para incluir na DRE
  empresaId
    ? supabase.from("folha_salarios").select("id, mes, ano, estado, total_rendimentos").eq("empresa_id", empresaId)
    : Promise.resolve({ data: [] }),
])

  return (
    <div>
      <Header title="Relatorios" subtitle="Analise financeira e contabilistica" />
<RelatoriosClient
  facturas={facturasRes.data || []}
  despesas={despesasRes.data || []}
  recibos={recibosRes.data || []}
  clientes={clientesRes.data || []}
  fornecedores={fornecedoresRes.data || []}
  produtos={produtosRes.data || []}
  empresa={empresaRes.data}
  auditLogs={auditRes.data || []}
  folhaSalarios={folhaSalariosRes.data || []}
/>
    </div>
  )
}
