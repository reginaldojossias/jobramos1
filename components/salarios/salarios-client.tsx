"use client"

import type React from "react"
import { useState, useMemo, useCallback } from "react"
import {
  Search, Plus, Eye, Calculator, Download, FileText, CheckCircle,
  Clock, XCircle, Banknote, FileSpreadsheet, Printer, AlertTriangle,
  CalendarDays, Percent, ShieldCheck, Receipt
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { lancarFolhaSalario } from "@/lib/motor-lancamentos"
import { toast } from "sonner"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// ==================== CONFIGURAÇÕES LEGAIS MOÇAMBIQUE ====================
// Valores sujeitos a actualização anual - verificar junto das autoridades

const CONFIG_LEGAL = {
  // INSS
  INSS_TRABALHADOR: 0.03, // 3%
  INSS_EMPRESA: 0.04, // 4%
  TECTO_INSS: 105000, // Tecto máximo da base de incidência (verificar actualização)

  // IRPS - Tabela Progressiva 2024/2025 (valores mensais em MZN)
  // Rendimento Colectável = Salário Base + Horas Extras + Bónus + Comissões + Outros
  // Subsídios de alimentação/transporte têm isenções parciais
  IRPS_FAIXAS: [
    { min: 0, max: 8750, taxa: 0, deducao: 0 },
    { min: 8750.01, max: 20000, taxa: 0.10, deducao: 0 },
    { min: 20000.01, max: 42000, taxa: 0.20, deducao: 2250 },
    { min: 42000.01, max: 62000, taxa: 0.32, deducao: 7330 },
    { min: 62000.01, max: Infinity, taxa: 0.32, deducao: 7330 },
  ],

  // Horas Extras (Lei do Trabalho - Lei nº 23/2007)
  HORAS_EXTRAS: {
    normal: 1.5,    // +50% (horas diurnas)
    nocturna: 2.0,  // +100% (22h-5h)
    feriado: 2.5,   // +150% (domingos/feriados)
  },

  // Férias
  DIAS_FERIAS_POR_ANO: 22, // Dias úteis de férias por ano
  SUBSIDIO_FERIAS: 1.0, // 100% do salário base

  // 13º Mês
  DECIMO_TERCEIRO: 1.0, // 1 salário base completo

  // Limites
  LIMITE_DESCONTOS: 0.25, // Máximo 25% do salário líquido para descontos
}

// ==================== TIPOS ====================

interface Funcionario {
  id: string
  nome: string
  cargo: string | null
  salario_base: number | null
  inss: string | null
  data_admissao: string | null
}

interface ContaBancaria {
  id: string
  nome: string
  banco: string
  saldo_atual: number
  moeda: string
}

interface ControleFerias {
  id: string
  funcionario_id: string
  ano: number
  dias_direito: number
  dias_gozados: number
  dias_restantes: number
}

interface FolhaSalario {
  id: string
  empresa_id: string
  funcionario_id: string
  mes: number
  ano: number
  tipo_folha: "normal" | "13mes" | "ferias" | "extra"

  // Rendimentos
  salario_base: number
  subsidio_alimentacao: number
  subsidio_transporte: number
  outros_subsidios: number
  horas_extra: number
  horas_extra_nocturna: number
  horas_extra_feriado: number
  valor_horas_extra: number
  bonus: number
  comissoes: number
  subsidio_ferias: number
  decimo_terceiro: number

  // Bases de cálculo
  base_inss: number
  base_irps: number

  // Descontos
  inss_trabalhador: number
  irps: number
  faltas: number
  desconto_faltas: number
  dias_trabalhados: number
  adiantamentos: number
  outros_descontos: number

  // Totais
  total_bruto: number
  total_descontos: number
  salario_liquido: number
  inss_empresa: number
  limite_descontos: number

  // Estado e controlo
  estado: "Pendente" | "Processado" | "Pago" | "Anulado"
  data_aprovacao: string | null
  data_pagamento: string | null
  aprovado_por: string | null
  processado_por: string | null

  // Documentação
  observacoes: string | null
  recibo_gerado: boolean
  recibo_url: string | null
  maps_declarado: boolean
  inss_declarado: boolean

  created_at: string
  updated_at: string
  funcionario?: Funcionario
}

interface SalariosClientProps {
  folhaSalarios: FolhaSalario[]
  funcionarios: Funcionario[]
  controlesFerias?: ControleFerias[]
  empresaId: string
  contasBancarias?: ContaBancaria[]
  usuarioLogado?: { id: string; nome: string; cargo: string }
}

const meses = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" }, { value: 4, label: "Abril" },
  { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" }, { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
]

// ==================== FUNÇÕES DE CÁLCULO ====================

/**
 * Calcular INSS com tecto máximo
 */
const calcularINSS = (salarioBase: number): { valor: number; base: number } => {
  const baseCalculo = Math.min(salarioBase, CONFIG_LEGAL.TECTO_INSS)
  const valor = baseCalculo * CONFIG_LEGAL.INSS_TRABALHADOR
  return { valor: Math.round(valor * 100) / 100, base: baseCalculo }
}

/**
 * Calcular IRPS com tabela progressiva moçambicana
 * Rendimento colectável exclui subsídios de alimentação/transporte (isenções parciais)
 */
const calcularIRPS = (rendimentoColectavel: number): number => {
  for (const faixa of CONFIG_LEGAL.IRPS_FAIXAS) {
    if (rendimentoColectavel <= faixa.max) {
      const irps = rendimentoColectavel * faixa.taxa - faixa.deducao
      return Math.max(0, Math.round(irps * 100) / 100)
    }
  }
  return 0
}

/**
 * Calcular valor de horas extras
 */
const calcularValorHorasExtras = (
  salarioBase: number,
  horas: { normal?: number; nocturna?: number; feriado?: number }
): number => {
  const valorHora = salarioBase / 22 / 8 // 22 dias úteis, 8 horas/dia
  let total = 0

  if (horas.normal) total += horas.normal * valorHora * CONFIG_LEGAL.HORAS_EXTRAS.normal
  if (horas.nocturna) total += horas.nocturna * valorHora * CONFIG_LEGAL.HORAS_EXTRAS.nocturna
  if (horas.feriado) total += horas.feriado * valorHora * CONFIG_LEGAL.HORAS_EXTRAS.feriado

  return Math.round(total * 100) / 100
}

/**
 * Calcular subsídio de férias
 */
const calcularSubsidioFerias = (salarioBase: number, dias: number): number => {
  return Math.round((salarioBase / 30) * dias * CONFIG_LEGAL.SUBSIDIO_FERIAS * 100) / 100
}

/**
 * Validar limite de descontos (máx 25% do salário líquido)
 */
const validarLimiteDescontos = (totalDescontos: number, salarioLiquido: number): boolean => {
  const limite = salarioLiquido * CONFIG_LEGAL.LIMITE_DESCONTOS
  return totalDescontos <= limite
}

// ==================== COMPONENTE PRINCIPAL ====================

export function SalariosClient({
  folhaSalarios: initialFolhaSalarios,
  funcionarios,
  controlesFerias = [],
  empresaId,
  contasBancarias = [],
  usuarioLogado
}: SalariosClientProps) {
  const [folhaSalarios, setFolhaSalarios] = useState<FolhaSalario[]>(initialFolhaSalarios)
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [pagamentoModal, setPagamentoModal] = useState<{ open: boolean; folhaId: string | null }>({ open: false, folhaId: null })
  const [pagamentoContaId, setPagamentoContaId] = useState<string>("")
  const [reciboFolhaId, setReciboFolhaId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"folhas" | "ferias" | "declaracoes">("folhas")

  const router = useRouter()
  const currentDate = new Date()
  const [selectedMes, setSelectedMes] = useState(currentDate.getMonth() + 1)
  const [selectedAno, setSelectedAno] = useState(currentDate.getFullYear())

  // Form state com novos campos
  const [formData, setFormData] = useState({
    funcionario_id: "",
    tipo_folha: "normal" as const,
    mes: currentDate.getMonth() + 1,
    ano: currentDate.getFullYear(),
    salario_base: "",
    subsidio_alimentacao: "0",
    subsidio_transporte: "0",
    outros_subsidios: "0",
    horas_extra: "0",
    horas_extra_nocturna: "0",
    horas_extra_feriado: "0",
    valor_horas_extra: "0",
    bonus: "0",
    comissoes: "0",
    subsidio_ferias: "0",
    decimo_terceiro: "0",
    inss_trabalhador: "0",
    irps: "0",
    faltas: "0",
    desconto_faltas: "0",
    dias_trabalhados: "22",
    adiantamentos: "0",
    outros_descontos: "0",
    observacoes: "",
  })

  // ==================== CÁLCULOS AUTOMÁTICOS ====================

  const calculatedValues = useMemo(() => {
    const salarioBase = parseFloat(formData.salario_base) || 0
    const subsidioAlimentacao = parseFloat(formData.subsidio_alimentacao) || 0
    const subsidioTransporte = parseFloat(formData.subsidio_transporte) || 0
    const outrosSubsidios = parseFloat(formData.outros_subsidios) || 0
    const valorHorasExtra = parseFloat(formData.valor_horas_extra) || 0
    const bonus = parseFloat(formData.bonus) || 0
    const comissoes = parseFloat(formData.comissoes) || 0
    const subsidioFerias = parseFloat(formData.subsidio_ferias) || 0
    const decimoTerceiro = parseFloat(formData.decimo_terceiro) || 0

    // INSS: 3% sobre salário base (com tecto)
    const { valor: inss, base: baseINSS } = calcularINSS(salarioBase)

    // Rendimento colectável para IRPS (exclui subsídios alimentação/transporte)
    const rendimentoColectavel = salarioBase + valorHorasExtra + bonus + comissoes + outrosSubsidios + subsidioFerias + decimoTerceiro
    const irps = calcularIRPS(rendimentoColectavel)

    // Total Bruto
    const totalBruto = salarioBase + subsidioAlimentacao + subsidioTransporte + outrosSubsidios +
      valorHorasExtra + bonus + comissoes + subsidioFerias + decimoTerceiro

    // Descontos
    const descontoFaltas = parseFloat(formData.desconto_faltas) || 0
    const adiantamentos = parseFloat(formData.adiantamentos) || 0
    const outrosDescontos = parseFloat(formData.outros_descontos) || 0
    const totalDescontos = inss + irps + descontoFaltas + adiantamentos + outrosDescontos

    // Salário Líquido
    const salarioLiquido = totalBruto - totalDescontos

    // INSS Empresa (4% sobre base com tecto)
    const inssEmpresa = Math.round(baseINSS * CONFIG_LEGAL.INSS_EMPRESA * 100) / 100

    // Limite de descontos (25% do líquido)
    const limiteDescontos = Math.round(salarioLiquido * CONFIG_LEGAL.LIMITE_DESCONTOS * 100) / 100

    // Validação de limite
    const excedeLimite = totalDescontos > limiteDescontos && salarioLiquido > 0

    return {
      totalBruto: Math.round(totalBruto * 100) / 100,
      totalDescontos: Math.round(totalDescontos * 100) / 100,
      salarioLiquido: Math.round(salarioLiquido * 100) / 100,
      inss,
      irps,
      inssEmpresa,
      baseINSS,
      baseIRPS: rendimentoColectavel,
      limiteDescontos,
      excedeLimite,
    }
  }, [formData])

  // ==================== HANDLERS DE ACTUALIZAÇÃO ====================

  const handleFuncionarioChange = useCallback((funcionarioId: string) => {
    const funcionario = funcionarios.find((f) => f.id === funcionarioId)
    if (funcionario) {
      const salarioBase = funcionario.salario_base || 0
      const { valor: inss } = calcularINSS(salarioBase)
      const irps = calcularIRPS(salarioBase)

      setFormData(prev => ({
        ...prev,
        funcionario_id: funcionarioId,
        salario_base: salarioBase.toString(),
        inss_trabalhador: inss.toFixed(2),
        irps: irps.toFixed(2),
      }))
    }
  }, [funcionarios])

  const handleSalarioBaseChange = useCallback((value: string) => {
    const salarioBase = parseFloat(value) || 0
    const { valor: inss } = calcularINSS(salarioBase)

    // Recalcular IRPS com todos os componentes do rendimento colectável
    const rendimentoColectavel = salarioBase +
      (parseFloat(formData.valor_horas_extra) || 0) +
      (parseFloat(formData.bonus) || 0) +
      (parseFloat(formData.comissoes) || 0) +
      (parseFloat(formData.outros_subsidios) || 0) +
      (parseFloat(formData.subsidio_ferias) || 0) +
      (parseFloat(formData.decimo_terceiro) || 0)

    const irps = calcularIRPS(rendimentoColectavel)

    setFormData(prev => ({
      ...prev,
      salario_base: value,
      inss_trabalhador: inss.toFixed(2),
      irps: irps.toFixed(2),
    }))
  }, [formData])

  // Handlers para campos que afectam o IRPS
  const handleRendimentoColectavelChange = useCallback((field: string, value: string) => {
    const salarioBase = parseFloat(formData.salario_base) || 0
    const updates = { [field]: value }

    // Calcular novo rendimento colectável
    const rendimentoColectavel = salarioBase +
      (parseFloat(value) || 0) + // novo valor do campo
      (field !== 'valor_horas_extra' ? (parseFloat(formData.valor_horas_extra) || 0) : 0) +
      (field !== 'bonus' ? (parseFloat(formData.bonus) || 0) : 0) +
      (field !== 'comissoes' ? (parseFloat(formData.comissoes) || 0) : 0) +
      (field !== 'outros_subsidios' ? (parseFloat(formData.outros_subsidios) || 0) : 0) +
      (field !== 'subsidio_ferias' ? (parseFloat(formData.subsidio_ferias) || 0) : 0) +
      (field !== 'decimo_terceiro' ? (parseFloat(formData.decimo_terceiro) || 0) : 0)

    const irps = calcularIRPS(rendimentoColectavel)

    setFormData(prev => ({
      ...prev,
      ...updates,
      irps: irps.toFixed(2),
    }))
  }, [formData])

  // Handler para calcular horas extras automaticamente
  const handleCalcularHorasExtras = useCallback(() => {
    const salarioBase = parseFloat(formData.salario_base) || 0
    if (salarioBase === 0) {
      toast.warning("Preencha o salário base primeiro")
      return
    }

    const horas = {
      normal: parseFloat(formData.horas_extra) || 0,
      nocturna: parseFloat(formData.horas_extra_nocturna) || 0,
      feriado: parseFloat(formData.horas_extra_feriado) || 0,
    }

    const valorTotal = calcularValorHorasExtras(salarioBase, horas)

    // Actualizar valor e recalcular IRPS
    handleRendimentoColectavelChange('valor_horas_extra', valorTotal.toString())
    setFormData(prev => ({ ...prev, valor_horas_extra: valorTotal.toString() }))

    toast.success(`Horas extras calculadas: ${valorTotal.toFixed(2)} MZN`)
  }, [formData, handleRendimentoColectavelChange])

  // Handler para calcular subsídio de férias
  const handleCalcularFerias = useCallback(() => {
    const salarioBase = parseFloat(formData.salario_base) || 0
    const dias = parseInt(formData.dias_trabalhados) || 22

    // Calcular dias de férias proporcionais
    const diasFerias = Math.round((dias / 22) * CONFIG_LEGAL.DIAS_FERIAS_POR_ANO / 12)
    const subsidio = calcularSubsidioFerias(salarioBase, diasFerias)

    setFormData(prev => ({
      ...prev,
      subsidio_ferias: subsidio.toString(),
      dias_ferias_gozados: diasFerias,
    }))

    toast.success(`Subsídio de férias calculado: ${subsidio.toFixed(2)} MZN`)
  }, [formData])

  // Handler para 13º mês
  const handleCalcularDecimoTerceiro = useCallback(() => {
    const salarioBase = parseFloat(formData.salario_base) || 0
    const decimo = Math.round(salarioBase * CONFIG_LEGAL.DECIMO_TERCEIRO * 100) / 100

    setFormData(prev => ({
      ...prev,
      decimo_terceiro: decimo.toString(),
      tipo_folha: "13mes",
    }))

    toast.success(`13º mês calculado: ${decimo.toFixed(2)} MZN`)
  }, [formData])

  // ==================== SUBMIT ====================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (!formData.funcionario_id) {
      toast.error("Seleccione um funcionário")
      return
    }
    if (calculatedValues.excedeLimite) {
      if (!confirm(`⚠️ Os descontos (${calculatedValues.totalDescontos.toFixed(2)} MZN) excedem 25% do salário líquido. Deseja continuar?`)) {
        return
      }
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Verificar duplicados
      if (!editingId) {
        const { data: existente } = await supabase
          .from("folha_salarios")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("funcionario_id", formData.funcionario_id)
          .eq("mes", formData.mes)
          .eq("ano", formData.ano)
          .eq("tipo_folha", formData.tipo_folha)
          .maybeSingle()

        if (existente) {
          toast.error(`Já existe uma folha ${formData.tipo_folha === 'normal' ? '' : formData.tipo_folha + ' '}para este funcionário em ${meses.find(m => m.value === formData.mes)?.label} ${formData.ano}`)
          setIsLoading(false)
          return
        }
      }

      // Preparar dados
      const dataToSave = {
        empresa_id: empresaId,
        funcionario_id: formData.funcionario_id,
        mes: formData.mes,
        ano: formData.ano,
        tipo_folha: formData.tipo_folha,

        // Rendimentos
        salario_base: parseFloat(formData.salario_base) || 0,
        subsidio_alimentacao: parseFloat(formData.subsidio_alimentacao) || 0,
        subsidio_transporte: parseFloat(formData.subsidio_transporte) || 0,
        outros_subsidios: parseFloat(formData.outros_subsidios) || 0,
        horas_extra: parseFloat(formData.horas_extra) || 0,
        horas_extra_nocturna: parseFloat(formData.horas_extra_nocturna) || 0,
        horas_extra_feriado: parseFloat(formData.horas_extra_feriado) || 0,
        valor_horas_extra: parseFloat(formData.valor_horas_extra) || 0,
        bonus: parseFloat(formData.bonus) || 0,
        comissoes: parseFloat(formData.comissoes) || 0,
        subsidio_ferias: parseFloat(formData.subsidio_ferias) || 0,
        decimo_terceiro: parseFloat(formData.decimo_terceiro) || 0,

        // Bases de cálculo
        base_inss: calculatedValues.baseINSS,
        base_irps: calculatedValues.baseIRPS,

        // Descontos
        inss_trabalhador: calculatedValues.inss,
        irps: calculatedValues.irps,
        faltas: parseInt(formData.faltas) || 0,
        desconto_faltas: parseFloat(formData.desconto_faltas) || 0,
        dias_trabalhados: parseInt(formData.dias_trabalhados) || 22,
        adiantamentos: parseFloat(formData.adiantamentos) || 0,
        outros_descontos: parseFloat(formData.outros_descontos) || 0,

        // Totais
        total_bruto: calculatedValues.totalBruto,
        total_descontos: calculatedValues.totalDescontos,
        salario_liquido: calculatedValues.salarioLiquido,
        inss_empresa: calculatedValues.inssEmpresa,
        limite_descontos: calculatedValues.limiteDescontos,

        // Estado
        estado: "Pendente" as const,
        observacoes: formData.observacoes || null,

        // Documentação
        recibo_gerado: false,
        maps_declarado: false,
        inss_declarado: false,

        // Auditoria
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      let result
      if (editingId) {
        const { data, error } = await supabase
          .from("folha_salarios")
          .update(dataToSave)
          .eq("id", editingId)
          .select("*, funcionario:funcionarios!folha_salarios_funcionario_id_fkey(*)")
          .single()
        if (error) throw error
        result = data
        setFolhaSalarios(prev => prev.map(f => f.id === editingId ? result : f))
      } else {
        const { data, error } = await supabase
          .from("folha_salarios")
          .insert(dataToSave)
          .select("*, funcionario:funcionarios!folha_salarios_funcionario_id_fkey(*)")
          .single()
        if (error) throw error
        result = data
        setFolhaSalarios(prev => [result, ...prev])
      }

      // Actualizar controlo de férias se aplicável
      if (formData.tipo_folha === "ferias" && parseFloat(formData.subsidio_ferias) > 0) {
        const diasGozados = Math.round((parseInt(formData.dias_trabalhados) || 22) / 22 * 22 / 12)
        await supabase
          .from("controle_ferias")
          .upsert({
            empresa_id: empresaId,
            funcionario_id: formData.funcionario_id,
            ano: formData.ano,
            dias_gozados: diasGozados,
          }, { onConflict: "funcionario_id,ano" })
      }

      toast.success(`Folha ${formData.tipo_folha === 'normal' ? '' : formData.tipo_folha + ' '} ${editingId ? 'actualizada' : 'criada'} com sucesso`)

      resetForm()
      setIsOpen(false)
      router.refresh()

    } catch (error: any) {
      console.error("Erro ao salvar folha:", error)
      toast.error(error.message || `Erro ao ${editingId ? "actualizar" : "criar"} folha de salário`)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      funcionario_id: "",
      tipo_folha: "normal",
      mes: currentDate.getMonth() + 1,
      ano: currentDate.getFullYear(),
      salario_base: "",
      subsidio_alimentacao: "0",
      subsidio_transporte: "0",
      outros_subsidios: "0",
      horas_extra: "0",
      horas_extra_nocturna: "0",
      horas_extra_feriado: "0",
      valor_horas_extra: "0",
      bonus: "0",
      comissoes: "0",
      subsidio_ferias: "0",
      decimo_terceiro: "0",
      inss_trabalhador: "0",
      irps: "0",
      faltas: "0",
      desconto_faltas: "0",
      dias_trabalhados: "22",
      adiantamentos: "0",
      outros_descontos: "0",
      observacoes: "",
    })
    setEditingId(null)
  }

  // ==================== GERAR RECIBO PDF ====================

  const gerarReciboVencimento = useCallback((folha: FolhaSalario) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const funcionario = folha.funcionario

    // Cabeçalho da empresa
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("MAGIC PRO SERVICES, LDA.", 105, 20, { align: "center" })
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("NUIT: XXXXXXXXX | Av: FPLM, Nº 1710, R/C-2 — Maputo", 105, 26, { align: "center" })
    doc.text("Tel: 86 73 400 18 / 82 73 400 17 | info@magicproservices.com", 105, 31, { align: "center" })

    // Título
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("RECIBO DE VENCIMENTO", 105, 45, { align: "center" })

    // Dados do funcionário
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    let y = 55
    doc.text(`Funcionário: ${funcionario?.nome || "N/A"}`, 15, y)
    doc.text(`Cargo: ${funcionario?.cargo || "N/A"}`, 105, y)
    y += 6
    doc.text(`Período: ${meses.find(m => m.value === folha.mes)?.label} ${folha.ano}`, 15, y)
    doc.text(`Tipo: ${folha.tipo_folha === 'normal' ? 'Salário Normal' : folha.tipo_folha.toUpperCase()}`, 105, y)
    y += 6
    doc.text(`Nº INSS: ${funcionario?.inss || "N/A"}`, 15, y)
    doc.text(`Data Emissão: ${new Date().toLocaleDateString("pt-MZ")}`, 105, y)

    // Tabela de Rendimentos
    y += 12
    doc.setFont("helvetica", "bold")
    doc.text("RENDIMENTOS", 15, y)
    y += 6

    const rendimentos = [
      ["Salário Base", folha.salario_base],
      ...(folha.subsidio_alimentacao > 0 ? [["Subsídio Alimentação", folha.subsidio_alimentacao]] : []),
      ...(folha.subsidio_transporte > 0 ? [["Subsídio Transporte", folha.subsidio_transporte]] : []),
      ...(folha.outros_subsidios > 0 ? [["Outros Subsídios", folha.outros_subsidios]] : []),
      ...(folha.valor_horas_extra > 0 ? [["Horas Extras", folha.valor_horas_extra]] : []),
      ...(folha.bonus > 0 ? [["Bónus", folha.bonus]] : []),
      ...(folha.comissoes > 0 ? [["Comissões", folha.comissoes]] : []),
      ...(folha.subsidio_ferias > 0 ? [["Subsídio de Férias", folha.subsidio_ferias]] : []),
      ...(folha.decimo_terceiro > 0 ? [["13º Mês", folha.decimo_terceiro]] : []),
    ]

    autoTable(doc, {
      startY: y,
      head: [["Descrição", "Valor (MZN)"]],
      body: rendimentos.map(([desc, val]) => [desc, val.toFixed(2)]),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" } },
    })

    y = (doc as any).lastAutoTable.finalY + 8

    // Tabela de Descontos
    doc.setFont("helvetica", "bold")
    doc.text("DESCONTOS", 15, y)
    y += 6

    const descontos = [
      ["INSS (3%)", folha.inss_trabalhador],
      ["IRPS", folha.irps],
      ...(folha.desconto_faltas > 0 ? [["Faltas", folha.desconto_faltas]] : []),
      ...(folha.adiantamentos > 0 ? [["Adiantamentos", folha.adiantamentos]] : []),
      ...(folha.outros_descontos > 0 ? [["Outros Descontos", folha.outros_descontos]] : []),
    ]

    autoTable(doc, {
      startY: y,
      head: [["Descrição", "Valor (MZN)"]],
      body: descontos.map(([desc, val]) => [desc, val.toFixed(2)]),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" } },
    })

    y = (doc as any).lastAutoTable.finalY + 12

    // Total Líquido
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(`SALÁRIO LÍQUIDO: ${folha.salario_liquido.toFixed(2)} MZN`, 105, y, { align: "right" })

    // Rodapé
    y += 25
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text("_________________________________", 40, y)
    doc.text("_________________________________", 130, y)
    y += 5
    doc.text("O Funcionário", 40, y, { align: "center" })
    doc.text("Recursos Humanos", 130, y, { align: "center" })

    y += 15
    doc.setFontSize(8)
    doc.text("Este recibo foi gerado electronicamente pelo sistema de gestão.", 105, y, { align: "center" })
    doc.text(`ID: ${folha.id} | Gerado em: ${new Date().toLocaleString("pt-MZ")}`, 105, y + 4, { align: "center" })

    // Abrir/Download
    const pdfBlob = doc.output("blob")
    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Recibo_${funcionario?.nome?.replace(/\s+/g, "_")}_${folha.mes}_${folha.ano}.pdf`
    link.click()
    URL.revokeObjectURL(url)

    toast.success("Recibo gerado com sucesso!")
    return doc
  }, [])

  // ==================== EXPORTAR DECLARAÇÕES ====================

  const gerarDeclaracaoMAPS = useCallback(async (mes: number, ano: number) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const folhas = folhaSalarios.filter(f => f.mes === mes && f.ano === ano && f.estado === "Pago")

      if (folhas.length === 0) {
        toast.warning("Nenhuma folha paga encontrada para este período")
        return
      }

      // Calcular totais
      const totais = {
        total_rendimentos: folhas.reduce((acc, f) => acc + f.total_bruto, 0),
        total_irps: folhas.reduce((acc, f) => acc + f.irps, 0),
        total_inss_trabalhador: folhas.reduce((acc, f) => acc + f.inss_trabalhador, 0),
        total_inss_empresa: folhas.reduce((acc, f) => acc + f.inss_empresa, 0),
      }

      // Gerar CSV no formato MAPS
      const headers = ["NIF", "Nome", "Rendimento Bruto", "INSS", "IRPS", "Rendimento Líquido"]
      const rows = folhas.map(f => [
        f.funcionario?.inss || "",
        f.funcionario?.nome || "",
        f.total_bruto.toFixed(2),
        f.inss_trabalhador.toFixed(2),
        f.irps.toFixed(2),
        f.salario_liquido.toFixed(2),
      ])

      const csv = [headers, ...rows].map(row => row.join(",")).join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `MAPS_${mes}_${ano}.csv`
      link.click()
      URL.revokeObjectURL(url)

      // Marcar como declarado no sistema
      await supabase.from("declaracoes_fiscais").upsert({
        empresa_id: empresaId,
        tipo: "MAPS",
        mes,
        ano,
        ...totais,
        total_funcionarios: folhas.length,
        estado: "enviado",
        data_envio: new Date().toISOString(),
      }, { onConflict: "empresa_id,tipo,mes,ano" })

      // Actualizar folhas
      await supabase
        .from("folha_salarios")
        .update({ maps_declarado: true })
        .in("id", folhas.map(f => f.id))

      setFolhaSalarios(prev => prev.map(f =>
        folhas.some(fh => fh.id === f.id) ? { ...f, maps_declarado: true } : f
      ))

      toast.success("Declaração MAPS exportada com sucesso!")

    } catch (error: any) {
      console.error("Erro ao gerar MAPS:", error)
      toast.error("Erro ao exportar declaração MAPS")
    } finally {
      setIsLoading(false)
    }
  }, [folhaSalarios, empresaId])

  const gerarDeclaracaoINSS = useCallback(async (mes: number, ano: number) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const folhas = folhaSalarios.filter(f => f.mes === mes && f.ano === ano && f.estado === "Pago")

      if (folhas.length === 0) {
        toast.warning("Nenhuma folha paga encontrada para este período")
        return
      }

      // Gerar CSV no formato INSS
      const headers = ["Nº INSS", "Nome", "Base Incidência", "INSS Trabalhador (3%)", "INSS Empresa (4%)"]
      const rows = folhas.map(f => [
        f.funcionario?.inss || "",
        f.funcionario?.nome || "",
        f.base_inss.toFixed(2),
        f.inss_trabalhador.toFixed(2),
        f.inss_empresa.toFixed(2),
      ])

      const csv = [headers, ...rows].map(row => row.join(",")).join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `INSS_${mes}_${ano}.csv`
      link.click()
      URL.revokeObjectURL(url)

      // Marcar como declarado
      await supabase.from("declaracoes_fiscais").upsert({
        empresa_id: empresaId,
        tipo: "INSS",
        mes,
        ano,
        total_inss_trabalhador: folhas.reduce((acc, f) => acc + f.inss_trabalhador, 0),
        total_inss_empresa: folhas.reduce((acc, f) => acc + f.inss_empresa, 0),
        total_funcionarios: folhas.length,
        estado: "enviado",
        data_envio: new Date().toISOString(),
      }, { onConflict: "empresa_id,tipo,mes,ano" })

      await supabase
        .from("folha_salarios")
        .update({ inss_declarado: true })
        .in("id", folhas.map(f => f.id))

      setFolhaSalarios(prev => prev.map(f =>
        folhas.some(fh => fh.id === f.id) ? { ...f, inss_declarado: true } : f
      ))

      toast.success("Declaração INSS exportada com sucesso!")

    } catch (error: any) {
      console.error("Erro ao gerar INSS:", error)
      toast.error("Erro ao exportar declaração INSS")
    } finally {
      setIsLoading(false)
    }
  }, [folhaSalarios, empresaId])

  // ... (resto do código: handlers de pagamento, filtros, renderização)
  // O componente de UI segue a mesma estrutura, apenas adicionando:
  // - Select para tipo_folha
  // - Campos para horas extras (normal/nocturna/feriado)
  // - Botões para calcular horas extras, férias, 13º mês
  // - Alerta visual quando excede limite de 25% descontos
  // - Botão para gerar recibo PDF
  // - Tab para declarações fiscais (MAPS/INSS)
  // - Tab para controlo de férias

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="folhas">Folhas de Salário</TabsTrigger>
          <TabsTrigger value="ferias">Controlo de Férias</TabsTrigger>
          <TabsTrigger value="declaracoes">Declarações Fiscais</TabsTrigger>
        </TabsList>

        {/* Tab: Folhas de Salário */}
        <TabsContent value="folhas" className="space-y-4">
          {/* ... (código existente de estatísticas, filtros, tabela) ... */}

          {/* No Dialog de Nova Folha, adicionar: */}
          {/* Select de tipo_folha */}
          <div className="space-y-2">
            <Label>Tipo de Folha</Label>
            <Select
              value={formData.tipo_folha}
              onValueChange={(v: any) => setFormData({ ...formData, tipo_folha: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Salário Normal</SelectItem>
                <SelectItem value="13mes">13º Mês</SelectItem>
                <SelectItem value="ferias">Subsídio de Férias</SelectItem>
                <SelectItem value="extra">Pagamento Extra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botões de cálculo rápido */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCalcularHorasExtras}
              disabled={!formData.salario_base}
            >
              <Calculator className="h-3 w-3 mr-1" /> Calcular Horas Extras
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCalcularFerias}
              disabled={!formData.salario_base}
            >
              <CalendarDays className="h-3 w-3 mr-1" /> Calcular Férias
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCalcularDecimoTerceiro}
              disabled={!formData.salario_base}
            >
              <Percent className="h-3 w-3 mr-1" /> 13º Mês
            </Button>
          </div>

          {/* Alerta de limite de descontos */}
          {calculatedValues.excedeLimite && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Descontos ({calculatedValues.totalDescontos.toFixed(2)} MZN) excedem 25% do líquido
            </div>
          )}
        </TabsContent>

        {/* Tab: Controlo de Férias */}
        <TabsContent value="ferias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Controlo de Férias por Funcionário</CardTitle>
              <CardDescription>Gestão dos dias de férias anuais (22 dias úteis)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead className="text-right">Dias Direito</TableHead>
                    <TableHead className="text-right">Dias Gozados</TableHead>
                    <TableHead className="text-right">Dias Restantes</TableHead>
                    <TableHead>Período</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionarios.map(func => {
                    const controle = controlesFerias.find(c => c.funcionario_id === func.id && c.ano === selectedAno)
                    return (
                      <TableRow key={func.id}>
                        <TableCell>{func.nome}</TableCell>
                        <TableCell>{selectedAno}</TableCell>
                        <TableCell className="text-right">22</TableCell>
                        <TableCell className="text-right">{controle?.dias_gozados || 0}</TableCell>
                        <TableCell className={`text-right font-medium ${(controle?.dias_restantes || 22) < 5 ? "text-amber-600" : "text-green-600"
                          }`}>
                          {controle?.dias_restantes || 22}
                        </TableCell>
                        <TableCell>
                          {controle?.data_inicio ?
                            `${new Date(controle.data_inicio).toLocaleDateString("pt-MZ")} - ${controle.data_fim ? new Date(controle.data_fim).toLocaleDateString("pt-MZ") : "..."}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Declarações Fiscais */}
        <TabsContent value="declaracoes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Declaração MAPS (IRPS)
                </CardTitle>
                <CardDescription>
                  Modelo de declaração de remunerações para Autoridades Tributárias
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedMes.toString()} onValueChange={(v) => setSelectedMes(parseInt(v))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {meses.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedAno.toString()} onValueChange={(v) => setSelectedAno(parseInt(v))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => gerarDeclaracaoMAPS(selectedMes, selectedAno)}
                  disabled={isLoading}
                  className="w-full"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar MAPS (CSV)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Declaração INSS
                </CardTitle>
                <CardDescription>
                  Mapa de contribuições para Instituto Nacional de Segurança Social
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedMes.toString()} onValueChange={(v) => setSelectedMes(parseInt(v))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {meses.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedAno.toString()} onValueChange={(v) => setSelectedAno(parseInt(v))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => gerarDeclaracaoINSS(selectedMes, selectedAno)}
                  disabled={isLoading}
                  className="w-full"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar INSS (CSV)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Recibo */}
      <Dialog open={!!reciboFolhaId} onOpenChange={() => setReciboFolhaId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Gerar Recibo de Vencimento
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const folha = folhaSalarios.find(f => f.id === reciboFolhaId)
            if (!folha) return null
            return (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p><strong>Funcionário:</strong> {folha.funcionario?.nome}</p>
                  <p><strong>Período:</strong> {meses.find(m => m.value === folha.mes)?.label} {folha.ano}</p>
                  <p><strong>Salário Líquido:</strong> <span className="text-green-600 font-bold">{folha.salario_liquido.toFixed(2)} MZN</span></p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReciboFolhaId(null)}>Cancelar</Button>
                  <Button onClick={() => {
                    gerarReciboVencimento(folha)
                    setReciboFolhaId(null)
                  }}>
                    <Printer className="h-4 w-4 mr-2" /> Gerar PDF
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}