"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { logCriar, logEditar, logEliminar } from "@/lib/audit-log"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Pencil, Trash2, Wallet, TrendingUp, Clock, Filter, Calculator, Building2 } from "lucide-react"
import { formatarMZN, formatarData, ESTADO_CORES, FORMAS_PAGAMENTO } from "@/lib/documento-utils"

const CATEGORIAS = [
  { valor: "Aluguer", label: "Aluguer / Renda" },
  { valor: "Salarios", label: "Salarios e Ordenados" },
  { valor: "Agua e Luz", label: "Agua e Electricidade" },
  { valor: "Comunicacoes", label: "Comunicacoes (Telefone/Internet)" },
  { valor: "Material Escritorio", label: "Material de Escritorio" },
  { valor: "Transporte", label: "Transporte e Combustivel" },
  { valor: "Manutencao", label: "Manutencao e Reparacoes" },
  { valor: "Seguros", label: "Seguros" },
  { valor: "Impostos", label: "Impostos e Taxas" },
  { valor: "Marketing", label: "Marketing e Publicidade" },
  { valor: "Fornecedores", label: "Compras a Fornecedores" },
  { valor: "Servicos", label: "Servicos Externos" },
  { valor: "Equipamento", label: "Equipamento e Maquinas" },
  { valor: "Outro", label: "Outras Despesas" },
]

interface ContaBancaria {
  id: string
  nome: string
  banco: string | null
  numero_conta: string | null
}

interface DespesasClientProps {
  despesas: any[]
  fornecedores: any[]
  contasBancarias: ContaBancaria[]
  funcionarioId: string | null
  empresaId: string
}

export function DespesasClient({
  despesas: initialDespesas,
  fornecedores,
  contasBancarias,
  funcionarioId,
  empresaId,
}: DespesasClientProps) {
  const supabase = createClient()
  const [despesas, setDespesas] = useState(initialDespesas)
  const [showDialog, setShowDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("todas")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroPeriodo, setFiltroPeriodo] = useState("mes")

  // Form
  const [descricao, setDescricao] = useState("")
  const [categoria, setCategoria] = useState("")
  const [valor, setValor] = useState(0)
  const [data, setData] = useState(new Date().toISOString().split("T")[0])
  // FIX #11: usar "none" como valor inicial (nao "" vazio) para Select funcionar
  const [fornecedorId, setFornecedorId] = useState("none")
  const [formaPagamento, setFormaPagamento] = useState("Transferencia")
  const [estado, setEstado] = useState("Pago")
  const [dataVencimento, setDataVencimento] = useState("")
  const [numeroDocumento, setNumeroDocumento] = useState("")
  const [ivaSuportado, setIvaSuportado] = useState(0)
  const [contaBancariaId, setContaBancariaId] = useState("none")
  const [observacoes, setObservacoes] = useState("")

  function resetForm() {
    setDescricao("")
    setCategoria("")
    setValor(0)
    setData(new Date().toISOString().split("T")[0])
    setFornecedorId("none") // FIX #11: sempre "none" ao reset
    setFormaPagamento("Transferencia")
    setEstado("Pago")
    setDataVencimento("")
    setNumeroDocumento("")
    setIvaSuportado(0)
    setContaBancariaId("none")
    setObservacoes("")
    setEditingId(null)
  }

  function openCreate() {
    resetForm()
    setShowDialog(true)
  }

  function openEdit(d: any) {
    setEditingId(d.id)
    setDescricao(d.descricao || "")
    setCategoria(d.categoria || "")
    setValor(Number(d.valor) || 0)
    setData(d.data || new Date().toISOString().split("T")[0])
    // FIX #11: se fornecedor_id for null/vazio, usar "none" — evita string vazia no Select
    setFornecedorId(d.fornecedor_id || "none")
    setFormaPagamento(d.forma_pagamento || "Transferencia")
    setEstado(d.estado || "Pago")
    setDataVencimento(d.data_vencimento || "")
    setNumeroDocumento(d.numero_documento || "")
    setIvaSuportado(Number(d.iva_suportado) || 0)
    setContaBancariaId(d.conta_bancaria_id || "none")
    setObservacoes(d.documento_referencia || "")
    setShowDialog(true)
  }

  // FIX #12: calcular IVA automaticamente a 16% do valor
  function calcularIVAAutomatico() {
    if (valor > 0) {
      setIvaSuportado(Number((valor * 0.16).toFixed(2)))
    }
  }

  async function handleSave() {
    if (!descricao.trim()) {
      toast.error("Preencha a descricao")
      return
    }
    if (!categoria) {
      toast.error("Seleccione uma categoria")
      return
    }
    if (valor <= 0) {
      toast.error("O valor deve ser superior a zero")
      return
    }

    setIsLoading(true)
    try {
      const despesaData = {
        descricao,
        categoria,
        valor,
        data,
        // FIX #11: converter "none" -> null antes de gravar na BD
        fornecedor_id: fornecedorId && fornecedorId !== "none" ? fornecedorId : null,
        conta_bancaria_id: contaBancariaId && contaBancariaId !== "none" ? contaBancariaId : null,
        forma_pagamento: formaPagamento,
        estado,
        data_vencimento: dataVencimento || null,
        numero_documento: numeroDocumento || null,
        iva_suportado: ivaSuportado,
        documento_referencia: observacoes || null,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        empresa_id: empresaId,
        criado_por: funcionarioId,
      }

      if (editingId) {
        const { data: updated, error } = await supabase
          .from("despesas")
          .update(despesaData)
          .eq("id", editingId)
          .select(`*, fornecedores:fornecedor_id(nome), conta_bancaria:conta_bancaria_id(id, nome, banco)`)
          .single()
  if (error) throw error
  setDespesas((prev) => prev.map((d) => (d.id === editingId ? updated : d)))
  await logEditar("despesas", editingId, `Despesa actualizada - ${descricao} - ${formatarMZN(Number(valor))} MZN`)
  toast.success("Despesa actualizada com sucesso")
  } else {
        const { data: newDespesa, error } = await supabase
          .from("despesas")
          .insert(despesaData)
          .select(`*, fornecedores:fornecedor_id(nome), conta_bancaria:conta_bancaria_id(id, nome, banco)`)
          .single()
  if (error) throw error
  setDespesas((prev) => [newDespesa, ...prev])
  await logCriar("despesas", newDespesa.id, `Despesa registada - ${descricao} - ${formatarMZN(Number(valor))} MZN`, { descricao, valor: Number(valor), categoria })
  toast.success("Despesa registada com sucesso")
  }

      setShowDialog(false)
      resetForm()
    } catch (error: any) {
      toast.error("Erro: " + (error.message || "Falha ao guardar"))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja eliminar esta despesa?")) return

    try {
  const despesaToDelete = despesas.find(d => d.id === id)
  const { error } = await supabase.from("despesas").delete().eq("id", id)
  if (error) throw error
  setDespesas((prev) => prev.filter((d) => d.id !== id))
  await logEliminar("despesas", id, `Despesa eliminada - ${despesaToDelete?.descricao || "N/A"}`, despesaToDelete)
  toast.success("Despesa eliminada")
    } catch {
      toast.error("Erro ao eliminar despesa")
    }
  }

  // Filtros
  const despesasFiltradas = useMemo(() => {
    let filtered = [...despesas]

    const hoje = new Date()
    if (filtroPeriodo === "mes") {
      const mesActual = hoje.getMonth()
      const anoActual = hoje.getFullYear()
      filtered = filtered.filter((d) => {
        const dd = new Date(d.data)
        return dd.getMonth() === mesActual && dd.getFullYear() === anoActual
      })
    } else if (filtroPeriodo === "trimestre") {
      const tresMesesAtras = new Date(hoje)
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3)
      filtered = filtered.filter((d) => new Date(d.data) >= tresMesesAtras)
    } else if (filtroPeriodo === "ano") {
      filtered = filtered.filter((d) => new Date(d.data).getFullYear() === hoje.getFullYear())
    }

    if (filtroCategoria !== "todas") {
      filtered = filtered.filter((d) => d.categoria === filtroCategoria)
    }
    if (filtroEstado !== "todos") {
      filtered = filtered.filter((d) => d.estado === filtroEstado)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.descricao?.toLowerCase().includes(term) ||
          d.categoria?.toLowerCase().includes(term) ||
          d.fornecedores?.nome?.toLowerCase().includes(term) ||
          d.numero_documento?.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [despesas, filtroCategoria, filtroEstado, filtroPeriodo, searchTerm])

  // KPIs
  const totalGasto = despesasFiltradas.reduce((a, d) => a + (Number(d.valor) || 0), 0)
  const totalPendente = despesasFiltradas
    .filter((d) => d.estado === "Pendente")
    .reduce((a, d) => a + (Number(d.valor) || 0), 0)
  const totalIVA = despesasFiltradas.reduce((a, d) => a + (Number(d.iva_suportado) || 0), 0)

  const porCategoria = despesasFiltradas.reduce((acc: Record<string, number>, d) => {
    const cat = d.categoria || "Outro"
    acc[cat] = (acc[cat] || 0) + (Number(d.valor) || 0)
    return acc
  }, {})
  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-sm text-muted-foreground">Controle de gastos e contas a pagar</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nova Despesa
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMZN(totalGasto)} MZN</div>
            <p className="text-xs text-muted-foreground mt-1">{despesasFiltradas.length} despesa{despesasFiltradas.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contas a Pagar</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatarMZN(totalPendente)} MZN</div>
            <p className="text-xs text-muted-foreground mt-1">{despesasFiltradas.filter((d) => d.estado === "Pendente").length} pendente{despesasFiltradas.filter((d) => d.estado === "Pendente").length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">IVA Suportado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMZN(totalIVA)} MZN</div>
            <p className="text-xs text-muted-foreground mt-1">Dedutivel ao IVA cobrado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Categoria</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {categoriasOrdenadas.length > 0 ? categoriasOrdenadas[0][0] : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {categoriasOrdenadas.length > 0 ? `${formatarMZN(categoriasOrdenadas[0][1])} MZN` : "Sem dados"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categorias breakdown */}
      {categoriasOrdenadas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribuicao por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoriasOrdenadas.slice(0, 6).map(([cat, val]) => {
                const pct = totalGasto > 0 ? (val / totalGasto) * 100 : 0
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{cat}</span>
                      <span className="font-medium">{formatarMZN(val)} MZN ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar despesas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Este Mes</SelectItem>
            <SelectItem value="trimestre">Trimestre</SelectItem>
            <SelectItem value="ano">Este Ano</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Categorias</SelectItem>
            {CATEGORIAS.map((c) => (
              <SelectItem key={c.valor} value={c.valor}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Estados</SelectItem>
            <SelectItem value="Pago">Pago</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">IVA Sup.</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Conta Origem</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {despesasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  Nenhuma despesa encontrada
                </TableCell>
              </TableRow>
            ) : (
              despesasFiltradas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm">{formatarData(d.data)}</TableCell>
                  <TableCell>
                    <div>
                      <span className="text-sm font-medium">{d.descricao}</span>
                      {d.numero_documento && (
                        <p className="text-xs text-muted-foreground font-mono">{d.numero_documento}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{d.categoria}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{d.fornecedores?.nome || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">{formatarMZN(Number(d.valor))} MZN</TableCell>
                  <TableCell className="text-right text-sm">
                    {Number(d.iva_suportado) > 0 ? `${formatarMZN(Number(d.iva_suportado))} MZN` : "-"}
                  </TableCell>
                  <TableCell className="text-sm">{d.forma_pagamento || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {d.conta_bancaria ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span>{d.conta_bancaria.nome}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ESTADO_CORES[d.estado] || ""}>
                      {d.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(d)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)} title="Eliminar">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {despesasFiltradas.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {despesasFiltradas.length} despesa{despesasFiltradas.length !== 1 ? "s" : ""}
            </span>
            <span className="font-medium">{formatarMZN(totalGasto)} MZN</span>
          </div>
        )}
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Despesa" : "Registar Nova Despesa"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Descricao *</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Pagamento de renda do escritorio..."
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.valor} value={c.valor}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fornecedor</Label>
                {/* FIX #11: valor "none" evita string vazia que causava bug ao guardar */}
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor (MZN) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={valor}
                  onChange={(e) => setValor(Number(e.target.value))}
                />
              </div>

              {/* FIX #12: IVA com botão de cálculo automático */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>IVA Suportado (MZN)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 py-0 text-xs gap-1"
                    onClick={calcularIVAAutomatico}
                    disabled={valor <= 0}
                    title="Calcular 16% do valor automaticamente"
                  >
                    <Calculator className="h-3 w-3" />
                    Auto 16%
                  </Button>
                </div>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={ivaSuportado}
                  onChange={(e) => setIvaSuportado(Number(e.target.value))}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Clique em "Auto 16%" para calcular com base no valor
                </p>
              </div>

              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map((fp) => (
                      <SelectItem key={fp.valor} value={fp.valor}>{fp.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>N. Documento / Referencia</Label>
                <Input
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  placeholder="Ex: FAC-2026/001"
                />
              </div>

              {/* Conta Bancária de Origem */}
              <div className="space-y-2 md:col-span-2">
                <Label>Conta Bancária de Origem</Label>
                <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="De onde saiu o valor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma / Caixa</SelectItem>
                    {contasBancarias.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          <span>{conta.nome}</span>
                          {conta.banco && <span className="text-muted-foreground">({conta.banco})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Indica de qual conta bancária este pagamento foi feito</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Notas adicionais..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "A guardar..." : editingId ? "Actualizar" : "Registar Despesa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
