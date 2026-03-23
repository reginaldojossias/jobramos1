import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/dashboard/header"
import { RecibosClient } from "@/components/recibos/recibos-client"

export default async function RecibosPage() {
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

  const [recibosRes, facturasRes, clientesRes, empresaRes, ncRes, contasBancariasRes] = await Promise.all([
    supabase
      .from("recibos")
      .select(`*, clientes(nome, nuit, endereco, telefone, email), facturas:factura_id(numero_documento, numero, total), conta_bancaria:conta_bancaria_id(id, nome, banco)`)
      .order("created_at", { ascending: false }),
    supabase
      .from("facturas")
      .select("id, numero_documento, numero, total, estado, cliente_id, clientes(nome)")
      .eq("tipo_documento", "FT")
      .in("estado", ["Pendente", "Parcialmente Pago", "Parcialmente Creditada", "Creditada Apos Pagamento"])
      .order("created_at", { ascending: false }),
    supabase.from("clientes").select("id, nome, nuit, endereco, telefone, email"),
    empresaId
      ? supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle()
      : Promise.resolve({ data: null }),
    // Buscar NCs para descontar do saldo das facturas
    supabase
      .from("facturas")
      .select("factura_origem_id, total")
      .eq("tipo_documento", "NC"),
    // Buscar contas bancárias para rastreio
    empresaId
      ? supabase.from("contas_bancarias").select("id, nome, banco, numero_conta").eq("empresa_id", empresaId).eq("ativa", true).order("nome")
      : Promise.resolve({ data: [] }),
  ])

  // Calcular total de NCs por factura de origem
  const ncPorFactura: Record<string, number> = {}
  for (const nc of ncRes.data || []) {
    if (nc.factura_origem_id) {
      ncPorFactura[nc.factura_origem_id] = (ncPorFactura[nc.factura_origem_id] || 0) + (Number(nc.total) || 0)
    }
  }

  // Calcular o total ja pago (recibos) para cada factura
  const recibos = recibosRes.data || []
  const recebidoPorFactura: Record<string, number> = {}
  for (const r of recibos) {
    if (r.factura_id) {
      recebidoPorFactura[r.factura_id] = (recebidoPorFactura[r.factura_id] || 0) + (Number(r.valor) || 0)
    }
  }

  // Saldo = Total da factura - NCs emitidas - Recibos ja pagos
  const facturasComSaldo = (facturasRes.data || []).map((f) => {
    const totalNC = ncPorFactura[f.id] || 0
    const jaRecebido = recebidoPorFactura[f.id] || 0
    const saldoReal = (Number(f.total) || 0) - totalNC - jaRecebido
    return {
      ...f,
      total_nc: totalNC,
      ja_recebido: jaRecebido,
      saldo: Math.max(0, saldoReal),
    }
  }).filter((f) => f.saldo > 0.01) // so mostrar facturas com saldo em divida

  return (
    <div>
      <Header title="Recibos" subtitle="Emissao e gestao de recibos" />
      <RecibosClient
        recibos={recibos}
        facturasPendentes={facturasComSaldo}
        clientes={clientesRes.data || []}
        contasBancarias={contasBancariasRes.data || []}
        empresaId={empresaId || ""}
        empresa={empresaRes.data}
      />
    </div>
  )
}
