"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Search, Plus, Eye, Calculator, Download, FileText, CheckCircle, Clock, XCircle, Banknote } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Funcionario {
  id: string
  nome: string
  cargo: string | null
  salario_base: number | null
  inss: string | null
}

interface ContaBancaria {
  id: string
  nome: string
  banco: string
  saldo_atual: number
  moeda: string
}

interface FolhaSalario {
  id: string
  empresa_id: string
  funcionario_id: string
  mes: number
  ano: number
  salario_base: number
  subsidio_alimentacao: number
  subsidio_transporte: number
  horas_extras: number
  bonus: number
  outros_rendimentos: number
  inss_trabalhador: number
  irps: number
  faltas_desconto: number
  adiantamentos: number
  outras_deducoes: number
  inss_patronal: number
  total_rendimentos: number
  total_deducoes: number
  salario_liquido: number
  estado: "pendente" | "processado" | "pago" | "cancelado"
  data_processamento: string | null
  data_pagamento: string | null
  observacoes: string | null
  created_at: string
  funcionario?: Funcionario
}

interface SalariosClientProps {
  folhaSalarios: FolhaSalario[]
  funcionarios: Funcionario[]
  empresaId: string
  contasBancarias?: ContaBancaria[] // FIX Bug #6
}

const meses = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
]

export function SalariosClient({ folhaSalarios: initialFolhaSalarios, funcionarios, empresaId, contasBancarias = [] }: SalariosClientProps) {
  const [folhaSalarios, setFolhaSalarios] = useState<FolhaSalario[]>(initialFolhaSalarios)
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  // FIX Bug #6: modal de pagamento com selecção de conta bancária
  const [pagamentoModal, setPagamentoModal] = useState<{ open: boolean; folhaId: string | null }>({ open: false, folhaId: null })
  const [pagamentoContaId, setPagamentoContaId] = useState<string>("")
  const router = useRouter()

  const currentDate = new Date()
  const [selectedMes, setSelectedMes] = useState(currentDate.getMonth() + 1)
  const [selectedAno, setSelectedAno] = useState(currentDate.getFullYear())

  const [formData, setFormData] = useState({
    funcionario_id: "",
    mes: currentDate.getMonth() + 1,
    ano: currentDate.getFullYear(),
    salario_base: "",
    subsidio_alimentacao: "0",
    subsidio_transporte: "0",
    horas_extras: "0",
    bonus: "0",
    outros_rendimentos: "0",
    inss_trabalhador: "0",
    irps: "0",
    faltas_desconto: "0",
    adiantamentos: "0",
    outras_deducoes: "0",
    observacoes: "",
  })

  // Calcular valores automaticamente
  const calculatedValues = useMemo(() => {
    const salarioBase = parseFloat(formData.salario_base) || 0
    const subsidioAlimentacao = parseFloat(formData.subsidio_alimentacao) || 0
    const subsidioTransporte = parseFloat(formData.subsidio_transporte) || 0
    const horasExtras = parseFloat(formData.horas_extras) || 0
    const bonus = parseFloat(formData.bonus) || 0
    const outrosRendimentos = parseFloat(formData.outros_rendimentos) || 0

    const inssTrabalador = parseFloat(formData.inss_trabalhador) || 0
    const irps = parseFloat(formData.irps) || 0
    const faltasDesconto = parseFloat(formData.faltas_desconto) || 0
    const adiantamentos = parseFloat(formData.adiantamentos) || 0
    const outrasDeducoes = parseFloat(formData.outras_deducoes) || 0

    const totalRendimentos = salarioBase + subsidioAlimentacao + subsidioTransporte + horasExtras + bonus + outrosRendimentos
    const totalDeducoes = inssTrabalador + irps + faltasDesconto + adiantamentos + outrasDeducoes
    const salarioLiquido = totalRendimentos - totalDeducoes
    const inssPatronal = salarioBase * 0.04 // 4% do salário base

    return {
      totalRendimentos,
      totalDeducoes,
      salarioLiquido,
      inssPatronal,
    }
  }, [formData])

  // FIX #5: IRPS calculado sobre rendimento colectável total
  // (salário base + horas extras + bónus + outros rendimentos)
  // Subsídios de alimentação/transporte têm isenções fiscais em MZ — não incluídos no colectável
  // INSS: 3% do salário base apenas
  const calcularDeducoes = (
    salarioBase: number,
    horasExtras = 0,
    bonus = 0,
    outrosRendimentos = 0
  ) => {
    // INSS trabalhador: 3% do salário base
    const inss = salarioBase * 0.03

    // IRPS: tabela moçambicana sobre rendimento colectável
    // Rendimento colectável = salário base + horas extras + bónus + outros
    // (subsídios alimentação/transporte excluídos — isentos parcialmente)
    const rendimentoColectavel = salarioBase + horasExtras + bonus + outrosRendimentos

    let irps = 0
    if (rendimentoColectavel > 42000) {
      irps = (rendimentoColectavel - 42000) * 0.32 + 8400
    } else if (rendimentoColectavel > 20000) {
      irps = (rendimentoColectavel - 20000) * 0.20 + 2000
    } else if (rendimentoColectavel > 8750) {
      irps = (rendimentoColectavel - 8750) * 0.10
    }

    return { inss, irps }
  }

  // Filtrar por mês/ano selecionado
  const filteredFolhaSalarios = folhaSalarios.filter((f) => {
    const matchSearch =
      f.funcionario?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.funcionario?.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchPeriodo = f.mes === selectedMes && f.ano === selectedAno
    return matchSearch && matchPeriodo
  })

  // Estatísticas do mês
  const estatisticas = useMemo(() => {
    const folhasMes = folhaSalarios.filter((f) => f.mes === selectedMes && f.ano === selectedAno)
    return {
      totalFuncionarios: folhasMes.length,
      totalBruto: folhasMes.reduce((acc, f) => acc + f.total_rendimentos, 0),
      totalLiquido: folhasMes.reduce((acc, f) => acc + f.salario_liquido, 0),
      totalDeducoes: folhasMes.reduce((acc, f) => acc + f.total_deducoes, 0),
      pendentes: folhasMes.filter((f) => f.estado === "pendente").length,
      processados: folhasMes.filter((f) => f.estado === "processado").length,
      pagos: folhasMes.filter((f) => f.estado === "pago").length,
    }
  }, [folhaSalarios, selectedMes, selectedAno])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      // FIX #7: verificar duplicados antes de inserir
      if (!editingId) {
        const { data: existente, error: errCheck } = await supabase
          .from("folha_salarios")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("funcionario_id", formData.funcionario_id)
          .eq("mes", formData.mes)
          .eq("ano", formData.ano)
          .maybeSingle()

        if (existente) {
          const nomeMes = meses.find((m) => m.value === formData.mes)?.label
          alert(`Já existe uma folha de salário para este funcionário em ${nomeMes} ${formData.ano}. Edite a folha existente em vez de criar uma nova.`)
          setIsLoading(false)
          return
        }
      }

      const salarioBase = parseFloat(formData.salario_base) || 0
      const subsidioAlimentacao = parseFloat(formData.subsidio_alimentacao) || 0
      const subsidioTransporte = parseFloat(formData.subsidio_transporte) || 0
      const horasExtras = parseFloat(formData.horas_extras) || 0
      const bonus = parseFloat(formData.bonus) || 0
      const outrosRendimentos = parseFloat(formData.outros_rendimentos) || 0
      const inssTrabalador = parseFloat(formData.inss_trabalhador) || 0
      const irps = parseFloat(formData.irps) || 0
      const faltasDesconto = parseFloat(formData.faltas_desconto) || 0
      const adiantamentos = parseFloat(formData.adiantamentos) || 0
      const outrasDeducoes = parseFloat(formData.outras_deducoes) || 0

      const totalRendimentos = salarioBase + subsidioAlimentacao + subsidioTransporte + horasExtras + bonus + outrosRendimentos
      const totalDeducoes = inssTrabalador + irps + faltasDesconto + adiantamentos + outrasDeducoes
      const salarioLiquido = totalRendimentos - totalDeducoes
      const inssPatronal = salarioBase * 0.04

      const dataToSave = {
        empresa_id: empresaId,
        funcionario_id: formData.funcionario_id,
        mes: formData.mes,
        ano: formData.ano,
        salario_base: salarioBase,
        subsidio_alimentacao: subsidioAlimentacao,
        subsidio_transporte: subsidioTransporte,
        horas_extras: horasExtras,
        bonus: bonus,
        outros_rendimentos: outrosRendimentos,
        inss_trabalhador: inssTrabalador,
        irps: irps,
        faltas_desconto: faltasDesconto,
        adiantamentos: adiantamentos,
        outras_deducoes: outrasDeducoes,
        inss_patronal: inssPatronal,
        total_rendimentos: totalRendimentos,
        total_deducoes: totalDeducoes,
        salario_liquido: salarioLiquido,
        observacoes: formData.observacoes || null,
        estado: "pendente",
      }

      if (editingId) {
        const { data, error } = await supabase
          .from("folha_salarios")
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq("id", editingId)
          .select(`*, funcionario:funcionarios(id, nome, cargo, salario_base, inss)`)
          .single()

        if (error) throw error
        setFolhaSalarios(folhaSalarios.map((f) => (f.id === editingId ? data : f)))
      } else {
        const { data, error } = await supabase
          .from("folha_salarios")
          .insert(dataToSave)
          .select(`*, funcionario:funcionarios(id, nome, cargo, salario_base, inss)`)
          .single()

        if (error) throw error
        setFolhaSalarios([data, ...folhaSalarios])
      }

      resetForm()
      setIsOpen(false)
      router.refresh()
    } catch (error: any) {
      alert(error.message || `Erro ao ${editingId ? "atualizar" : "criar"} folha de salário`)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      funcionario_id: "",
      mes: currentDate.getMonth() + 1,
      ano: currentDate.getFullYear(),
      salario_base: "",
      subsidio_alimentacao: "0",
      subsidio_transporte: "0",
      horas_extras: "0",
      bonus: "0",
      outros_rendimentos: "0",
      inss_trabalhador: "0",
      irps: "0",
      faltas_desconto: "0",
      adiantamentos: "0",
      outras_deducoes: "0",
      observacoes: "",
    })
    setEditingId(null)
  }

  // Recalcular INSS e IRPS quando funcionário é seleccionado
  const handleFuncionarioChange = (funcionarioId: string) => {
    const funcionario = funcionarios.find((f) => f.id === funcionarioId)
    if (funcionario) {
      const salarioBase = funcionario.salario_base || 0
      const deducoes = calcularDeducoes(salarioBase, 0, 0, 0)
      setFormData({
        ...formData,
        funcionario_id: funcionarioId,
        salario_base: salarioBase.toString(),
        inss_trabalhador: deducoes.inss.toFixed(2),
        irps: deducoes.irps.toFixed(2),
      })
    }
  }

  // FIX #5: recalcular quando salário base muda
  const handleSalarioChange = (salarioStr: string) => {
    const salarioBase = parseFloat(salarioStr) || 0
    const horasExtras = parseFloat(formData.horas_extras) || 0
    const bonus = parseFloat(formData.bonus) || 0
    const outrosRendimentos = parseFloat(formData.outros_rendimentos) || 0
    const deducoes = calcularDeducoes(salarioBase, horasExtras, bonus, outrosRendimentos)
    setFormData({
      ...formData,
      salario_base: salarioStr,
      inss_trabalhador: deducoes.inss.toFixed(2),
      irps: deducoes.irps.toFixed(2),
    })
  }

  // FIX #5: recalcular IRPS quando horas extras mudam (afectam rendimento colectável)
  const handleHorasExtrasChange = (val: string) => {
    const salarioBase = parseFloat(formData.salario_base) || 0
    const horasExtras = parseFloat(val) || 0
    const bonus = parseFloat(formData.bonus) || 0
    const outrosRendimentos = parseFloat(formData.outros_rendimentos) || 0
    const deducoes = calcularDeducoes(salarioBase, horasExtras, bonus, outrosRendimentos)
    setFormData({
      ...formData,
      horas_extras: val,
      irps: deducoes.irps.toFixed(2),
    })
  }

  // FIX #5: recalcular IRPS quando bónus muda
  const handleBonusChange = (val: string) => {
    const salarioBase = parseFloat(formData.salario_base) || 0
    const horasExtras = parseFloat(formData.horas_extras) || 0
    const bonus = parseFloat(val) || 0
    const outrosRendimentos = parseFloat(formData.outros_rendimentos) || 0
    const deducoes = calcularDeducoes(salarioBase, horasExtras, bonus, outrosRendimentos)
    setFormData({
      ...formData,
      bonus: val,
      irps: deducoes.irps.toFixed(2),
    })
  }

  // FIX #5: recalcular IRPS quando outros rendimentos mudam
  const handleOutrosRendimentosChange = (val: string) => {
    const salarioBase = parseFloat(formData.salario_base) || 0
    const horasExtras = parseFloat(formData.horas_extras) || 0
    const bonus = parseFloat(formData.bonus) || 0
    const outrosRendimentos = parseFloat(val) || 0
    const deducoes = calcularDeducoes(salarioBase, horasExtras, bonus, outrosRendimentos)
    setFormData({
      ...formData,
      outros_rendimentos: val,
      irps: deducoes.irps.toFixed(2),
    })
  }

  // FIX Bug #6: abrir modal de selecção de conta ao marcar como pago
  const handleAbrirPagamento = (folhaId: string) => {
    if (contasBancarias.length === 0) {
      // Sem contas disponíveis — pagar sem movimento bancário
      handleChangeEstado(folhaId, "pago", null)
      return
    }
    setPagamentoContaId(contasBancarias[0]?.id || "")
    setPagamentoModal({ open: true, folhaId })
  }

  const handleConfirmarPagamento = async () => {
    if (!pagamentoModal.folhaId) return
    await handleChangeEstado(pagamentoModal.folhaId, "pago", pagamentoContaId || null)
    setPagamentoModal({ open: false, folhaId: null })
  }

  const handleChangeEstado = async (folhaId: string, novoEstado: FolhaSalario["estado"], contaId?: string | null) => {
    setLoadingStates((prev) => ({ ...prev, [folhaId]: true }))

    try {
      const supabase = createClient()
      const updates: any = {
        estado: novoEstado,
        updated_at: new Date().toISOString(),
      }

      if (novoEstado === "processado") {
        updates.data_processamento = new Date().toISOString()
      } else if (novoEstado === "pago") {
        updates.data_pagamento = new Date().toISOString()

        // FIX Bug #6: criar movimento bancário de débito ao pagar
        if (contaId) {
          const folha = folhaSalarios.find((f) => f.id === folhaId)
          const conta = contasBancarias.find((c) => c.id === contaId)
          if (folha && conta) {
            const nomeMes = meses.find((m) => m.value === folha.mes)?.label || folha.mes
            const novoSaldo = conta.saldo_atual - folha.salario_liquido

            const { error: movError } = await supabase
              .from("movimentos_bancarios")
              .insert({
                conta_bancaria_id: contaId,
                data: new Date().toISOString().split("T")[0],
                descricao: `Salário ${folha.funcionario?.nome || "Funcionário"} — ${nomeMes} ${folha.ano}`,
                referencia: `SAL-${folha.id.slice(0, 8).toUpperCase()}`,
                tipo: "debito",
                valor: folha.salario_liquido,
                saldo_apos: novoSaldo,
                conciliado: false,
                documento_tipo: "folha_salario",
                documento_id: folhaId,
              })
            if (movError) throw movError

            await supabase
              .from("contas_bancarias")
              .update({ saldo_atual: novoSaldo, updated_at: new Date().toISOString() })
              .eq("id", contaId)
          }
        }
      }

      const { error } = await supabase.from("folha_salarios").update(updates).eq("id", folhaId)

      if (error) throw error

      setFolhaSalarios(
        folhaSalarios.map((f) =>
          f.id === folhaId
            ? {
              ...f,
              estado: novoEstado,
              data_processamento: updates.data_processamento || f.data_processamento,
              data_pagamento: updates.data_pagamento || f.data_pagamento,
            }
            : f
        )
      )
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Erro ao atualizar estado")
    } finally {
      setLoadingStates((prev) => ({ ...prev, [folhaId]: false }))
    }
  }

  const handleProcessarTodos = async () => {
    const pendentes = filteredFolhaSalarios.filter((f) => f.estado === "pendente")
    if (pendentes.length === 0) {
      alert("Não há folhas pendentes para processar")
      return
    }

    if (!confirm(`Deseja processar ${pendentes.length} folha(s) de salário?`)) return

    setIsLoading(true)
    try {
      const supabase = createClient()
      const now = new Date().toISOString()

      const { error } = await supabase
        .from("folha_salarios")
        .update({
          estado: "processado",
          data_processamento: now,
          updated_at: now,
        })
        .in(
          "id",
          pendentes.map((p) => p.id)
        )

      if (error) throw error

      setFolhaSalarios(
        folhaSalarios.map((f) =>
          pendentes.find((p) => p.id === f.id)
            ? { ...f, estado: "processado" as const, data_processamento: now }
            : f
        )
      )

      router.refresh()
    } catch (error: any) {
      alert(error.message || "Erro ao processar folhas")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendente":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">
            <Clock className="mr-1 h-3 w-3" /> Pendente
          </Badge>
        )
      case "processado":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
            <CheckCircle className="mr-1 h-3 w-3" /> Processado
          </Badge>
        )
      case "pago":
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
            <Banknote className="mr-1 h-3 w-3" /> Pago
          </Badge>
        )
      case "cancelado":
        return (
          <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
            <XCircle className="mr-1 h-3 w-3" /> Cancelado
          </Badge>
        )
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const viewingFolha = viewingId ? folhaSalarios.find((f) => f.id === viewingId) : null

  return (
    <div className="p-6 space-y-6">
      {/* Estatísticas do Mês */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bruto</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estatisticas.totalBruto)}</div>
            <p className="text-xs text-muted-foreground">{estatisticas.totalFuncionarios} funcionário(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Líquido</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estatisticas.totalLiquido)}</div>
            <p className="text-xs text-muted-foreground">A pagar aos funcionários</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deduções</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estatisticas.totalDeducoes)}</div>
            <p className="text-xs text-muted-foreground">INSS + IRPS + Outros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.pagos}/{estatisticas.totalFuncionarios}</div>
            <p className="text-xs text-muted-foreground">
              {estatisticas.pendentes} pendente(s), {estatisticas.processados} processado(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Procurar funcionário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedMes.toString()} onValueChange={(v) => setSelectedMes(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedAno.toString()} onValueChange={(v) => setSelectedAno(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((a) => (
                  <SelectItem key={a} value={a.toString()}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleProcessarTodos} disabled={isLoading || estatisticas.pendentes === 0}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Processar Todos
          </Button>
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Folha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Folha de Salário" : "Nova Folha de Salário"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="funcionario_id">Funcionário *</Label>
                    <Select value={formData.funcionario_id} onValueChange={handleFuncionarioChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {funcionarios.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome} {f.cargo ? `(${f.cargo})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mes">Mês *</Label>
                    <Select
                      value={formData.mes.toString()}
                      onValueChange={(v) => setFormData({ ...formData, mes: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {meses.map((m) => (
                          <SelectItem key={m.value} value={m.value.toString()}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ano">Ano *</Label>
                    <Select
                      value={formData.ano.toString()}
                      onValueChange={(v) => setFormData({ ...formData, ano: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026].map((a) => (
                          <SelectItem key={a} value={a.toString()}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Rendimentos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salario_base">Salário Base (MZN) *</Label>
                      <Input
                        id="salario_base"
                        type="number"
                        step="0.01"
                        value={formData.salario_base}
                        onChange={(e) => handleSalarioChange(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subsidio_alimentacao">Subsídio Alimentação</Label>
                      <Input
                        id="subsidio_alimentacao"
                        type="number"
                        step="0.01"
                        value={formData.subsidio_alimentacao}
                        onChange={(e) => setFormData({ ...formData, subsidio_alimentacao: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subsidio_transporte">Subsídio Transporte</Label>
                      <Input
                        id="subsidio_transporte"
                        type="number"
                        step="0.01"
                        value={formData.subsidio_transporte}
                        onChange={(e) => setFormData({ ...formData, subsidio_transporte: e.target.value })}
                      />
                    </div>
                    {/* FIX #5: horas extras afectam IRPS — usa handler dedicado */}
                    <div className="space-y-2">
                      <Label htmlFor="horas_extras">Horas Extras</Label>
                      <Input
                        id="horas_extras"
                        type="number"
                        step="0.01"
                        value={formData.horas_extras}
                        onChange={(e) => handleHorasExtrasChange(e.target.value)}
                      />
                    </div>
                    {/* FIX #5: bónus afecta IRPS — usa handler dedicado */}
                    <div className="space-y-2">
                      <Label htmlFor="bonus">Bónus</Label>
                      <Input
                        id="bonus"
                        type="number"
                        step="0.01"
                        value={formData.bonus}
                        onChange={(e) => handleBonusChange(e.target.value)}
                      />
                    </div>
                    {/* FIX #5: outros rendimentos afectam IRPS — usa handler dedicado */}
                    <div className="space-y-2">
                      <Label htmlFor="outros_rendimentos">Outros Rendimentos</Label>
                      <Input
                        id="outros_rendimentos"
                        type="number"
                        step="0.01"
                        value={formData.outros_rendimentos}
                        onChange={(e) => handleOutrosRendimentosChange(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-1">Deduções</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    INSS (3%) calculado sobre salário base. IRPS calculado sobre rendimento colectável (salário + extras + bónus).
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inss_trabalhador">INSS Trabalhador (3%)</Label>
                      <Input
                        id="inss_trabalhador"
                        type="number"
                        step="0.01"
                        value={formData.inss_trabalhador}
                        onChange={(e) => setFormData({ ...formData, inss_trabalhador: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="irps">IRPS (auto-calculado)</Label>
                      <Input
                        id="irps"
                        type="number"
                        step="0.01"
                        value={formData.irps}
                        onChange={(e) => setFormData({ ...formData, irps: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="faltas_desconto">Descontos por Faltas</Label>
                      <Input
                        id="faltas_desconto"
                        type="number"
                        step="0.01"
                        value={formData.faltas_desconto}
                        onChange={(e) => setFormData({ ...formData, faltas_desconto: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adiantamentos">Adiantamentos</Label>
                      <Input
                        id="adiantamentos"
                        type="number"
                        step="0.01"
                        value={formData.adiantamentos}
                        onChange={(e) => setFormData({ ...formData, adiantamentos: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="outras_deducoes">Outras Deduções</Label>
                      <Input
                        id="outras_deducoes"
                        type="number"
                        step="0.01"
                        value={formData.outras_deducoes}
                        onChange={(e) => setFormData({ ...formData, outras_deducoes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Resumo Calculado */}
                <div className="border-t pt-4 bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Resumo</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Rendimentos</p>
                      <p className="font-semibold text-green-600">{formatCurrency(calculatedValues.totalRendimentos)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Deduções</p>
                      <p className="font-semibold text-red-600">{formatCurrency(calculatedValues.totalDeducoes)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">INSS Patronal (4%)</p>
                      <p className="font-semibold">{formatCurrency(calculatedValues.inssPatronal)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Salário Líquido</p>
                      <p className="font-bold text-lg">{formatCurrency(calculatedValues.salarioLiquido)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                    className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false)
                      resetForm()
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "A guardar..." : editingId ? "Atualizar" : "Criar Folha"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabela de Folhas de Salário */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Salário Base</TableHead>
              <TableHead className="text-right">Total Rendimentos</TableHead>
              <TableHead className="text-right">Total Deduções</TableHead>
              <TableHead className="text-right">Salário Líquido</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acções</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFolhaSalarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  {folhaSalarios.length === 0
                    ? "Nenhuma folha de salário criada. Clique em 'Nova Folha' para começar."
                    : `Nenhuma folha de salário encontrada para ${meses.find((m) => m.value === selectedMes)?.label} ${selectedAno}.`}
                </TableCell>
              </TableRow>
            ) : (
              filteredFolhaSalarios.map((folha) => (
                <TableRow key={folha.id}>
                  <TableCell className="font-medium">{folha.funcionario?.nome || "-"}</TableCell>
                  <TableCell>{folha.funcionario?.cargo || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(folha.salario_base)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(folha.total_rendimentos)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(folha.total_deducoes)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(folha.salario_liquido)}</TableCell>
                  <TableCell>{getEstadoBadge(folha.estado)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingId(folha.id)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {folha.estado === "pendente" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChangeEstado(folha.id, "processado")}
                          disabled={loadingStates[folha.id]}
                          title="Processar"
                        >
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      {folha.estado === "processado" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAbrirPagamento(folha.id)}
                          disabled={loadingStates[folha.id]}
                          title="Marcar como pago"
                        >
                          <Banknote className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Visualização */}
      <Dialog open={!!viewingId} onOpenChange={() => setViewingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Folha de Salário</DialogTitle>
          </DialogHeader>
          {viewingFolha && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Funcionário</p>
                  <p className="font-semibold">{viewingFolha.funcionario?.nome}</p>
                  <p className="text-sm text-muted-foreground">{viewingFolha.funcionario?.cargo}</p>
                </div>
                {getEstadoBadge(viewingFolha.estado)}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Período: {meses.find((m) => m.value === viewingFolha.mes)?.label} {viewingFolha.ano}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium text-green-600">Rendimentos</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Salário Base:</span>
                      <span>{formatCurrency(viewingFolha.salario_base)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sub. Alimentação:</span>
                      <span>{formatCurrency(viewingFolha.subsidio_alimentacao)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sub. Transporte:</span>
                      <span>{formatCurrency(viewingFolha.subsidio_transporte)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Horas Extras:</span>
                      <span>{formatCurrency(viewingFolha.horas_extras)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bónus:</span>
                      <span>{formatCurrency(viewingFolha.bonus)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total:</span>
                      <span>{formatCurrency(viewingFolha.total_rendimentos)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-red-600">Deduções</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>INSS (3%):</span>
                      <span>{formatCurrency(viewingFolha.inss_trabalhador)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IRPS:</span>
                      <span>{formatCurrency(viewingFolha.irps)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Faltas:</span>
                      <span>{formatCurrency(viewingFolha.faltas_desconto)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adiantamentos:</span>
                      <span>{formatCurrency(viewingFolha.adiantamentos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outras:</span>
                      <span>{formatCurrency(viewingFolha.outras_deducoes)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total:</span>
                      <span>{formatCurrency(viewingFolha.total_deducoes)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Salário Líquido:</span>
                  <span className="font-bold text-xl">{formatCurrency(viewingFolha.salario_liquido)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
                  <span>INSS Patronal (4%):</span>
                  <span>{formatCurrency(viewingFolha.inss_patronal)}</span>
                </div>
              </div>

              {viewingFolha.data_processamento && (
                <p className="text-xs text-muted-foreground">
                  Processado em: {formatDate(viewingFolha.data_processamento)}
                </p>
              )}
              {viewingFolha.data_pagamento && (
                <p className="text-xs text-muted-foreground">Pago em: {formatDate(viewingFolha.data_pagamento)}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FIX Bug #6: Modal de confirmação de pagamento com selecção de conta bancária */}
      <Dialog open={pagamentoModal.open} onOpenChange={(open) => !open && setPagamentoModal({ open: false, folhaId: null })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {pagamentoModal.folhaId && (() => {
              const folha = folhaSalarios.find((f) => f.id === pagamentoModal.folhaId)
              if (!folha) return null
              return (
                <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Funcionário:</span>
                    <span className="font-medium">{folha.funcionario?.nome || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Salário Líquido:</span>
                    <span className="font-bold text-green-600">{formatCurrency(folha.salario_liquido)}</span>
                  </div>
                </div>
              )
            })()}

            {contasBancarias.length > 0 ? (
              <div className="space-y-2">
                <Label>Conta bancária a debitar</Label>
                <Select value={pagamentoContaId} onValueChange={setPagamentoContaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contasBancarias.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome} — {conta.banco} ({formatCurrency(conta.saldo_atual)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Será criado um movimento de débito na conta seleccionada.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma conta bancária configurada. O pagamento será registado sem movimento bancário.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPagamentoModal({ open: false, folhaId: null })}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmarPagamento} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                <Banknote className="mr-2 h-4 w-4" /> Confirmar Pagamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
