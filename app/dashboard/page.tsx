import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/dashboard/header"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: funcionarioLogado } = await supabase
    .from("funcionarios")
    .select("empresa_id")
    .eq("user_id", user?.id)
    .maybeSingle()

  let empresaId = funcionarioLogado?.empresa_id
  if (!empresaId) {
    const { data: empresaDono } = await supabase
      .from("empresas")
      .select("id")
      .eq("user_id", user?.id)
      .maybeSingle()
    empresaId = empresaDono?.id
  }

  const [
    facturasRes,
    clientesRes,
    produtosRes,
    empresaRes,
    recibosRes,
    despesasRes,
    facturasRecentesRes,
    cotacoesRecentesRes,
  ] = await Promise.all([
    supabase.from("facturas").select("id, total, estado, tipo_documento, data, subtotal, iva, factura_origem_id"),
    supabase.from("clientes").select("id"),
    supabase.from("produtos").select("id, nome, stock"),
    empresaId
      ? supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("recibos").select("valor, data_emissao"),
    supabase.from("despesas").select("valor, data, estado, iva_suportado, categoria"),
    supabase
      .from("facturas")
      .select("id, numero, numero_documento, tipo_documento, data, total, estado, clientes(nome)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("cotacoes")
      .select("id, numero, data, total, clientes(nome)")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const facturas = facturasRes.data || []
  const clientes = clientesRes.data || []
  const produtos = produtosRes.data || []
  const empresa = empresaRes.data
  const recibos = recibosRes.data || []
  const despesasAll = despesasRes.data || []
  const facturasRecentes = facturasRecentesRes.data || []
  const cotacoesRecentes = cotacoesRecentesRes.data || []

  // KPIs
  const facturasFT = facturas.filter((f) => !f.tipo_documento || f.tipo_documento === "FT")
  const facturasNC = facturas.filter((f) => f.tipo_documento === "NC")

  const totalFacturado = facturasFT.reduce((acc, f) => acc + (Number(f.total) || 0), 0)
  const totalNC = facturasNC.reduce((acc, f) => acc + (Number(f.total) || 0), 0)
  const receitaLiquida = totalFacturado - totalNC

  const facturasPagas = facturasFT.filter((f) => f.estado === "Pago" || f.estado === "Paga")
  const facturasPendentes = facturasFT.filter((f) => f.estado === "Pendente" || f.estado === "Parcialmente Pago")

  // Usar recibos reais para calcular o total pago
  const totalPago = recibos.reduce((acc, r) => acc + (Number(r.valor) || 0), 0)

  // Total pendente = total facturado - total recebido (recibos) - total NCs
  const totalPendente = Math.max(0, totalFacturado - totalPago - totalNC)

  // Despesas
  const despesasPagas = despesasAll.filter((d) => d.estado === "Pago" || !d.estado)
  const totalDespesas = despesasPagas.reduce((acc, d) => acc + (Number(d.valor) || 0), 0)
  const despesasPendentes = despesasAll.filter((d) => d.estado === "Pendente")
  const totalDespesasPendentes = despesasPendentes.reduce((acc, d) => acc + (Number(d.valor) || 0), 0)
  const ivaSuportado = despesasAll.reduce((acc, d) => acc + (Number(d.iva_suportado) || 0), 0)

  // Lucro = Receita Liquida - Despesas Pagas
  const lucro = receitaLiquida - totalDespesas
  const margemLucro = receitaLiquida > 0 ? (lucro / receitaLiquida) * 100 : 0

  // IVA
  const totalIVA = facturasFT.reduce((acc, f) => acc + (Number(f.iva) || 0), 0)
  const ivaNC = facturasNC.reduce((acc, f) => acc + (Number(f.iva) || 0), 0)
  const ivaAEntregar = Math.max(0, totalIVA - ivaNC - ivaSuportado)

  // Receita, Despesas e Fluxo de Caixa por mes (ultimos 6 meses)
  const hoje = new Date()
  const receitaPorMes: Array<{ mes: string; receita: number; despesas: number; notas_credito: number; lucro: number; entradas: number; saidas: number; fluxo: number }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const mesLabel = d.toLocaleDateString("pt-PT", { month: "short", year: "2-digit" })
    const ano = d.getFullYear()
    const mes = d.getMonth()

    const receitaMes = facturasFT
      .filter((f) => {
        const fd = new Date(f.data)
        return fd.getFullYear() === ano && fd.getMonth() === mes
      })
      .reduce((acc, f) => acc + (Number(f.total) || 0), 0)

    const ncMes = facturasNC
      .filter((f) => {
        const fd = new Date(f.data)
        return fd.getFullYear() === ano && fd.getMonth() === mes
      })
      .reduce((acc, f) => acc + (Number(f.total) || 0), 0)

    const despesasMes = despesasPagas
      .filter((dp) => {
        const dd = new Date(dp.data)
        return dd.getFullYear() === ano && dd.getMonth() === mes
      })
      .reduce((acc, dp) => acc + (Number(dp.valor) || 0), 0)

    // Fluxo de caixa: entradas reais (recibos) e saidas reais (despesas pagas)
    const entradasMes = recibos
      .filter((r) => {
        const rd = new Date(r.data_emissao)
        return rd.getFullYear() === ano && rd.getMonth() === mes
      })
      .reduce((acc, r) => acc + (Number(r.valor) || 0), 0)

    const saidasMes = despesasMes
    const lucroMes = receitaMes - ncMes - despesasMes
    const fluxoMes = entradasMes - saidasMes

    receitaPorMes.push({ mes: mesLabel, receita: receitaMes, despesas: despesasMes, notas_credito: ncMes, lucro: lucroMes, entradas: entradasMes, saidas: saidasMes, fluxo: fluxoMes })
  }

  // Stock baixo (< 5 unidades)
  const stockBaixo = produtos.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) < 5)

  // Actividades recentes
  const actividades = [
    ...facturasRecentes.map((f: any) => ({
      id: f.id,
      tipo: f.tipo_documento || "FT",
      numero: f.numero_documento || f.numero || "-",
      data: f.data,
      total: f.total,
      estado: f.estado,
      cliente: f.clientes?.nome || "N/A",
    })),
    ...cotacoesRecentes.map((c: any) => ({
      id: c.id,
      tipo: "COT",
      numero: c.numero || "-",
      data: c.data,
      total: c.total,
      estado: null,
      cliente: c.clientes?.nome || "N/A",
    })),
  ]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 8)

  const nomeEmpresa = empresa?.nome || "A Sua Empresa"

  return (
    <div>
      <Header title="Dashboard" subtitle="Visao geral do sistema" />
      <DashboardClient
        nomeEmpresa={nomeEmpresa}
        empresa={empresa}
        totalFacturado={totalFacturado}
        receitaLiquida={receitaLiquida}
        totalPago={totalPago}
        totalPendente={totalPendente}
        totalDespesas={totalDespesas}
        totalDespesasPendentes={totalDespesasPendentes}
        lucro={lucro}
        margemLucro={margemLucro}
        ivaAEntregar={ivaAEntregar}
        ivaSuportado={ivaSuportado}
        totalClientes={clientes.length}
        totalProdutos={produtos.length}
        facturasPagas={facturasPagas.length}
        facturasPendentes={facturasPendentes.length}
        totalFacturas={facturasFT.length}
        receitaPorMes={receitaPorMes}
        stockBaixo={stockBaixo}
        actividades={actividades}
      />
    </div>
  )
}
