import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/dashboard/header"
import { FacturasClient } from "@/components/facturas/facturas-client"

export default async function FacturasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  const [facturasRes, clientesRes, produtosRes, empresaRes, recibosRes, contasRes] = await Promise.all([
    supabase
      .from("facturas")
      .select(`
        *,
        clientes(nome, nuit, endereco, telefone, email),
        funcionarios:criado_por_funcionario_id(nome),
        factura_origem:factura_origem_id(numero_documento, numero)
      `)
      .order("created_at", { ascending: false }),
    supabase.from("clientes").select("id, nome, nuit, endereco, telefone, email"),
    supabase.from("produtos").select("*"),
    empresaId
      ? supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("recibos").select("factura_id, valor"),
    empresaId
      ? supabase.from("contas_bancarias").select("id, nome, banco, saldo_atual").eq("empresa_id", empresaId).eq("ativa", true)
      : Promise.resolve({ data: [] }),
  ])

  // Calcular total recebido por factura (recibos)
  const recebidoPorFactura: Record<string, number> = {}
  for (const r of recibosRes.data || []) {
    if (r.factura_id) {
      recebidoPorFactura[r.factura_id] = (recebidoPorFactura[r.factura_id] || 0) + (Number(r.valor) || 0)
    }
  }

  // Calcular total de NCs por factura de origem
  const ncPorFactura: Record<string, number> = {}
  for (const f of facturasRes.data || []) {
    if (f.tipo_documento === "NC" && f.factura_origem_id) {
      ncPorFactura[f.factura_origem_id] = (ncPorFactura[f.factura_origem_id] || 0) + (Number(f.total) || 0)
    }
  }

  return (
    <div>
      <Header title="Facturas" subtitle="Facturas, Notas de Credito e Notas de Debito" />
      <FacturasClient
        facturas={facturasRes.data || []}
        clientes={clientesRes.data || []}
        produtos={produtosRes.data || []}
        funcionarioId={funcionario?.id || null}
        empresaId={empresaId || ""}
        empresa={empresaRes.data}
        recebidoPorFactura={recebidoPorFactura}
        ncPorFactura={ncPorFactura}
        contasBancarias={contasRes.data || []}
      />
    </div>
  )
}
