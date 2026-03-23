import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/dashboard/header"
import { ConciliacaoClient } from "@/components/conciliacao/conciliacao-client"
import { hasModuleAccess } from "@/lib/check-permission"

export default async function ConciliacaoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Buscar o funcionario atual e seu empresa_id
  const { data: currentFuncionario } = await supabase
    .from("funcionarios")
    .select("nivel_acesso, empresa_id, permissoes")
    .eq("user_id", user.id)
    .maybeSingle()

  // Também verificar se é dono da empresa
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  const empresaId = currentFuncionario?.empresa_id || empresa?.id
  const isEmpresaOwner = !!empresa

  // Verificar permissao de acesso ao modulo conciliacao
  if (!hasModuleAccess(currentFuncionario, isEmpresaOwner, "conciliacao")) {
    redirect("/dashboard")
  }

  if (!empresaId) {
    redirect("/dashboard")
  }

  // Buscar contas bancárias
  const { data: contasBancarias } = await supabase
    .from("contas_bancarias")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("ativa", true)
    .order("nome", { ascending: true })

  // Buscar movimentos bancários (filtrando pelos IDs das contas da empresa)
  const contaIds = contasBancarias?.map(c => c.id) || []
  const { data: movimentos } = contaIds.length > 0 
    ? await supabase
        .from("movimentos_bancarios")
        .select(`
          *,
          conta_bancaria:contas_bancarias(*)
        `)
        .in("conta_bancaria_id", contaIds)
        .order("data", { ascending: false })
        .limit(100)
    : { data: [] }

  // Buscar fechos mensais
  const { data: fechosMensais } = await supabase
    .from("fechos_mensais")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })

  // Buscar facturas emitidas (para o fecho mensal automático)
  const { data: facturas } = await supabase
    .from("facturas")
    .select("id, numero_documento, numero, tipo_documento, total, iva, estado, created_at")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false })

  // Buscar recibos emitidos
  const { data: recibos } = await supabase
    .from("recibos")
    .select("id, numero_recibo, valor, created_at, conta_bancaria_id")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false })

  // Buscar despesas
  const { data: despesas } = await supabase
    .from("despesas")
    .select("id, descricao, valor, iva_suportado, data, estado, conta_bancaria_id")
    .eq("empresa_id", empresaId)
    .order("data", { ascending: false })

  // Buscar pagamentos de salários
  const { data: pagamentosSalarios } = await supabase
    .from("pagamentos_salarios")
    .select("id, valor_liquido, data_pagamento, estado, conta_bancaria_id")
    .eq("empresa_id", empresaId)
    .order("data_pagamento", { ascending: false })

  return (
    <div>
      <Header title="Conciliação e Fecho" subtitle="Gestão de contas bancárias, movimentos e fecho mensal" />
      <ConciliacaoClient
        contasBancarias={contasBancarias || []}
        movimentos={movimentos || []}
        fechosMensais={fechosMensais || []}
        facturas={facturas || []}
        recibos={recibos || []}
        despesas={despesas || []}
        pagamentosSalarios={pagamentosSalarios || []}
        empresaId={empresaId}
      />
    </div>
  )
}
