"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Building2,
  MapPin,
  Clock,
  AlertTriangle,
  Receipt,
  DollarSign,
  CreditCard,
  BarChart3,
  Wallet,
} from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { formatarMZN } from "@/lib/documento-utils"

interface DashboardClientProps {
  nomeEmpresa: string
  empresa: any
  totalFacturado: number
  receitaLiquida: number
  totalPago: number
  totalPendente: number
  totalDespesas: number
  totalDespesasPendentes: number
  lucro: number
  margemLucro: number
  ivaAEntregar: number
  ivaSuportado: number
  totalClientes: number
  totalProdutos: number
  facturasPagas: number
  facturasPendentes: number
  totalFacturas: number
  receitaPorMes: Array<{ mes: string; receita: number; despesas: number; notas_credito: number; lucro: number; entradas: number; saidas: number; fluxo: number }>
  stockBaixo: Array<{ id: string; nome: string; stock: number }>
  actividades: Array<{
    id: string
    tipo: string
    numero: string
    data: string
    total: number
    estado: string | null
    cliente: string
  }>
}

const tipoConfig: Record<string, { label: string; cor: string }> = {
  FT: { label: "Factura", cor: "bg-primary/10 text-primary" },
  NC: { label: "Nota Credito", cor: "bg-red-500/10 text-red-600" },
  ND: { label: "Nota Debito", cor: "bg-amber-500/10 text-amber-600" },
  COT: { label: "Cotacao", cor: "bg-blue-500/10 text-blue-600" },
}

const estadoConfig: Record<string, string> = {
  Pendente: "bg-amber-500/10 text-amber-600 border-amber-200",
  Pago: "bg-green-500/10 text-green-600 border-green-200",
  Paga: "bg-green-500/10 text-green-600 border-green-200",
  Cancelada: "bg-red-500/10 text-red-600 border-red-200",
  "Parcialmente Pago": "bg-blue-500/10 text-blue-600 border-blue-200",
}

export function DashboardClient({
  nomeEmpresa,
  empresa,
  totalFacturado,
  receitaLiquida,
  totalPago,
  totalPendente,
  totalDespesas,
  totalDespesasPendentes,
  lucro,
  margemLucro,
  ivaAEntregar,
  ivaSuportado,
  totalClientes,
  totalProdutos,
  facturasPagas,
  facturasPendentes,
  totalFacturas,
  receitaPorMes,
  stockBaixo,
  actividades,
}: DashboardClientProps) {
  const hoje = new Date()
  const dataFormatada = hoje.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const taxaCobranca = totalFacturado > 0 ? Math.round((totalPago / totalFacturado) * 100) : 0
  const isPrejuizo = lucro < 0

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{dataFormatada}</p>
        <h2 className="text-3xl font-bold text-balance">Bem Vindo, {nomeEmpresa}</h2>
      </div>

      {/* KPI Cards - 2 rows */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Row 1: Financial overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Facturado</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatarMZN(totalFacturado)}</div>
            <p className="text-xs text-muted-foreground">{totalFacturas} facturas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Despesas</CardTitle>
            <Wallet className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatarMZN(totalDespesas)}</div>
            {totalDespesasPendentes > 0 && (
              <p className="text-xs text-amber-600">{formatarMZN(totalDespesasPendentes)} pendentes</p>
            )}
            {totalDespesasPendentes === 0 && (
              <p className="text-xs text-muted-foreground">Todas pagas</p>
            )}
          </CardContent>
        </Card>

        <Card className={isPrejuizo ? "border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10" : "border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/10"}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {isPrejuizo ? "Prejuizo" : "Lucro Liquido"}
            </CardTitle>
            {isPrejuizo ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${isPrejuizo ? "text-red-600" : "text-green-600"}`}>
              {isPrejuizo ? "-" : ""}{formatarMZN(Math.abs(lucro))}
            </div>
            <p className="text-xs text-muted-foreground">Margem: {margemLucro.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">IVA a Entregar</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatarMZN(ivaAEntregar)}</div>
            <p className="text-xs text-muted-foreground">
              Cobrado - Suportado ({formatarMZN(ivaSuportado)})
            </p>
          </CardContent>
        </Card>

        {/* Row 2: Operational */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Valor Recebido</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatarMZN(totalPago)}</div>
            <p className="text-xs text-muted-foreground">{facturasPagas} pagas ({taxaCobranca}%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Por Cobrar</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">{formatarMZN(totalPendente)}</div>
            <p className="text-xs text-muted-foreground">{facturasPendentes} pendente{facturasPendentes !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Receita Liquida</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatarMZN(receitaLiquida)}</div>
            <p className="text-xs text-muted-foreground">Apos notas de credito</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Clientes / Produtos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalClientes} / {totalProdutos}</div>
            <p className="text-xs text-muted-foreground">Registados</p>
          </CardContent>
        </Card>
      </div>

      {/* Graficos + Alertas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Grafico Receita vs Despesas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Receita vs Despesas (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaPorMes} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        receita: "Receita",
                        despesas: "Despesas",
                        notas_credito: "Notas de Credito",
                      }
                      return [formatarMZN(value) + " MZN", labels[name] || name]
                    }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Legend
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        receita: "Receita",
                        despesas: "Despesas",
                        notas_credito: "Notas Credito",
                      }
                      return labels[value] || value
                    }}
                  />
                  <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="notas_credito" fill="hsl(30 80% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Prejuizo */}
            {isPrejuizo && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                <TrendingDown className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Atencao: Prejuizo</p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Despesas ({formatarMZN(totalDespesas)}) excedem a receita
                  </p>
                </div>
              </div>
            )}

            {/* Despesas pendentes */}
            {totalDespesasPendentes > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/30">
                <Wallet className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Contas a pagar</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {formatarMZN(totalDespesasPendentes)} MZN pendentes
                  </p>
                </div>
              </div>
            )}

            {/* Facturas pendentes */}
            {facturasPendentes > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <CreditCard className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {facturasPendentes} factura{facturasPendentes > 1 ? "s" : ""} pendente{facturasPendentes > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {formatarMZN(totalPendente)} MZN por cobrar
                  </p>
                </div>
              </div>
            )}

            {/* Stock baixo */}
            {stockBaixo.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                <Package className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Stock baixo ({stockBaixo.length})
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {stockBaixo.slice(0, 3).map((p) => (
                      <p key={p.id} className="text-xs text-red-600 dark:text-red-400">
                        {p.nome}: {p.stock} un.
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!isPrejuizo && totalDespesasPendentes === 0 && facturasPendentes === 0 && stockBaixo.length === 0 && (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-950/30">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Tudo em ordem</p>
              </div>
            )}

            {/* Info empresa */}
            {empresa && (
              <div className="mt-2 rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{empresa.nome}</span>
                </div>
                {empresa.nuit && <p className="text-xs text-muted-foreground">NUIT: {empresa.nuit}</p>}
                {(empresa.cidade || empresa.provincia) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{[empresa.cidade, empresa.provincia].filter(Boolean).join(", ")}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fluxo de Caixa + Lucro */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Fluxo de Caixa (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaPorMes} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { entradas: "Entradas (Recibos)", saidas: "Saidas (Despesas)" }
                      return [formatarMZN(value) + " MZN", labels[name] || name]
                    }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Legend formatter={(v) => ({ entradas: "Entradas", saidas: "Saidas" }[v] || v)} />
                  <Bar dataKey="entradas" fill="hsl(142 71% 45%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="saidas" fill="hsl(0 72% 51%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Lucro Mensal (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={receitaPorMes} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatarMZN(value) + " MZN", "Lucro"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lucro"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actividade Recente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Actividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actividades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Sem actividade recente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {actividades.map((act) => {
                const tc = tipoConfig[act.tipo] || tipoConfig.FT
                const dataFmt = new Date(act.data).toLocaleDateString("pt-PT", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                return (
                  <div
                    key={`${act.tipo}-${act.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-md p-2 ${tc.cor}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{act.numero}</p>
                          {act.estado && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${estadoConfig[act.estado] || ""}`}>
                              {act.estado}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{act.cliente}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatarMZN(Number(act.total))} MZN</p>
                      <p className="text-xs text-muted-foreground">{dataFmt}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
