"use client"

import type React from "react"
import { useState, useMemo } from "react"
import {
  Search, Plus, Lock, Unlock, CheckCircle, AlertCircle,
  Building2, ArrowUpRight, ArrowDownLeft, Calendar, Wallet, TrendingUp, TrendingDown, FileText, Receipt, CreditCard, Users,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface ContaBancaria {
  id: string
  empresa_id: string
  nome: string
  banco: string | null
  numero_conta: string | null
  iban: string | null
  swift: string | null
  moeda: string
  saldo_inicial: number
  saldo_atual: number
  ativa: boolean
}

interface MovimentoBancario {
  id: string
  conta_bancaria_id: string
  data: string
  descricao: string
  referencia: string | null
  tipo: "debito" | "credito"
  valor: number
  saldo_apos: number | null
  conciliado: boolean
  documento_tipo: string | null
  documento_id: string | null
  conta_bancaria?: ContaBancaria
}

interface FechoMensal {
  id: string
  empresa_id: string
  mes: number
  ano: number
  estado: "aberto" | "em_revisao" | "fechado"
  total_facturas: number
  total_recibos: number
  total_despesas: number
  total_salarios: number
  iva_a_entregar: number
  iva_cobrado: number
  iva_suportado: number
  resultado_liquido: number
  saldo_bancario_extrato: number | null
  saldo_bancario_sistema: number | null
  diferenca_conciliacao: number | null
  data_inicio_revisao: string | null
  data_fecho: string | null
  observacoes: string | null
}

interface Factura {
  id: string
  numero_documento: string | null
  numero: string | null
  tipo_documento: string
  total: number
  iva: number | null
  estado: string
  created_at: string
}

interface Recibo {
  id: string
  numero_recibo: string
  valor: number
  created_at: string
  conta_bancaria_id: string | null
}

interface Despesa {
  id: string
  descricao: string
  valor: number
  iva_suportado: number | null
  data: string
  estado: string
  conta_bancaria_id: string | null
}

interface PagamentoSalario {
  id: string
  valor_liquido: number
  data_pagamento: string
  estado: string
  conta_bancaria_id: string | null
}

interface ConciliacaoClientProps {
  contasBancarias: ContaBancaria[]
  movimentos: MovimentoBancario[]
  fechosMensais: FechoMensal[]
  facturas: Factura[]
  recibos: Recibo[]
  despesas: Despesa[]
  pagamentosSalarios: PagamentoSalario[]
  empresaId: string
}

const meses = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" }, { value: 4, label: "Abril" },
  { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" }, { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
]

export function ConciliacaoClient({
  contasBancarias: initialContas,
  movimentos: initialMovimentos,
  fechosMensais: initialFechos,
  facturas,
  recibos,
  despesas,
  pagamentosSalarios,
  empresaId,
}: ConciliacaoClientProps) {
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>(initialContas)
  const [movimentos, setMovimentos] = useState<MovimentoBancario[]>(initialMovimentos)
  const [fechosMensais, setFechosMensais] = useState<FechoMensal[]>(initialFechos)
  const [searchTerm, setSearchTerm] = useState("")
  const [isContaOpen, setIsContaOpen] = useState(false)
  const [isMovimentoOpen, setIsMovimentoOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState("contas")
  const router = useRouter()

  const currentDate = new Date()
  const [selectedMes, setSelectedMes] = useState(currentDate.getMonth() + 1)
  const [selectedAno, setSelectedAno] = useState(currentDate.getFullYear())
  const [selectedContaId, setSelectedContaId] = useState<string>("")
  // FIX Bug #4: estado para editar saldo extrato e calcular diferença de conciliação
  const [saldoExtratoInput, setSaldoExtratoInput] = useState<string>("")
  const [isEditingExtrato, setIsEditingExtrato] = useState(false)

  const [contaForm, setContaForm] = useState({
    nome: "", banco: "", numero_conta: "", iban: "", swift: "", moeda: "MZN", saldo_inicial: "0",
  })

  const [movimentoForm, setMovimentoForm] = useState({
    conta_bancaria_id: "",
    data: new Date().toISOString().split("T")[0],
    descricao: "", referencia: "",
    tipo: "debito" as "debito" | "credito",
    valor: "",
  })

  const estatisticas = useMemo(() => {
    const totalSaldos = contasBancarias.reduce((acc, c) => acc + c.saldo_atual, 0)
    const movimentosMes = movimentos.filter((m) => {
      const data = new Date(m.data)
      return data.getMonth() + 1 === selectedMes && data.getFullYear() === selectedAno
    })
    const entradas = movimentosMes.filter((m) => m.tipo === "credito").reduce((acc, m) => acc + m.valor, 0)
    const saidas = movimentosMes.filter((m) => m.tipo === "debito").reduce((acc, m) => acc + m.valor, 0)
    const naoConciliados = movimentos.filter((m) => !m.conciliado).length
    return { totalSaldos, entradas, saidas, naoConciliados, totalContas: contasBancarias.length }
  }, [contasBancarias, movimentos, selectedMes, selectedAno])

  const filteredMovimentos = movimentos.filter((m) => {
    const matchSearch =
      m.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.referencia?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchConta = !selectedContaId || m.conta_bancaria_id === selectedContaId
    return matchSearch && matchConta
  })

  const fechoAtual = fechosMensais.find((f) => f.mes === selectedMes && f.ano === selectedAno)

  // Calcular dados do período seleccionado
  const dadosPeriodo = useMemo(() => {
    // Filtrar facturas do período (por tipo FT = Factura, NC = Nota de Crédito)
    const facturasMes = facturas.filter((f) => {
      const d = new Date(f.created_at)
      return d.getMonth() + 1 === selectedMes && d.getFullYear() === selectedAno && f.tipo_documento === "FT"
    })
    const ncMes = facturas.filter((f) => {
      const d = new Date(f.created_at)
      return d.getMonth() + 1 === selectedMes && d.getFullYear() === selectedAno && f.tipo_documento === "NC"
    })
    
    // Filtrar recibos do período
    const recibosMes = recibos.filter((r) => {
      const d = new Date(r.created_at)
      return d.getMonth() + 1 === selectedMes && d.getFullYear() === selectedAno
    })
    
    // Filtrar despesas pagas do período
    const despesasMes = despesas.filter((d) => {
      const dd = new Date(d.data)
      return dd.getMonth() + 1 === selectedMes && dd.getFullYear() === selectedAno && d.estado === "Pago"
    })
    
    // Filtrar salários pagos do período
    const salariosMes = pagamentosSalarios.filter((s) => {
      const d = new Date(s.data_pagamento)
      return d.getMonth() + 1 === selectedMes && d.getFullYear() === selectedAno && s.estado === "Pago"
    })
    
    // Calcular totais
    const totalFacturas = facturasMes.reduce((a, f) => a + (Number(f.total) || 0), 0)
    const totalNC = ncMes.reduce((a, f) => a + (Number(f.total) || 0), 0)
    const totalRecibos = recibosMes.reduce((a, r) => a + (Number(r.valor) || 0), 0)
    const totalDespesas = despesasMes.reduce((a, d) => a + (Number(d.valor) || 0), 0)
    const totalSalarios = salariosMes.reduce((a, s) => a + (Number(s.valor_liquido) || 0), 0)
    
    // IVA - Subtrair IVA das notas de crédito (como nos relatórios)
    const ivaCobrado = facturasMes.reduce((a, f) => a + (Number(f.iva) || 0), 0)
    const ivaNotasCredito = ncMes.reduce((a, f) => a + (Number(f.iva) || 0), 0)
    const ivaSuportado = despesasMes.reduce((a, d) => a + (Number(d.iva_suportado) || 0), 0)
    const ivaAEntregar = Math.max(0, ivaCobrado - ivaNotasCredito - ivaSuportado)
    
    // Resultado líquido = Receitas (facturas - NC) - Despesas - Salários - IVA a entregar
    const resultadoLiquido = (totalFacturas - totalNC) - totalDespesas - totalSalarios - ivaAEntregar
    
    const saldoBancarioSistema = contasBancarias.reduce((a, c) => a + c.saldo_atual, 0)
    
    return {
      totalFacturas,
      totalNC,
      totalRecibos,
      totalDespesas,
      totalSalarios,
      ivaCobrado,
      ivaNotasCredito,
      ivaSuportado,
      ivaAEntregar,
      resultadoLiquido,
      saldoBancarioSistema,
      numFacturas: facturasMes.length,
      numNC: ncMes.length,
      numRecibos: recibosMes.length,
      numDespesas: despesasMes.length,
      numSalarios: salariosMes.length,
    }
  }, [selectedMes, selectedAno, facturas, recibos, despesas, pagamentosSalarios, contasBancarias])

  const handleSubmitConta = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const supabase = createClient()
      const saldoInicial = parseFloat(contaForm.saldo_inicial) || 0
      const { data, error } = await supabase
        .from("contas_bancarias")
        .insert({
          empresa_id: empresaId,
          nome: contaForm.nome, banco: contaForm.banco || null,
          numero_conta: contaForm.numero_conta || null,
          iban: contaForm.iban || null, swift: contaForm.swift || null,
          moeda: contaForm.moeda, saldo_inicial: saldoInicial, saldo_atual: saldoInicial, ativa: true,
        })
        .select().single()
      if (error) throw error
      setContasBancarias([data, ...contasBancarias])
      setContaForm({ nome: "", banco: "", numero_conta: "", iban: "", swift: "", moeda: "MZN", saldo_inicial: "0" })
      setIsContaOpen(false)
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Erro ao criar conta bancária")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitMovimento = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const supabase = createClient()
      const valor = parseFloat(movimentoForm.valor) || 0
      const conta = contasBancarias.find((c) => c.id === movimentoForm.conta_bancaria_id)
      if (!conta) throw new Error("Conta não encontrada")

      // FIX Bug #1: calcular saldo_apos com base na posição cronológica do movimento
      // Em vez de usar saldo_atual (que reflecte hoje), recalcular a partir do saldo_inicial
      const movsConta = movimentos
        .filter((m) => m.conta_bancaria_id === conta.id)
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

      // Saldo acumulado até à data do novo movimento (exclusive — não inclui movimentos depois desta data)
      const saldoAntes = movsConta
        .filter((m) => m.data <= movimentoForm.data)
        .reduce((acc, m) => (m.tipo === "credito" ? acc + m.valor : acc - m.valor), conta.saldo_inicial)

      const novoSaldoApos = movimentoForm.tipo === "credito" ? saldoAntes + valor : saldoAntes - valor

      // saldo_atual da conta: sempre actualizar com base no movimento real (independente da data)
      const novoSaldoAtual = movimentoForm.tipo === "credito" ? conta.saldo_atual + valor : conta.saldo_atual - valor

      const { data: movimento, error: movError } = await supabase
        .from("movimentos_bancarios")
        .insert({
          conta_bancaria_id: movimentoForm.conta_bancaria_id,
          data: movimentoForm.data,
          descricao: movimentoForm.descricao,
          referencia: movimentoForm.referencia || null,
          tipo: movimentoForm.tipo, valor, saldo_apos: novoSaldoApos, conciliado: false,
        })
        .select(`*, conta_bancaria:contas_bancarias(*)`).single()
      if (movError) throw movError

      const { error: contaError } = await supabase
        .from("contas_bancarias")
        .update({ saldo_atual: novoSaldoAtual, updated_at: new Date().toISOString() })
        .eq("id", movimentoForm.conta_bancaria_id)
      if (contaError) throw contaError

      setMovimentos([movimento, ...movimentos])
      setContasBancarias(contasBancarias.map((c) => c.id === movimentoForm.conta_bancaria_id ? { ...c, saldo_atual: novoSaldoAtual } : c))
      setMovimentoForm({ conta_bancaria_id: "", data: new Date().toISOString().split("T")[0], descricao: "", referencia: "", tipo: "debito", valor: "" })
      setIsMovimentoOpen(false)
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Erro ao criar movimento")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConciliar = async (movimentoId: string) => {
    setLoadingStates((prev) => ({ ...prev, [movimentoId]: true }))
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("movimentos_bancarios")
        .update({ conciliado: true, data_conciliacao: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", movimentoId)
      if (error) throw error
      setMovimentos(movimentos.map((m) => m.id === movimentoId ? { ...m, conciliado: true, data_conciliacao: new Date().toISOString() } : m))
    } catch (error: any) {
      alert(error.message || "Erro ao conciliar movimento")
    } finally {
      setLoadingStates((prev) => ({ ...prev, [movimentoId]: false }))
    }
  }

  const handleCriarFecho = async () => {
    if (fechoAtual) { alert("Já existe um fecho para este mês"); return }
    setIsLoading(true)
    try {
      const supabase = createClient()
      // Usar dados calculados automaticamente do período
      const { data, error } = await supabase
        .from("fechos_mensais")
        .insert({
          empresa_id: empresaId,
          mes: selectedMes, ano: selectedAno, estado: "aberto",
          total_facturas: dadosPeriodo.totalFacturas,
          total_recibos: dadosPeriodo.totalRecibos,
          total_despesas: dadosPeriodo.totalDespesas,
          total_salarios: dadosPeriodo.totalSalarios,
          iva_a_entregar: dadosPeriodo.ivaAEntregar,
          iva_cobrado: dadosPeriodo.ivaCobrado,
          iva_suportado: dadosPeriodo.ivaSuportado,
          resultado_liquido: dadosPeriodo.resultadoLiquido,
          saldo_bancario_sistema: dadosPeriodo.saldoBancarioSistema,
        })
        .select().single()
      if (error) throw error
      setFechosMensais([data, ...fechosMensais])
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Erro ao criar fecho mensal")
    } finally {
      setIsLoading(false)
    }
  }

  // FIX Bug #4: actualizar saldo do extracto e calcular diferença de conciliação
  const handleAtualizarExtrato = async () => {
    if (!fechoAtual) return
    const extrato = parseFloat(saldoExtratoInput)
    if (isNaN(extrato)) { alert("Valor inválido"); return }
    setIsLoading(true)
    try {
      const supabase = createClient()
      const sistema = fechoAtual.saldo_bancario_sistema ?? contasBancarias.reduce((a, c) => a + c.saldo_atual, 0)
      const diferenca = extrato - sistema
      const { error } = await supabase
        .from("fechos_mensais")
        .update({
          saldo_bancario_extrato: extrato,
          diferenca_conciliacao: diferenca,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fechoAtual.id)
      if (error) throw error
      setFechosMensais(fechosMensais.map((f) =>
        f.id === fechoAtual.id
          ? { ...f, saldo_bancario_extrato: extrato, diferenca_conciliacao: diferenca }
          : f
      ))
      setIsEditingExtrato(false)
    } catch (error: any) {
      alert(error.message || "Erro ao actualizar saldo")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFecharMes = async () => {
    if (!fechoAtual) return
    if (fechoAtual.estado === "fechado") { alert("Este mês já está fechado"); return }

    // FIX Bug 3: verificar movimentos não conciliados no mês antes de fechar
    const movimentosMesNaoConciliados = movimentos.filter((m) => {
      const d = new Date(m.data)
      return d.getMonth() + 1 === selectedMes && d.getFullYear() === selectedAno && !m.conciliado
    })

    if (movimentosMesNaoConciliados.length > 0) {
      const confirmar = confirm(
        `Existem ${movimentosMesNaoConciliados.length} movimento(s) não conciliados em ${meses.find((m) => m.value === selectedMes)?.label} ${selectedAno}.\n\nRecomendamos conciliar todos os movimentos antes de fechar o mês.\n\nDeseja fechar mesmo assim?`
      )
      if (!confirmar) return
    } else {
      if (!confirm("Tem certeza que deseja fechar este mês? Esta ação não pode ser desfeita.")) return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const totalSaldos = contasBancarias.reduce((acc, c) => acc + c.saldo_atual, 0)
      const { error } = await supabase
        .from("fechos_mensais")
        .update({
          estado: "fechado", data_fecho: new Date().toISOString(),
          saldo_bancario_sistema: totalSaldos, updated_at: new Date().toISOString(),
        })
        .eq("id", fechoAtual.id)
      if (error) throw error
      setFechosMensais(fechosMensais.map((f) =>
        f.id === fechoAtual.id
          ? { ...f, estado: "fechado" as const, data_fecho: new Date().toISOString(), saldo_bancario_sistema: totalSaldos }
          : f
      ))
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Erro ao fechar mês")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN" }).format(value)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const getEstadoFechoBadge = (estado: string) => {
    switch (estado) {
      case "aberto": return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20"><Unlock className="mr-1 h-3 w-3" /> Aberto</Badge>
      case "em_revisao": return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"><AlertCircle className="mr-1 h-3 w-3" /> Em Revisão</Badge>
      case "fechado": return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20"><Lock className="mr-1 h-3 w-3" /> Fechado</Badge>
      default: return <Badge variant="secondary">{estado}</Badge>
    }
  }

  // FIX Bug 3: contar movimentos não conciliados do mês seleccionado
  const movimentosMesNaoConciliados = movimentos.filter((m) => {
    const d = new Date(m.data)
    return d.getMonth() + 1 === selectedMes && d.getFullYear() === selectedAno && !m.conciliado
  }).length

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estatisticas.totalSaldos)}</div>
            <p className="text-xs text-muted-foreground">{estatisticas.totalContas} conta(s) ativa(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(estatisticas.entradas)}</div>
            <p className="text-xs text-muted-foreground">{meses.find((m) => m.value === selectedMes)?.label} {selectedAno}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(estatisticas.saidas)}</div>
            <p className="text-xs text-muted-foreground">{meses.find((m) => m.value === selectedMes)?.label} {selectedAno}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Conciliados</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.naoConciliados}</div>
            <p className="text-xs text-muted-foreground">movimento(s) pendente(s)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="contas">Contas Bancárias</TabsTrigger>
            <TabsTrigger value="movimentos">Movimentos</TabsTrigger>
            <TabsTrigger value="fecho">Fecho Mensal</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Select value={selectedMes.toString()} onValueChange={(v) => setSelectedMes(parseInt(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {meses.map((m) => (<SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={selectedAno.toString()} onValueChange={(v) => setSelectedAno(parseInt(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((a) => (<SelectItem key={a} value={a.toString()}>{a}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contas Bancárias */}
        <TabsContent value="contas" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isContaOpen} onOpenChange={setIsContaOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Nova Conta</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Conta Bancária</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmitConta} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Conta *</Label>
                    <Input value={contaForm.nome} onChange={(e) => setContaForm({ ...contaForm, nome: e.target.value })} placeholder="Ex: Conta Principal BCI" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Banco *</Label>
                      <Input value={contaForm.banco} onChange={(e) => setContaForm({ ...contaForm, banco: e.target.value })} placeholder="Ex: BCI, Millennium BIM" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Número da Conta *</Label>
                      <Input value={contaForm.numero_conta} onChange={(e) => setContaForm({ ...contaForm, numero_conta: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>IBAN</Label>
                      <Input value={contaForm.iban} onChange={(e) => setContaForm({ ...contaForm, iban: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>SWIFT/BIC</Label>
                      <Input value={contaForm.swift} onChange={(e) => setContaForm({ ...contaForm, swift: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Moeda</Label>
                      <Select value={contaForm.moeda} onValueChange={(v) => setContaForm({ ...contaForm, moeda: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MZN">MZN - Metical</SelectItem>
                          <SelectItem value="USD">USD - Dólar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="ZAR">ZAR - Rand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Saldo Inicial</Label>
                      <Input type="number" step="0.01" value={contaForm.saldo_inicial} onChange={(e) => setContaForm({ ...contaForm, saldo_inicial: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsContaOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? "A criar..." : "Criar Conta"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contasBancarias.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma conta bancária registada. Clique em Nova Conta para adicionar.
                </CardContent>
              </Card>
            ) : (
              contasBancarias.map((conta) => (
                <Card key={conta.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{conta.nome}</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(conta.saldo_atual)}</div>
                    <p className="text-xs text-muted-foreground">{conta.banco} - {conta.numero_conta}</p>
                    <Badge variant="outline" className="mt-2">{conta.moeda}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Movimentos */}
        <TabsContent value="movimentos" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Procurar movimentos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={selectedContaId || "all"} onValueChange={(v) => setSelectedContaId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas as contas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {contasBancarias.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isMovimentoOpen} onOpenChange={setIsMovimentoOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Novo Movimento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Movimento Bancário</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmitMovimento} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Conta *</Label>
                    <Select value={movimentoForm.conta_bancaria_id} onValueChange={(v) => setMovimentoForm({ ...movimentoForm, conta_bancaria_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccione a conta" /></SelectTrigger>
                      <SelectContent>
                        {contasBancarias.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome} ({formatCurrency(c.saldo_atual)})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data *</Label>
                      <Input type="date" value={movimentoForm.data} onChange={(e) => setMovimentoForm({ ...movimentoForm, data: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select value={movimentoForm.tipo} onValueChange={(v: "debito" | "credito") => setMovimentoForm({ ...movimentoForm, tipo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credito">Crédito (Entrada)</SelectItem>
                          <SelectItem value="debito">Débito (Saída)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Input value={movimentoForm.descricao} onChange={(e) => setMovimentoForm({ ...movimentoForm, descricao: e.target.value })} placeholder="Descrição do movimento" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor *</Label>
                      <Input type="number" step="0.01" value={movimentoForm.valor} onChange={(e) => setMovimentoForm({ ...movimentoForm, valor: e.target.value })} placeholder="0.00" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Referência</Label>
                      <Input value={movimentoForm.referencia} onChange={(e) => setMovimentoForm({ ...movimentoForm, referencia: e.target.value })} placeholder="Referência do banco" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsMovimentoOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? "A criar..." : "Criar Movimento"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovimentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Nenhum movimento encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filteredMovimentos.map((movimento) => (
                    <TableRow key={movimento.id}>
                      <TableCell>{formatDate(movimento.data)}</TableCell>
                      <TableCell>{movimento.conta_bancaria?.nome || "-"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{movimento.descricao}</p>
                          {movimento.referencia && <p className="text-xs text-muted-foreground">Ref: {movimento.referencia}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {movimento.tipo === "credito"
                          ? <Badge className="bg-green-500/10 text-green-600"><ArrowDownLeft className="mr-1 h-3 w-3" /> Crédito</Badge>
                          : <Badge className="bg-red-500/10 text-red-600"><ArrowUpRight className="mr-1 h-3 w-3" /> Débito</Badge>}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${movimento.tipo === "credito" ? "text-green-600" : "text-red-600"}`}>
                        {movimento.tipo === "credito" ? "+" : "-"}{formatCurrency(movimento.valor)}
                      </TableCell>
                      <TableCell className="text-right">{movimento.saldo_apos ? formatCurrency(movimento.saldo_apos) : "-"}</TableCell>
                      <TableCell>
                        {movimento.conciliado
                          ? <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="mr-1 h-3 w-3" /> Conciliado</Badge>
                          : <Badge className="bg-yellow-500/10 text-yellow-600"><AlertCircle className="mr-1 h-3 w-3" /> Pendente</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {!movimento.conciliado && (
                          <Button variant="ghost" size="sm" onClick={() => handleConciliar(movimento.id)} disabled={loadingStates[movimento.id]} title="Conciliar">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Fecho Mensal */}
        <TabsContent value="fecho" className="space-y-4">
          {/* FIX Bug 3: aviso de movimentos não conciliados no mês */}
          {movimentosMesNaoConciliados > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Existem <strong>{movimentosMesNaoConciliados}</strong> movimento(s) não conciliados em {meses.find((m) => m.value === selectedMes)?.label} {selectedAno}.
                Recomendamos conciliar antes de fechar o mês.
              </span>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fecho de {meses.find((m) => m.value === selectedMes)?.label} {selectedAno}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Resumo financeiro e conciliação do período</p>
                </div>
                {fechoAtual ? getEstadoFechoBadge(fechoAtual.estado) : <Badge variant="outline">Não iniciado</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!fechoAtual ? (
                <div className="space-y-6">
                  {/* Pré-visualização dos dados do período */}
                  <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                    <h4 className="font-medium mb-3 text-primary">Pré-visualização - Dados Automáticos do Período</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      Estes valores são calculados automaticamente a partir das facturas, recibos, despesas e salários registados no sistema.
                    </p>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Total Facturas</p>
                        </div>
                        <p className="text-lg font-bold">{formatCurrency(dadosPeriodo.totalFacturas)}</p>
                        <p className="text-xs text-muted-foreground">{dadosPeriodo.numFacturas} factura(s) emitida(s)</p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Receipt className="h-4 w-4 text-green-600" />
                          <p className="text-xs text-muted-foreground">Total Recibos</p>
                        </div>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(dadosPeriodo.totalRecibos)}</p>
                        <p className="text-xs text-muted-foreground">{dadosPeriodo.numRecibos} recibo(s) emitido(s)</p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="h-4 w-4 text-red-600" />
                          <p className="text-xs text-muted-foreground">Total Despesas</p>
                        </div>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(dadosPeriodo.totalDespesas)}</p>
                        <p className="text-xs text-muted-foreground">{dadosPeriodo.numDespesas} despesa(s) paga(s)</p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Total Salários</p>
                        </div>
                        <p className="text-lg font-bold">{formatCurrency(dadosPeriodo.totalSalarios)}</p>
                        <p className="text-xs text-muted-foreground">{dadosPeriodo.numSalarios} pagamento(s)</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4 mt-4">
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">IVA Cobrado (Facturas)</p>
                        <p className="text-lg font-bold">{formatCurrency(dadosPeriodo.ivaCobrado)}</p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">IVA Notas Crédito</p>
                        <p className="text-lg font-bold text-red-600">-{formatCurrency(dadosPeriodo.ivaNotasCredito)}</p>
                        <p className="text-xs text-muted-foreground">{dadosPeriodo.numNC} NC(s)</p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">IVA Suportado (Despesas)</p>
                        <p className="text-lg font-bold text-red-600">-{formatCurrency(dadosPeriodo.ivaSuportado)}</p>
                      </div>
                      <div className="rounded-lg border bg-amber-50 p-3 border-amber-200">
                        <p className="text-xs text-muted-foreground">IVA a Entregar</p>
                        <p className="text-lg font-bold text-amber-600">{formatCurrency(dadosPeriodo.ivaAEntregar)}</p>
                        <p className="text-xs text-muted-foreground">({formatCurrency(dadosPeriodo.ivaCobrado)} - {formatCurrency(dadosPeriodo.ivaNotasCredito)} - {formatCurrency(dadosPeriodo.ivaSuportado)})</p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg border-2 border-primary/30 bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Resultado Líquido do Período</p>
                          <p className="text-xs text-muted-foreground">
                            (Facturas - Notas Crédito - Despesas - Salários - IVA a Entregar)
                          </p>
                        </div>
                        <p className={`text-2xl font-bold ${dadosPeriodo.resultadoLiquido >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(dadosPeriodo.resultadoLiquido)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-4">
                      Clique abaixo para criar o fecho mensal com os valores acima.
                    </p>
                    <Button onClick={handleCriarFecho} disabled={isLoading} size="lg">
                      <Plus className="mr-2 h-4 w-4" /> Criar Fecho de {meses.find((m) => m.value === selectedMes)?.label} {selectedAno}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "Total Facturas", val: fechoAtual.total_facturas, cls: "" },
                      { label: "Total Recibos", val: fechoAtual.total_recibos, cls: "text-green-600" },
                      { label: "Total Despesas", val: fechoAtual.total_despesas, cls: "text-red-600" },
                      { label: "Total Salários", val: fechoAtual.total_salarios, cls: "" },
                    ].map(({ label, val, cls }) => (
                      <div key={label} className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className={`text-xl font-bold ${cls}`}>{formatCurrency(val)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">IVA do Período</h4>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">IVA Cobrado (Facturas)</p>
                        <p className="text-xl font-bold">{formatCurrency(fechoAtual.iva_cobrado)}</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">IVA Notas Crédito</p>
                        <p className="text-xl font-bold text-red-600">-{formatCurrency(dadosPeriodo.ivaNotasCredito)}</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">IVA Suportado (Despesas)</p>
                        <p className="text-xl font-bold text-red-600">-{formatCurrency(fechoAtual.iva_suportado)}</p>
                      </div>
                      <div className="rounded-lg border p-4 bg-amber-50 border-amber-200">
                        <p className="text-sm text-muted-foreground">IVA a Entregar</p>
                        <p className="text-xl font-bold text-amber-600">{formatCurrency(fechoAtual.iva_a_entregar)}</p>
                        <p className="text-xs text-muted-foreground">
                          (Cobrado - NC - Suportado)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Conciliação Bancária</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Saldo Sistema</p>
                        <p className="text-xl font-bold">{fechoAtual.saldo_bancario_sistema ? formatCurrency(fechoAtual.saldo_bancario_sistema) : formatCurrency(contasBancarias.reduce((a, c) => a + c.saldo_atual, 0))}</p>
                      </div>
                      {/* FIX Bug #4: saldo extrato editável */}
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground mb-1">Saldo Extracto Bancário</p>
                        {isEditingExtrato ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              value={saldoExtratoInput}
                              onChange={(e) => setSaldoExtratoInput(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="0.00"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleAtualizarExtrato} disabled={isLoading}>✓</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditingExtrato(false)}>✕</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-xl font-bold">
                              {fechoAtual.saldo_bancario_extrato != null ? formatCurrency(fechoAtual.saldo_bancario_extrato) : <span className="text-muted-foreground text-base">Não definido</span>}
                            </p>
                            {fechoAtual.estado !== "fechado" && (
                              <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={() => { setSaldoExtratoInput(fechoAtual.saldo_bancario_extrato?.toString() || ""); setIsEditingExtrato(true) }}>
                                ✎
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={`rounded-lg border p-4 ${fechoAtual.diferenca_conciliacao != null && fechoAtual.diferenca_conciliacao !== 0 ? "border-red-300 bg-red-50" : fechoAtual.diferenca_conciliacao === 0 ? "border-green-300 bg-green-50" : ""}`}>
                        <p className="text-sm text-muted-foreground">Diferença</p>
                        <p className={`text-xl font-bold ${fechoAtual.diferenca_conciliacao != null && fechoAtual.diferenca_conciliacao !== 0 ? "text-red-600" : "text-green-600"}`}>
                          {fechoAtual.diferenca_conciliacao != null ? formatCurrency(fechoAtual.diferenca_conciliacao) : <span className="text-muted-foreground text-base">—</span>}
                        </p>
                        {fechoAtual.diferenca_conciliacao === 0 && <p className="text-xs text-green-600 mt-1">✓ Conciliado</p>}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Resultado Líquido do Período</p>
                        <p className="text-xs text-muted-foreground mb-1">
                          (Facturas - NC - Despesas - Salários - IVA a Entregar)
                        </p>
                        <p className={`text-3xl font-bold ${fechoAtual.resultado_liquido >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(fechoAtual.resultado_liquido)}
                        </p>
                      </div>
                      {fechoAtual.estado !== "fechado" && (
                        <Button onClick={handleFecharMes} disabled={isLoading} variant="destructive">
                          <Lock className="mr-2 h-4 w-4" /> Fechar Mês
                        </Button>
                      )}
                    </div>
                  </div>

                  {fechoAtual.data_fecho && (
                    <p className="text-xs text-muted-foreground">Fechado em: {formatDate(fechoAtual.data_fecho)}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
