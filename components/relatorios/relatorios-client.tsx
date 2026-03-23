"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  Receipt,
  Wallet,
  Calculator,
  BarChart3,
  Users,
  Clock,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { formatarMZN, formatarData, ESTADO_CORES } from "@/lib/documento-utils"

interface RelatoriosClientProps {
  facturas: any[]
  despesas: any[]
  recibos: any[]
  clientes: any[]
  fornecedores: any[]
  produtos: any[]
  empresa: any
  auditLogs: any[]
  // FIX #8: prop opcional — a DRE incluirá salários se este array for passado.
  // ATENÇÃO: o ficheiro relatorios/page.tsx também precisa de ser actualizado para
  // buscar folha_salarios da BD e passar aqui. Avise quando quiser fazer essa parte.
  folhaSalarios?: any[]
}

const CORES_GRAFICO = [
  "hsl(var(--primary))",
  "hsl(0 72% 51%)",
  "hsl(30 80% 55%)",
  "hsl(200 70% 50%)",
  "hsl(120 50% 45%)",
  "hsl(280 60% 55%)",
  "hsl(180 50% 45%)",
  "hsl(350 70% 55%)",
]

export function RelatoriosClient({
  facturas,
  despesas,
  recibos,
  clientes,
  fornecedores,
  produtos,
  empresa,
  auditLogs,
  folhaSalarios = [], // FIX #8: default array vazio — não quebra se não for passado
}: RelatoriosClientProps) {
  const [periodoResumo, setPeriodoResumo] = useState("ano")
  const [periodoIVA, setPeriodoIVA] = useState("trimestre")

  const hoje = new Date()
  const anoActual = hoje.getFullYear()

  // Helper: filtrar por periodo
  function filtrarPeriodo(items: any[], campo: string, periodo: string) {
    if (periodo === "todos") return items
    return items.filter((item) => {
      const d = new Date(item[campo])
      if (periodo === "mes") return d.getMonth() === hoje.getMonth() && d.getFullYear() === anoActual
      if (periodo === "trimestre") {
        const tresMeses = new Date(hoje)
        tresMeses.setMonth(tresMeses.getMonth() - 3)
        return d >= tresMeses
      }
      if (periodo === "ano") return d.getFullYear() === anoActual
      return true
    })
  }

  // ==========================================
  // TAB 1: RESUMO FINANCEIRO
  // ==========================================
  const facturasFiltradas = filtrarPeriodo(facturas, "data", periodoResumo)
  const despesasFiltradas = filtrarPeriodo(despesas, "data", periodoResumo)
  const recibosFiltrados = filtrarPeriodo(recibos, "data_emissao", periodoResumo)

  const facturasFT = facturasFiltradas.filter((f) => !f.tipo_documento || f.tipo_documento === "FT")
  const facturasNC = facturasFiltradas.filter((f) => f.tipo_documento === "NC")
  const facturasND = facturasFiltradas.filter((f) => f.tipo_documento === "ND")

  const totalFacturado = facturasFT.reduce((a, f) => a + (Number(f.total) || 0), 0)
  const totalNC = facturasNC.reduce((a, f) => a + (Number(f.total) || 0), 0)
  const totalND = facturasND.reduce((a, f) => a + (Number(f.total) || 0), 0)
  const receitaLiquida = totalFacturado - totalNC + totalND

  const despesasPagas = despesasFiltradas.filter((d) => d.estado === "Pago" || !d.estado)
  const totalDespesas = despesasPagas.reduce((a, d) => a + (Number(d.valor) || 0), 0)
  const totalRecibos = recibosFiltrados.reduce((a, r) => a + (Number(r.valor) || 0), 0)

  // FIX #8: incluir salários pagos no período no cálculo do lucro
  const salariosFiltrадos = useMemo(() => {
    if (!folhaSalarios || folhaSalarios.length === 0) return []
    return folhaSalarios.filter((fs) => {
      if (fs.estado !== "pago") return false
      if (periodoResumo === "mes") {
        return fs.mes === (hoje.getMonth() + 1) && fs.ano === anoActual
      }
      if (periodoResumo === "trimestre") {
        const tresMeses = new Date(hoje)
        tresMeses.setMonth(tresMeses.getMonth() - 3)
        const dataFolha = new Date(fs.ano, fs.mes - 1, 1)
        return dataFolha >= tresMeses
      }
      if (periodoResumo === "ano") {
        return fs.ano === anoActual
      }
      return true // "todos"
    })
  }, [folhaSalarios, periodoResumo, hoje, anoActual])

  const totalSalariosPagos = salariosFiltrадos.reduce((a: number, fs: any) => a + (Number(fs.total_rendimentos) || 0), 0)

  // Lucro inclui salários se disponíveis
  const totalCustosOperacionais = totalDespesas + totalSalariosPagos
  const lucro = receitaLiquida - totalCustosOperacionais
  const margem = receitaLiquida > 0 ? (lucro / receitaLiquida) * 100 : 0

  // Receita vs Despesas por mes (12 meses)
  const dadosMensais = useMemo(() => {
    const meses: Array<{ mes: string; receita: number; despesas: number; lucro: number }> = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const mesLabel = d.toLocaleDateString("pt-PT", { month: "short", year: "2-digit" })
      const ano = d.getFullYear()
      const mes = d.getMonth()

      const rec = facturas
        .filter((f) => (!f.tipo_documento || f.tipo_documento === "FT") && new Date(f.data).getFullYear() === ano && new Date(f.data).getMonth() === mes)
        .reduce((a, f) => a + (Number(f.total) || 0), 0)

      const nc = facturas
        .filter((f) => f.tipo_documento === "NC" && new Date(f.data).getFullYear() === ano && new Date(f.data).getMonth() === mes)
        .reduce((a, f) => a + (Number(f.total) || 0), 0)

      const desp = despesas
        .filter((dp) => (dp.estado === "Pago" || !dp.estado) && new Date(dp.data).getFullYear() === ano && new Date(dp.data).getMonth() === mes)
        .reduce((a, dp) => a + (Number(dp.valor) || 0), 0)

      // Incluir salários pagos no mês se disponíveis
      const sal = (folhaSalarios || [])
        .filter((fs: any) => fs.estado === "pago" && fs.ano === ano && (fs.mes - 1) === mes)
        .reduce((a: number, fs: any) => a + (Number(fs.total_rendimentos) || 0), 0)

      meses.push({ mes: mesLabel, receita: rec - nc, despesas: desp + sal, lucro: rec - nc - desp - sal })
    }
    return meses
  }, [facturas, despesas, folhaSalarios])

  // Despesas por categoria (inclui salários como categoria se disponíveis)
  const despesasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {}
    despesasFiltradas.forEach((d) => {
      const cat = d.categoria || "Outro"
      map[cat] = (map[cat] || 0) + (Number(d.valor) || 0)
    })
    // FIX #8: adicionar salários como categoria na DRE
    if (totalSalariosPagos > 0) {
      map["Salários e Encargos"] = (map["Salários e Encargos"] || 0) + totalSalariosPagos
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [despesasFiltradas, totalSalariosPagos])

  // CSV export
  function exportCSV(headers: string[], rows: string[][], filename: string) {
    const bom = "\uFEFF"
    const csv = bom + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportResumo() {
    exportCSV(
      ["Documento", "Numero", "Cliente", "Data", "Total", "Estado", "Tipo"],
      facturasFiltradas.map((f) => [
        f.tipo_documento || "FT",
        f.numero_documento || f.numero || "",
        f.clientes?.nome || "",
        f.data || "",
        String(f.total || 0),
        f.estado || "",
        f.tipo_documento || "FT",
      ]),
      `resumo_financeiro_${anoActual}.csv`
    )
  }

  function exportDespesas() {
    exportCSV(
      ["Descricao", "Categoria", "Fornecedor", "Data", "Valor", "IVA Suportado", "Estado"],
      despesasFiltradas.map((d) => [
        d.descricao || "",
        d.categoria || "",
        d.fornecedores?.nome || "",
        d.data || "",
        String(d.valor || 0),
        String(d.iva_suportado || 0),
        d.estado || "",
      ]),
      `despesas_${anoActual}.csv`
    )
  }

  // ==========================================
  // TAB 2: DEMONSTRACAO DE RESULTADOS
  // ==========================================
  const ivaFT = facturasFT.reduce((a, f) => a + (Number(f.iva) || 0), 0)
  const subtotalFT = facturasFT.reduce((a, f) => a + (Number(f.subtotal) || 0), 0)
  const ivaDespesas = despesasFiltradas.reduce((a, d) => a + (Number(d.iva_suportado) || 0), 0)

  // ==========================================
  // TAB 3: MAPA IVA
  // ==========================================
  const facturasIVA = filtrarPeriodo(facturas, "data", periodoIVA)
  const despesasIVA = filtrarPeriodo(despesas, "data", periodoIVA)

  const ivaCobrado = facturasIVA
    .filter((f) => !f.tipo_documento || f.tipo_documento === "FT")
    .reduce((a, f) => a + (Number(f.iva) || 0), 0)
  const ivaNCred = facturasIVA
    .filter((f) => f.tipo_documento === "NC")
    .reduce((a, f) => a + (Number(f.iva) || 0), 0)
  const ivaSuportado = despesasIVA.reduce((a, d) => a + (Number(d.iva_suportado) || 0), 0)
  const ivaLiquido = ivaCobrado - ivaNCred - ivaSuportado

  // ==========================================
  // TAB 4: CONTAS A RECEBER / PAGAR (AGING)
  // ==========================================
  const facturasAReceber = facturas.filter(
    (f) =>
      (!f.tipo_documento || f.tipo_documento === "FT") &&
      (f.estado === "Pendente" || f.estado === "Parcialmente Pago" || f.estado === "Parcialmente Creditada")
  )

  const recebidoPorFactura: Record<string, number> = {}
  recibos.forEach((r) => {
    if (r.factura_id) recebidoPorFactura[r.factura_id] = (recebidoPorFactura[r.factura_id] || 0) + (Number(r.valor) || 0)
  })
  const ncPorFactura: Record<string, number> = {}
  facturas.filter((f) => f.tipo_documento === "NC" && f.factura_origem_id).forEach((nc) => {
    ncPorFactura[nc.factura_origem_id] = (ncPorFactura[nc.factura_origem_id] || 0) + (Number(nc.total) || 0)
  })

  const contasAReceber = facturasAReceber.map((f) => {
    const total = Number(f.total) || 0
    const nc = ncPorFactura[f.id] || 0
    const recebido = recebidoPorFactura[f.id] || 0
    const saldo = Math.max(0, total - nc - recebido)

    // FIX #9: usar data_vencimento se disponível; caso contrário assumir 30 dias após emissão
    const dataReferencia = f.data_vencimento
      ? new Date(f.data_vencimento)
      : new Date(new Date(f.data).getTime() + 30 * 24 * 60 * 60 * 1000)
    const diasAtraso = Math.max(0, Math.floor(
      (hoje.getTime() - dataReferencia.getTime()) / (1000 * 60 * 60 * 24)
    ))

    return { ...f, saldo, diasAtraso, recebido, nc }
  }).filter((f) => f.saldo > 0.01)

  const despesasPendentes = despesas.filter((d) => d.estado === "Pendente")
  const contasAPagar = despesasPendentes.map((d) => {
    // data_vencimento já era usada correctamente aqui — mantido
    const diasAtraso = d.data_vencimento
      ? Math.max(0, Math.floor((hoje.getTime() - new Date(d.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)))
      : 0
    return { ...d, diasAtraso }
  })

  // Aging buckets
  function agingBuckets(items: Array<{ saldo?: number; valor?: number; diasAtraso: number }>) {
    const buckets = { corrente: 0, dias30: 0, dias60: 0, dias90: 0 }
    items.forEach((item) => {
      const val = Number(item.saldo || item.valor || 0)
      if (item.diasAtraso <= 0) buckets.corrente += val
      else if (item.diasAtraso <= 30) buckets.dias30 += val
      else if (item.diasAtraso <= 60) buckets.dias60 += val
      else buckets.dias90 += val
    })
    return buckets
  }

  const agingReceber = agingBuckets(contasAReceber)
  const agingPagar = agingBuckets(contasAPagar)
  const totalAReceber = contasAReceber.reduce((a, f) => a + f.saldo, 0)
  const totalAPagar = contasAPagar.reduce((a, d) => a + (Number(d.valor) || 0), 0)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="resumo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="resumo" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Resumo Financeiro</span>
            <span className="sm:hidden">Resumo</span>
          </TabsTrigger>
          <TabsTrigger value="demonstracao" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Demonstracao Resultados</span>
            <span className="sm:hidden">DRE</span>
          </TabsTrigger>
          <TabsTrigger value="iva" className="gap-1.5 text-xs sm:text-sm">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Mapa IVA</span>
            <span className="sm:hidden">IVA</span>
          </TabsTrigger>
          <TabsTrigger value="aging" className="gap-1.5 text-xs sm:text-sm">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Contas Receber/Pagar</span>
            <span className="sm:hidden">Aging</span>
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: RESUMO FINANCEIRO ===================== */}
        <TabsContent value="resumo" className="space-y-6">
          <div className="flex items-center justify-between">
            <Select value={periodoResumo} onValueChange={setPeriodoResumo}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Este Mes</SelectItem>
                <SelectItem value="trimestre">Trimestre</SelectItem>
                <SelectItem value="ano">Este Ano</SelectItem>
                <SelectItem value="todos">Todo o Periodo</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportResumo}>
                <Download className="mr-1 h-3 w-3" /> Facturas CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportDespesas}>
                <Download className="mr-1 h-3 w-3" /> Despesas CSV
              </Button>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Facturado</p>
                <p className="text-xl font-bold">{formatarMZN(totalFacturado)}</p>
                <p className="text-xs text-muted-foreground">{facturasFT.length} facturas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Notas de Credito</p>
                <p className="text-xl font-bold text-red-600">-{formatarMZN(totalNC)}</p>
                <p className="text-xs text-muted-foreground">{facturasNC.length} NCs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Despesas</p>
                <p className="text-xl font-bold text-red-600">{formatarMZN(totalCustosOperacionais)}</p>
                <p className="text-xs text-muted-foreground">
                  {despesasPagas.length} desp.{totalSalariosPagos > 0 ? ` + sal.` : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Recebido</p>
                <p className="text-xl font-bold text-green-600">{formatarMZN(totalRecibos)}</p>
                <p className="text-xs text-muted-foreground">{recibosFiltrados.length} recibos</p>
              </CardContent>
            </Card>
            <Card className={lucro < 0 ? "border-red-200" : "border-green-200"}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{lucro < 0 ? "Prejuizo" : "Lucro Liquido"}</p>
                <p className={`text-xl font-bold ${lucro < 0 ? "text-red-600" : "text-green-600"}`}>
                  {lucro < 0 ? "-" : ""}{formatarMZN(Math.abs(lucro))}
                </p>
                <p className="text-xs text-muted-foreground">Margem: {margem.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Graficos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Receita vs Despesas (12 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosMensais}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = { receita: "Receita", despesas: "Despesas", lucro: "Lucro" }
                          return [formatarMZN(value) + " MZN", labels[name] || name]
                        }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          backgroundColor: "hsl(var(--card))",
                          color: "hsl(var(--card-foreground))",
                        }}
                      />
                      <Legend formatter={(v) => ({ receita: "Receita", despesas: "Despesas", lucro: "Lucro" }[v] || v)} />
                      <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="despesas" fill="hsl(0 72% 51%)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {despesasPorCategoria.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={despesasPorCategoria.slice(0, 6)}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                          fontSize={10}
                        >
                          {despesasPorCategoria.slice(0, 6).map((_, i) => (
                            <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatarMZN(value) + " MZN"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-72 text-sm text-muted-foreground">
                    Sem despesas no periodo
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== TAB 2: DEMONSTRACAO DE RESULTADOS ===================== */}
        <TabsContent value="demonstracao" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Demonstracao de Resultados</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {empresa?.nome || "Empresa"} - Exercicio {anoActual}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Download className="mr-1 h-3 w-3" /> Imprimir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-2/3">Descricao</TableHead>
                      <TableHead className="text-right">Valor (MZN)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* PROVEITOS */}
                    <TableRow className="bg-muted/30">
                      <TableCell className="font-bold" colSpan={2}>PROVEITOS OPERACIONAIS</TableCell>
                    </TableRow>
                    <TableRow>
                      {/* FIX #10: usar subtotalFT (sem IVA) é correcto na DRE — mantido */}
                      <TableCell className="pl-8">Vendas e Prestacao de Servicos (s/IVA)</TableCell>
                      <TableCell className="text-right">{formatarMZN(subtotalFT)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Notas de Debito</TableCell>
                      <TableCell className="text-right">{formatarMZN(totalND)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8 text-red-600">(-) Devoluces / Notas de Credito</TableCell>
                      <TableCell className="text-right text-red-600">-{formatarMZN(totalNC)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell className="pl-8">Total Proveitos Liquidos</TableCell>
                      <TableCell className="text-right">{formatarMZN(receitaLiquida)}</TableCell>
                    </TableRow>

                    {/* CUSTOS */}
                    <TableRow className="bg-muted/30">
                      <TableCell className="font-bold" colSpan={2}>CUSTOS OPERACIONAIS</TableCell>
                    </TableRow>
                    {despesasPorCategoria.map(({ name, value }) => (
                      <TableRow key={name}>
                        <TableCell className="pl-8">{name}</TableCell>
                        <TableCell className="text-right">{formatarMZN(value)}</TableCell>
                      </TableRow>
                    ))}
                    {despesasPorCategoria.length === 0 && (
                      <TableRow>
                        <TableCell className="pl-8 text-muted-foreground">Sem despesas registadas</TableCell>
                        <TableCell className="text-right">0,00</TableCell>
                      </TableRow>
                    )}
                    {/* Nota se salários não foram passados */}
                    {folhaSalarios.length === 0 && (
                      <TableRow>
                        <TableCell className="pl-8 text-muted-foreground italic text-xs" colSpan={2}>
                          ⚠ Folhas de salário não incluídas — passe a prop folhaSalarios ao componente
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell className="pl-8">Total Custos Operacionais</TableCell>
                      <TableCell className="text-right">{formatarMZN(totalCustosOperacionais)}</TableCell>
                    </TableRow>

                    {/* RESULTADO */}
                    <TableRow className="bg-muted/50 border-t-2">
                      <TableCell className="font-bold text-lg">RESULTADO ANTES DE IMPOSTOS</TableCell>
                      <TableCell className={`text-right font-bold text-lg ${lucro < 0 ? "text-red-600" : "text-green-600"}`}>
                        {lucro < 0 ? "-" : ""}{formatarMZN(Math.abs(lucro))}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8 text-muted-foreground">Margem de Lucro</TableCell>
                      <TableCell className="text-right text-muted-foreground">{margem.toFixed(1)}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 3: MAPA IVA ===================== */}
        <TabsContent value="iva" className="space-y-6">
          <div className="flex items-center justify-between">
            <Select value={periodoIVA} onValueChange={setPeriodoIVA}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Este Mes</SelectItem>
                <SelectItem value="trimestre">Trimestre</SelectItem>
                <SelectItem value="ano">Este Ano</SelectItem>
                <SelectItem value="todos">Todo o Periodo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">IVA Cobrado (Vendas)</p>
                <p className="text-xl font-bold">{formatarMZN(ivaCobrado)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">IVA Notas Credito</p>
                <p className="text-xl font-bold text-red-600">-{formatarMZN(ivaNCred)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">IVA Suportado (Compras)</p>
                <p className="text-xl font-bold text-amber-600">-{formatarMZN(ivaSuportado)}</p>
              </CardContent>
            </Card>
            <Card className={ivaLiquido >= 0 ? "border-primary/30" : "border-green-300"}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{ivaLiquido >= 0 ? "IVA a Pagar a AT" : "IVA a Recuperar"}</p>
                <p className={`text-xl font-bold ${ivaLiquido >= 0 ? "text-primary" : "text-green-600"}`}>
                  {formatarMZN(Math.abs(ivaLiquido))}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalhe do Calculo IVA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Componente</TableHead>
                      <TableHead className="text-right">Valor (MZN)</TableHead>
                      <TableHead>Operacao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>IVA cobrado nas Facturas (FT)</TableCell>
                      <TableCell className="text-right font-medium">{formatarMZN(ivaCobrado)}</TableCell>
                      <TableCell><Badge variant="outline">+</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>(-) IVA das Notas de Credito (NC)</TableCell>
                      <TableCell className="text-right font-medium text-red-600">-{formatarMZN(ivaNCred)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-red-600">-</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>(-) IVA suportado em Compras/Despesas</TableCell>
                      <TableCell className="text-right font-medium text-amber-600">-{formatarMZN(ivaSuportado)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-amber-600">-</Badge></TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 bg-muted/30">
                      <TableCell className="font-bold">{ivaLiquido >= 0 ? "IVA a Pagar" : "IVA a Recuperar"}</TableCell>
                      <TableCell className={`text-right font-bold ${ivaLiquido >= 0 ? "" : "text-green-600"}`}>
                        {formatarMZN(Math.abs(ivaLiquido))}
                      </TableCell>
                      <TableCell><Badge variant="outline">=</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Conforme o Decreto-Lei 51/98 de Mocambique, o IVA a entregar e a diferenca entre o IVA cobrado nas vendas e o IVA suportado nas compras.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 4: CONTAS A RECEBER/PAGAR ===================== */}
        <TabsContent value="aging" className="space-y-6">
          {/* Aging summary cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Contas a Receber - {formatarMZN(totalAReceber)} MZN
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Corrente (em dia)", valor: agingReceber.corrente, cor: "bg-green-500" },
                    { label: "1-30 dias atraso", valor: agingReceber.dias30, cor: "bg-amber-500" },
                    { label: "31-60 dias atraso", valor: agingReceber.dias60, cor: "bg-orange-500" },
                    { label: "61+ dias atraso", valor: agingReceber.dias90, cor: "bg-red-500" },
                  ].map((b) => {
                    const pct = totalAReceber > 0 ? (b.valor / totalAReceber) * 100 : 0
                    return (
                      <div key={b.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{b.label}</span>
                          <span className="font-medium">{formatarMZN(b.valor)} MZN ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${b.cor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Contas a Pagar - {formatarMZN(totalAPagar)} MZN
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Corrente (em dia)", valor: agingPagar.corrente, cor: "bg-green-500" },
                    { label: "1-30 dias atraso", valor: agingPagar.dias30, cor: "bg-amber-500" },
                    { label: "31-60 dias atraso", valor: agingPagar.dias60, cor: "bg-orange-500" },
                    { label: "61+ dias atraso", valor: agingPagar.dias90, cor: "bg-red-500" },
                  ].map((b) => {
                    const pct = totalAPagar > 0 ? (b.valor / totalAPagar) * 100 : 0
                    return (
                      <div key={b.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{b.label}</span>
                          <span className="font-medium">{formatarMZN(b.valor)} MZN ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${b.cor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabelas detalhadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Facturas Pendentes (Contas a Receber)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      {/* FIX #9: mostrar data de vencimento na tabela */}
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">NC</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Aging</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasAReceber.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                          Sem facturas pendentes
                        </TableCell>
                      </TableRow>
                    ) : (
                      contasAReceber.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-mono text-sm">{f.numero_documento || f.numero}</TableCell>
                          <TableCell className="text-sm">{f.clientes?.nome || "-"}</TableCell>
                          <TableCell className="text-sm">{formatarData(f.data)}</TableCell>
                          {/* FIX #9: mostrar data real de vencimento */}
                          <TableCell className="text-sm">
                            {f.data_vencimento ? formatarData(f.data_vencimento) : (
                              <span className="text-muted-foreground text-xs">30d assumidos</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatarMZN(Number(f.total))}</TableCell>
                          <TableCell className="text-right text-sm text-red-600">
                            {f.nc > 0 ? `-${formatarMZN(f.nc)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right text-sm text-green-600">
                            {f.recebido > 0 ? formatarMZN(f.recebido) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatarMZN(f.saldo)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                f.diasAtraso <= 0
                                  ? "bg-green-500/10 text-green-600"
                                  : f.diasAtraso <= 30
                                    ? "bg-amber-500/10 text-amber-600"
                                    : f.diasAtraso <= 60
                                      ? "bg-orange-500/10 text-orange-600"
                                      : "bg-red-500/10 text-red-600"
                              }
                            >
                              {f.diasAtraso <= 0 ? "Em dia" : `${f.diasAtraso}d`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {contasAReceber.length > 0 && (
                  <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                    <span className="text-muted-foreground">{contasAReceber.length} factura{contasAReceber.length !== 1 ? "s" : ""}</span>
                    <span className="font-bold">{formatarMZN(totalAReceber)} MZN</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Despesas Pendentes (Contas a Pagar)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Aging</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasAPagar.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                          Sem despesas pendentes
                        </TableCell>
                      </TableRow>
                    ) : (
                      contasAPagar.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-sm">{d.descricao}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{d.categoria}</Badge></TableCell>
                          <TableCell className="text-sm">{d.fornecedores?.nome || "-"}</TableCell>
                          <TableCell className="text-sm">{formatarData(d.data)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatarMZN(Number(d.valor))}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                d.diasAtraso <= 0
                                  ? "bg-green-500/10 text-green-600"
                                  : d.diasAtraso <= 30
                                    ? "bg-amber-500/10 text-amber-600"
                                    : "bg-red-500/10 text-red-600"
                              }
                            >
                              {d.diasAtraso <= 0 ? "Em dia" : `${d.diasAtraso}d atraso`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {contasAPagar.length > 0 && (
                  <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                    <span className="text-muted-foreground">{contasAPagar.length} despesa{contasAPagar.length !== 1 ? "s" : ""}</span>
                    <span className="font-bold">{formatarMZN(totalAPagar)} MZN</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}