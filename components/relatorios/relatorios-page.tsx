import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { RelatoriosClient } from "./relatorios-client"

export default async function RelatoriosPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Buscar empresa do utilizador
  const { data: empresa } = await supabase
    .from("empresas")
    .select("*")
    .eq("user_id", session.user.id)
    .single()

  if (!empresa) {
    redirect("/onboarding")
  }

  const empresaId = empresa.id

  // Carregar todos os dados necessários em paralelo
  const [
    { data: facturas },
    { data: despesas },
    { data: recibos },
    { data: clientes },
    { data: fornecedores },
    { data: produtos },
    { data: auditLogs },
    // FIX Bug #8: buscar folhas de salário pagas para incluir na DRE
    { data: folhaSalarios },
  ] = await Promise.all([
    supabase
      .from("facturas")
      .select("*, cliente:clientes(*), linhas:linhas_factura(*, produto:produtos(*))")
      .eq("empresa_id", empresaId)
      .order("data", { ascending: false }),

    supabase
      .from("despesas")
      .select("*, fornecedor:fornecedores(*)")
      .eq("empresa_id", empresaId)
      .order("data", { ascending: false }),

    supabase
      .from("recibos")
      .select("*, factura:facturas(*), cliente:clientes(*)")
      .eq("empresa_id", empresaId)
      .order("data_emissao", { ascending: false }),

    supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome"),

    supabase
      .from("fornecedores")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome"),

    supabase
      .from("produtos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome"),

    supabase
      .from("audit_logs")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(100),

    // FIX Bug #8: folhas de salário — todas (não só pagas) para que o componente possa filtrar
    supabase
      .from("folha_salarios")
      .select("*, funcionario:funcionarios(nome)")
      .eq("empresa_id", empresaId)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false }),
  ])

  return (
    <RelatoriosClient
      facturas={facturas || []}
      despesas={despesas || []}
      recibos={recibos || []}
      clientes={clientes || []}
      fornecedores={fornecedores || []}
      produtos={produtos || []}
      empresa={empresa}
      auditLogs={auditLogs || []}
      folhaSalarios={folhaSalarios || []}
    />
  )
}