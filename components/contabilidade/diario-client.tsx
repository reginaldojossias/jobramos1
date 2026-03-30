"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Search, BookOpen, Eye, ArrowUpRight, ArrowDownLeft, Calendar } from "lucide-react"
import { formatarMZN, formatarData } from "@/lib/documento-utils"

interface LancamentoLinha {
  id: string
  conta_codigo: string
  descricao: string
  debito: number
  credito: number
  ordem: number
}

interface Lancamento {
  id: string
  data: string
  descricao: string
  tipo_origem: string
  origem_id: string
  origem_numero: string | null
  total_debito: number
  total_credito: number
  estado: string
  created_at: string
  lancamento_linhas: LancamentoLinha[]
}

interface DiarioClientProps {
  lancamentos: Lancamento[]
  contasMap: Record<string, string>
  empresaId: string
}

const TIPO_ORIGEM_LABELS: Record<string, string> = {
  factura: "Factura",
  nota_credito: "Nota de Crédito",
  nota_debito: "Nota de Débito",
  recibo: "Recibo",
  despesa: "Despesa",
  movimento_bancario: "Mov. Bancário",
  folha_salario: "Folha de Salário",
  ajuste_manual: "Ajuste Manual",
}

const ESTADO_CORES: Record<string, string> = {
  rascunho: "bg-yellow-100 text-yellow-800",
  validado: "bg-green-100 text-green-800",
  anulado: "bg-red-100 text-red-800",
}

export function DiarioClient({ lancamentos, contasMap, empresaId }: DiarioClientProps) {
  const [search, setSearch] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null)
  const [showDetalhes, setShowDetalhes] = useState(false)

  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter((l) => {
      const matchSearch =
        l.descricao.toLowerCase().includes(search.toLowerCase()) ||
        l.origem_numero?.toLowerCase().includes(search.toLowerCase()) ||
        l.lancamento_linhas.some((linha) =>
          linha.descricao.toLowerCase().includes(search.toLowerCase()) ||
          linha.conta_codigo.includes(search)
        )
      const matchTipo = filtroTipo === "todos" || l.tipo_origem === filtroTipo
      const matchEstado = filtroEstado === "todos" || l.estado === filtroEstado
      return matchSearch && matchTipo && matchEstado
    })
  }, [lancamentos, search, filtroTipo, filtroEstado])

  const totais = useMemo(() => {
    const totalDebito = filteredLancamentos.reduce((acc, l) => acc + l.total_debito, 0)
    const totalCredito = filteredLancamentos.reduce((acc, l) => acc + l.total_credito, 0)
    return { totalDebito, totalCredito }
  }, [filteredLancamentos])

  const handleViewDetails = (lancamento: Lancamento) => {
    setSelectedLancamento(lancamento)
    setShowDetalhes(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Diário Contabilístico
          </h1>
          <p className="text-muted-foreground">
            Visualização dos lançamentos em partidas dobradas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lançamentos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLancamentos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Débitos</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatarMZN(totais.totalDebito)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Créditos</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatarMZN(totais.totalCredito)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equilíbrio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${Math.abs(totais.totalDebito - totais.totalCredito) < 0.01 ? "text-green-600" : "text-red-600"}`}>
              {Math.abs(totais.totalDebito - totais.totalCredito) < 0.01 ? "Equilibrado" : formatarMZN(totais.totalDebito - totais.totalCredito)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por descrição, número ou conta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="factura">Facturas</SelectItem>
                <SelectItem value="nota_credito">Notas de Crédito</SelectItem>
                <SelectItem value="recibo">Recibos</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
                <SelectItem value="folha_salario">Folhas de Salário</SelectItem>
                <SelectItem value="movimento_bancario">Mov. Bancários</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="validado">Validado</SelectItem>
                <SelectItem value="anulado">Anulado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Débito</TableHead>
                <TableHead className="text-right">Crédito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLancamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum lançamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLancamentos.map((lancamento) => (
                  <TableRow key={lancamento.id}>
                    <TableCell className="font-mono text-sm">
                      {formatarData(lancamento.data)}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {lancamento.descricao}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TIPO_ORIGEM_LABELS[lancamento.tipo_origem] || lancamento.tipo_origem}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {lancamento.origem_numero || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {formatarMZN(lancamento.total_debito)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {formatarMZN(lancamento.total_credito)}
                    </TableCell>
                    <TableCell>
                      <Badge className={ESTADO_CORES[lancamento.estado] || "bg-gray-100"}>
                        {lancamento.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(lancamento)}
                        title="Ver Detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Detalhes do Lançamento</DialogTitle>
          </DialogHeader>
          {selectedLancamento && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {/* Info do Lançamento */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">{formatarData(selectedLancamento.data)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">
                    {TIPO_ORIGEM_LABELS[selectedLancamento.tipo_origem] || selectedLancamento.tipo_origem}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Descrição:</span>
                  <p className="font-medium">{selectedLancamento.descricao}</p>
                </div>
                {selectedLancamento.origem_numero && (
                  <div>
                    <span className="text-muted-foreground">Documento Ref.:</span>
                    <p className="font-medium">{selectedLancamento.origem_numero}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge className={ESTADO_CORES[selectedLancamento.estado] || "bg-gray-100"}>
                    {selectedLancamento.estado}
                  </Badge>
                </div>
              </div>

              {/* Linhas do Lançamento */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Conta</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Débito</TableHead>
                      <TableHead className="text-right">Crédito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedLancamento.lancamento_linhas
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((linha) => (
                        <TableRow key={linha.id}>
                          <TableCell>
                            <div className="font-mono text-sm">{linha.conta_codigo}</div>
                            <div className="text-xs text-muted-foreground">
                              {contasMap[linha.conta_codigo] || ""}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{linha.descricao}</TableCell>
                          <TableCell className="text-right font-mono">
                            {linha.debito > 0 ? (
                              <span className="text-red-600">{formatarMZN(linha.debito)}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {linha.credito > 0 ? (
                              <span className="text-green-600">{formatarMZN(linha.credito)}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    {/* Linha de Totais */}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell colSpan={2} className="text-right">
                        TOTAIS
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {formatarMZN(selectedLancamento.total_debito)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatarMZN(selectedLancamento.total_credito)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Verificação de Equilíbrio */}
              <div className={`p-3 rounded-lg text-center ${
                Math.abs(selectedLancamento.total_debito - selectedLancamento.total_credito) < 0.01
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {Math.abs(selectedLancamento.total_debito - selectedLancamento.total_credito) < 0.01
                  ? "Lançamento equilibrado (Débito = Crédito)"
                  : `Atenção: Lançamento não equilibrado! Diferença: ${formatarMZN(selectedLancamento.total_debito - selectedLancamento.total_credito)}`}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
