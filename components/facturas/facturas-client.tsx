"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { logEmitir, logAnular } from "@/lib/audit-log"
import { usePermissionCheck } from "@/components/ui/permission-guard"
import {
  Plus,
  Trash2,
  FileText,
  Printer,
  Search,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
} from "lucide-react"
import {
  TAXAS_IVA,
  FORMAS_PAGAMENTO,
  TIPO_DOCUMENTO_LABELS,
  ESTADO_CORES,
  calcularIvaLinha,
  calcularTotaisDocumento,
  formatarMZN,
  formatarData,
  formatarDataExtenso,
} from "@/lib/documento-utils"
import { numeroPorExtenso } from "@/lib/numero-por-extenso"

interface ItemForm {
  produto_id: string
  descricao: string
  quantidade: number
  preco_unitario: number
  taxa_iva: number
}

interface ContaBancaria {
  id: string
  nome: string
  banco: string | null
  saldo_atual: number
}

interface FacturasClientProps {
  facturas: any[]
  clientes: any[]
  produtos: any[]
  funcionarioId: string | null
  empresaId: string
  empresa: any
  recebidoPorFactura: Record<string, number>
  ncPorFactura: Record<string, number>
  contasBancarias: ContaBancaria[]
}

export function FacturasClient({
  facturas: initialFacturas,
  clientes,
  produtos,
  funcionarioId,
  empresaId,
  empresa,
  recebidoPorFactura,
  ncPorFactura,
  contasBancarias,
}: FacturasClientProps) {
  const [facturas, setFacturas] = useState(initialFacturas)
  const [showDialog, setShowDialog] = useState(false)
  
  // Check permissions
  const { canEdit } = usePermissionCheck("facturas")
  const [showPrint, setShowPrint] = useState(false)
  const [selectedFactura, setSelectedFactura] = useState<any>(null)
  const [selectedItens, setSelectedItens] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [tipoDocumento, setTipoDocumento] = useState<"FT" | "NC" | "ND">("FT")
  const [isLoading, setIsLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const [clienteId, setClienteId] = useState("")
  const [formaPagamento, setFormaPagamento] = useState("Transferencia")
  const [dataVencimento, setDataVencimento] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [motivoNota, setMotivoNota] = useState("")
  const [facturaOrigemId, setFacturaOrigemId] = useState("")
  const [contaBancariaId, setContaBancariaId] = useState("")
  const [itens, setItens] = useState<ItemForm[]>([
    { produto_id: "", descricao: "", quantidade: 1, preco_unitario: 0, taxa_iva: 16 },
  ])

  // NC: Itens carregados da factura original com seleccao
  interface OrigemItem {
    id: string
    descricao: string
    quantidade: number
    preco_unitario: number
    taxa_iva: number
    total: number
    selecionado: boolean
    qtd_creditar: number
  }
  const [itensOrigem, setItensOrigem] = useState<OrigemItem[]>([])
  const [loadingItens, setLoadingItens] = useState(false)

  const supabase = createClient()

  const facturasFT = facturas.filter((f) => !f.tipo_documento || f.tipo_documento === "FT")
  const facturasNC = facturas.filter((f) => f.tipo_documento === "NC")
  const facturasND = facturas.filter((f) => f.tipo_documento === "ND")

  const filterBySearch = (list: any[]) =>
    list.filter(
      (f) =>
        search === "" ||
        (f.numero_documento || f.numero || "").toLowerCase().includes(search.toLowerCase()) ||
        (f.clientes?.nome || "").toLowerCase().includes(search.toLowerCase())
    )

  const totalFT = facturasFT.reduce((a, f) => a + (Number(f.total) || 0), 0)
  const totalNC = facturasNC.reduce((a, f) => a + (Number(f.total) || 0), 0)
  const totalND = facturasND.reduce((a, f) => a + (Number(f.total) || 0), 0)
  const pendentes = facturasFT.filter((f) => f.estado === "Pendente").length

  const totaisCalc = calcularTotaisDocumento(
    itens.map((i) => ({
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      taxa_iva: i.taxa_iva,
    }))
  )

  function resetForm() {
    setClienteId("")
    setFormaPagamento("Transferencia")
    setDataVencimento("")
    setObservacoes("")
    setMotivoNota("")
    setFacturaOrigemId("")
    setContaBancariaId("")
    setItens([{ produto_id: "", descricao: "", quantidade: 1, preco_unitario: 0, taxa_iva: 16 }])
    setItensOrigem([])
  }

  async function loadItensOrigem(facturaId: string) {
    setLoadingItens(true)
    const { data } = await supabase
      .from("factura_itens")
      .select("*")
      .eq("factura_id", facturaId)
    
    if (data) {
      setItensOrigem(data.map((item: any) => ({
        id: item.id,
        descricao: item.descricao,
        quantidade: Number(item.quantidade),
        preco_unitario: Number(item.preco_unitario),
        taxa_iva: Number(item.taxa_iva) || 16,
        total: Number(item.total) || (Number(item.quantidade) * Number(item.preco_unitario)),
        selecionado: false,
        qtd_creditar: Number(item.quantidade),
      })))
    }
    setLoadingItens(false)
  }

  function toggleItemOrigem(index: number) {
    setItensOrigem((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selecionado: !item.selecionado } : item))
    )
  }

  function updateQtdCreditar(index: number, qtd: number) {
    setItensOrigem((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qtd_creditar: Math.min(qtd, item.quantidade) } : item))
    )
  }

  // Totais dos itens seleccionados para NC
  const itensNCSeleccionados = itensOrigem.filter((i) => i.selecionado)
  const totaisNC = {
    subtotal: itensNCSeleccionados.reduce((a, i) => a + i.qtd_creditar * i.preco_unitario, 0),
    iva: itensNCSeleccionados.reduce((a, i) => {
      const sub = i.qtd_creditar * i.preco_unitario
      return a + calcularIvaLinha(sub, i.taxa_iva)
    }, 0),
    total: itensNCSeleccionados.reduce((a, i) => {
      const sub = i.qtd_creditar * i.preco_unitario
      return a + sub + calcularIvaLinha(sub, i.taxa_iva)
    }, 0),
  }

  function openCreateDialog(tipo: "FT" | "NC" | "ND") {
    setTipoDocumento(tipo)
    resetForm()
    setShowDialog(true)
  }

  function addItem() {
    setItens([...itens, { produto_id: "", descricao: "", quantidade: 1, preco_unitario: 0, taxa_iva: 16 }])
  }

  function removeItem(index: number) {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index))
    }
  }

  function updateItem(index: number, field: keyof ItemForm, value: any) {
    const newItens = [...itens]
    newItens[index] = { ...newItens[index], [field]: value }
    if (field === "produto_id" && value) {
      const produto = produtos.find((p) => p.id === value)
      if (produto) {
        newItens[index].descricao = produto.nome
        newItens[index].preco_unitario = Number(produto.preco_venda || produto.preco) || 0
      }
    }
    setItens(newItens)
  }

  async function handleSave() {
    if (!clienteId) {
      toast.error("Seleccione um cliente")
      return
    }
    if ((tipoDocumento === "NC" || tipoDocumento === "ND") && !facturaOrigemId) {
      toast.error("Seleccione a factura de origem")
      return
    }
    // NC: validar que pelo menos 1 item esta seleccionado e que nao excede o saldo
    if (tipoDocumento === "NC") {
      if (itensNCSeleccionados.length === 0) {
        toast.error("Seleccione pelo menos um item para creditar")
        return
      }
      if (!motivoNota.trim()) {
        toast.error("Indique o motivo da nota de credito")
        return
      }
      // P2: Validar que NC nao excede saldo creditavel
      const ncJaEmitidas = ncPorFactura[facturaOrigemId] || 0
      const facturaOrigem = facturas.find((f) => f.id === facturaOrigemId)
      const saldoCreditavel = (Number(facturaOrigem?.total) || 0) - ncJaEmitidas
      if (totaisNC.total > saldoCreditavel + 0.01) {
        toast.error(`O valor da NC (${formatarMZN(totaisNC.total)} MZN) excede o saldo creditavel (${formatarMZN(saldoCreditavel)} MZN)`)
        return
      }
    } else {
      if (itens.some((i) => !i.descricao || i.quantidade <= 0)) {
        toast.error("Preencha todos os itens correctamente")
        return
      }
    }

    setIsLoading(true)
    try {
      const { data: numeroDoc } = await supabase.rpc("gerar_numero_documento", {
        p_tipo: tipoDocumento,
        p_empresa_id: empresaId,
      })

      // NC usa os itens seleccionados da factura original; FT/ND usa os itens manuais
      const itensFinal = tipoDocumento === "NC"
        ? itensNCSeleccionados.map((i) => ({
            quantidade: i.qtd_creditar,
            preco_unitario: i.preco_unitario,
            taxa_iva: i.taxa_iva,
          }))
        : itens.map((i) => ({
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            taxa_iva: i.taxa_iva,
          }))

      const totais = calcularTotaisDocumento(itensFinal)

      const { data: newFactura, error: facturaError } = await supabase
        .from("facturas")
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          empresa_id: empresaId,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDoc,
          numero: numeroDoc,
          cliente_id: clienteId,
          data: new Date().toISOString().split("T")[0],
          data_vencimento: dataVencimento || null,
          subtotal: totais.subtotal,
          iva: totais.iva,
          total: totais.total,
          estado: tipoDocumento === "NC" ? "Emitida" : "Pendente",
          forma_pagamento: formaPagamento,
          observacoes: observacoes || null,
          motivo_nota: tipoDocumento !== "FT" ? motivoNota : null,
          factura_origem_id: tipoDocumento !== "FT" ? facturaOrigemId : null,
          criado_por_funcionario_id: funcionarioId,
        })
        .select(`*, clientes(nome, nuit, endereco, telefone, email), factura_origem:factura_origem_id(numero_documento, numero)`)
        .single()

      if (facturaError) throw facturaError

      // Inserir itens - NC usa itens seleccionados, FT/ND usa itens manuais
      const itensData = tipoDocumento === "NC"
        ? itensNCSeleccionados.map((item) => {
            const subtotalLinha = item.qtd_creditar * item.preco_unitario
            return {
              factura_id: newFactura.id,
              produto_id: null,
              descricao: item.descricao,
              quantidade: item.qtd_creditar,
              preco_unitario: item.preco_unitario,
              taxa_iva: item.taxa_iva,
              valor_iva: calcularIvaLinha(subtotalLinha, item.taxa_iva),
              total: subtotalLinha + calcularIvaLinha(subtotalLinha, item.taxa_iva),
            }
          })
        : itens.map((item) => {
            const subtotalLinha = item.quantidade * item.preco_unitario
            return {
              factura_id: newFactura.id,
              produto_id: item.produto_id || null,
              descricao: item.descricao,
              quantidade: item.quantidade,
              preco_unitario: item.preco_unitario,
              taxa_iva: item.taxa_iva,
              valor_iva: calcularIvaLinha(subtotalLinha, item.taxa_iva),
              total: subtotalLinha + calcularIvaLinha(subtotalLinha, item.taxa_iva),
            }
          })

      await supabase.from("factura_itens").insert(itensData)

      // Gestão de Stock - Decrementar stock para FT, repor stock para NC
      const userId = (await supabase.auth.getUser()).data.user?.id
      
      if (tipoDocumento === "FT") {
        // Factura: decrementar stock dos produtos vendidos
        for (const item of itens) {
          if (item.produto_id) {
            // Buscar stock actual do produto
            const { data: produtoActual } = await supabase
              .from("produtos")
              .select("stock")
              .eq("id", item.produto_id)
              .single()
            
            if (produtoActual) {
              const novoStock = Math.max(0, (produtoActual.stock || 0) - item.quantidade)
              
              // Actualizar stock do produto
              await supabase
                .from("produtos")
                .update({ stock: novoStock })
                .eq("id", item.produto_id)
              
              // Registar movimento de stock (saída)
              await supabase.from("movimentos_stock").insert({
                empresa_id: empresaId,
                produto_id: item.produto_id,
                tipo: "saida",
                quantidade: item.quantidade,
                documento_tipo: "FT",
                documento_id: newFactura.id,
                documento_referencia: numeroDoc,
                data: new Date().toISOString().split("T")[0],
                user_id: userId,
              })
            }
          }
        }
      } else if (tipoDocumento === "NC") {
        // Nota de Crédito: repor stock dos produtos devolvidos
        for (const item of itensNCSeleccionados) {
          // Encontrar o produto_id a partir do item original da factura
          const { data: itemOriginal } = await supabase
            .from("factura_itens")
            .select("produto_id")
            .eq("factura_id", facturaOrigemId)
            .eq("descricao", item.descricao)
            .single()
          
          if (itemOriginal?.produto_id) {
            // Buscar stock actual do produto
            const { data: produtoActual } = await supabase
              .from("produtos")
              .select("stock")
              .eq("id", itemOriginal.produto_id)
              .single()
            
            if (produtoActual) {
              const novoStock = (produtoActual.stock || 0) + item.qtd_creditar
              
              // Actualizar stock do produto
              await supabase
                .from("produtos")
                .update({ stock: novoStock })
                .eq("id", itemOriginal.produto_id)
              
              // Registar movimento de stock (entrada - devolução)
              await supabase.from("movimentos_stock").insert({
                empresa_id: empresaId,
                produto_id: itemOriginal.produto_id,
                tipo: "entrada",
                quantidade: item.qtd_creditar,
                documento_tipo: "NC",
                documento_id: newFactura.id,
                documento_referencia: numeroDoc,
                observacoes: `Devolução via NC - ${motivoNota}`,
                data: new Date().toISOString().split("T")[0],
                user_id: userId,
              })
            }
          }
        }
      }

      // Se for NC, criar movimento bancário de saída (débito) - dinheiro a devolver ao cliente
      if (tipoDocumento === "NC" && contaBancariaId) {
        // Buscar saldo actual da base de dados (não usar o valor em memória que pode estar desactualizado)
        const { data: contaActual } = await supabase
          .from("contas_bancarias")
          .select("saldo_atual")
          .eq("id", contaBancariaId)
          .single()
        
        if (contaActual) {
          // Calcular novo saldo (débito = saída) usando o valor actual da BD
          const saldoActual = Number(contaActual.saldo_atual) || 0
          const novoSaldoApos = saldoActual - totais.total
          
          // Inserir movimento bancário
          await supabase
            .from("movimentos_bancarios")
            .insert({
              conta_bancaria_id: contaBancariaId,
              data: new Date().toISOString().split("T")[0],
              descricao: `NC ${numeroDoc} - Devolução a ${clientes.find(c => c.id === clienteId)?.nome || "Cliente"}`,
              referencia: numeroDoc,
              tipo: "debito",
              valor: totais.total,
              saldo_apos: novoSaldoApos,
              conciliado: false,
              documento_tipo: "NC",
              documento_id: newFactura.id,
            })

          // Actualizar saldo da conta bancária
          await supabase
            .from("contas_bancarias")
            .update({ saldo_atual: novoSaldoApos, updated_at: new Date().toISOString() })
            .eq("id", contaBancariaId)
        }
      }

      // Se for NC ou ND, actualizar o estado da factura de origem
      if (tipoDocumento === "NC" && facturaOrigemId) {
        // P3: A NC que acabamos de inserir JA esta na BD neste ponto (insert acima),
        // entao a query abaixo ja a inclui correctamente
        const { data: todasNCs } = await supabase
          .from("facturas")
          .select("total")
          .eq("factura_origem_id", facturaOrigemId)
          .eq("tipo_documento", "NC")
        
        const totalNCs = (todasNCs || []).reduce((acc: number, nc: any) => acc + (Number(nc.total) || 0), 0)
        const facturaOrigem = facturas.find((f) => f.id === facturaOrigemId)
        const totalOrigem = Number(facturaOrigem?.total) || 0
        const estadoAnterior = facturaOrigem?.estado || "Pendente"

        // P5: Determinar estado correcto com base no estado anterior e no valor creditado
        let novoEstado: string
        if (totalNCs >= totalOrigem) {
          // NC cobre 100% da factura
          if (estadoAnterior === "Pago" || estadoAnterior === "Paga" || estadoAnterior === "Parcialmente Pago") {
            // Ja tinha recebido dinheiro - existe credito a devolver ao cliente
            novoEstado = "Creditada Apos Pagamento"
          } else {
            novoEstado = "Creditada"
          }
        } else {
          // NC cobre parcialmente
          novoEstado = "Parcialmente Creditada"
        }

        await supabase
          .from("facturas")
          .update({ estado: novoEstado })
          .eq("id", facturaOrigemId)

        // Actualizar o estado local
        setFacturas((prev) =>
          [newFactura, ...prev.map((f) => (f.id === facturaOrigemId ? { ...f, estado: novoEstado } : f))]
        )
      } else if (tipoDocumento === "ND" && facturaOrigemId) {
        await supabase
          .from("facturas")
          .update({ estado: "Debitada" })
          .eq("id", facturaOrigemId)

        setFacturas((prev) =>
          [newFactura, ...prev.map((f) => (f.id === facturaOrigemId ? { ...f, estado: "Debitada" } : f))]
        )
      } else {
        setFacturas([newFactura, ...facturas])
      }

  setShowDialog(false)
  resetForm()
  
  // Registar log de actividade
  const clienteNome = clientes.find(c => c.id === clienteId)?.nome || "Cliente"
  await logEmitir("facturas", newFactura.id, `${TIPO_DOCUMENTO_LABELS[tipoDocumento]} ${numeroDoc} emitida para ${clienteNome} - ${formatarMZN(totais.total)} MZN`, {
    numero: numeroDoc,
    tipo: tipoDocumento,
    cliente: clienteNome,
    total: totais.total
  })
  
  toast.success(`${TIPO_DOCUMENTO_LABELS[tipoDocumento]} ${numeroDoc} criada com sucesso`)
    } catch (error: any) {
      toast.error("Erro ao criar documento: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleViewPrint(factura: any) {
    const { data: itensData } = await supabase
      .from("factura_itens")
      .select("*")
      .eq("factura_id", factura.id)
    setSelectedFactura(factura)
    setSelectedItens(itensData || [])
    setShowPrint(true)
  }

  async function handleMarkPaid(facturaId: string) {
    const { error } = await supabase
      .from("facturas")
      .update({ estado: "Pago" })
      .eq("id", facturaId)
    if (!error) {
      setFacturas(facturas.map((f) => (f.id === facturaId ? { ...f, estado: "Pago" } : f)))
      toast.success("Factura marcada como paga")
    }
  }

  function handlePrint() {
    const content = printRef.current
    if (!content) return
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <html><head><title>${selectedFactura?.numero_documento || "Documento"}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #000; max-width: 800px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; font-weight: bold; }
        .text-right { text-align: right; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .titulo { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .total-box { background: #f9f9f9; padding: 12px; border: 1px solid #ccc; margin-top: 10px; }
        .extenso { font-style: italic; font-size: 11px; margin-top: 5px; }
        .footer { margin-top: 40px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10px; }
        @media print { body { padding: 15px; } }
      </style></head><body>${content.innerHTML}</body></html>
    `)
    win.document.close()
    win.print()
  }

  function renderDocTable(list: any[], tipo: string) {
    const filtered = filterBySearch(list)
    const isFT = tipo === "FT"
    const colSpan = isFT ? 12 : 9
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
              {isFT && <TableHead className="text-right">NCs</TableHead>}
              {isFT && <TableHead className="text-right">Ja Recebido</TableHead>}
              {isFT && <TableHead className="text-right">Saldo</TableHead>}
              <TableHead>Estado</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
                  Nenhum documento encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => {
                const jaRecebido = isFT ? (recebidoPorFactura[f.id] || 0) : 0
                const totalNCs = isFT ? (ncPorFactura[f.id] || 0) : 0
                const saldo = isFT ? Math.max(0, (Number(f.total) || 0) - totalNCs - jaRecebido) : 0
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-sm">{f.numero_documento || f.numero}</TableCell>
                    <TableCell>{f.clientes?.nome || "-"}</TableCell>
                    <TableCell className="text-sm">{formatarData(f.data)}</TableCell>
                    <TableCell className="text-right text-sm">{formatarMZN(Number(f.subtotal))}</TableCell>
                    <TableCell className="text-right text-sm">{formatarMZN(Number(f.iva))}</TableCell>
                    <TableCell className="text-right font-semibold">{formatarMZN(Number(f.total))} MZN</TableCell>
                    {isFT && (
                      <TableCell className="text-right text-sm">
                        {totalNCs > 0 ? (
                          <span className="text-red-600 font-medium">-{formatarMZN(totalNCs)} MZN</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {isFT && (
                      <TableCell className="text-right text-sm">
                        <span className={jaRecebido > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                          {formatarMZN(jaRecebido)} MZN
                        </span>
                      </TableCell>
                    )}
                    {isFT && (
                      <TableCell className="text-right text-sm">
                        <span className={saldo > 0 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
                          {formatarMZN(saldo)} MZN
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className={ESTADO_CORES[f.estado] || ""}>
                        {f.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{f.forma_pagamento || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleViewPrint(f)} title="Ver / Imprimir">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {tipo === "FT" && (f.estado === "Pendente" || f.estado === "Parcialmente Pago") && (
                          <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handleMarkPaid(f.id)} title="Marcar como Pago">
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">{filtered.length} documento{filtered.length !== 1 ? "s" : ""}</span>
            <span className="font-medium">{formatarMZN(filtered.reduce((a: number, f: any) => a + (Number(f.total) || 0), 0))} MZN</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Facturado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatarMZN(totalFT)} MZN</div>
            <p className="text-xs text-muted-foreground">{facturasFT.length} facturas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Notas de Credito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatarMZN(totalNC)} MZN</div>
            <p className="text-xs text-muted-foreground">{facturasNC.length} emitidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Notas de Debito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">{formatarMZN(totalND)} MZN</div>
            <p className="text-xs text-muted-foreground">{facturasND.length} emitidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">{pendentes}</div>
            <p className="text-xs text-muted-foreground">Por cobrar</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por numero ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 3 Tabs */}
      <Tabs defaultValue="facturas">
        <TabsList>
          <TabsTrigger value="facturas" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Facturas ({facturasFT.length})
          </TabsTrigger>
          <TabsTrigger value="nc" className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4" />
            Notas de Credito ({facturasNC.length})
          </TabsTrigger>
          <TabsTrigger value="nd" className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Notas de Debito ({facturasND.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facturas" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={() => openCreateDialog("FT")}>
                <Plus className="mr-2 h-4 w-4" /> Nova Factura
              </Button>
            </div>
          )}
          {renderDocTable(facturasFT, "FT")}
        </TabsContent>

        <TabsContent value="nc" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => openCreateDialog("NC")}>
                <Plus className="mr-2 h-4 w-4" /> Nova Nota de Credito
              </Button>
            </div>
          )}
          {renderDocTable(facturasNC, "NC")}
        </TabsContent>

        <TabsContent value="nd" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => openCreateDialog("ND")}>
                <Plus className="mr-2 h-4 w-4" /> Nova Nota de Debito
              </Button>
            </div>
          )}
          {renderDocTable(facturasND, "ND")}
        </TabsContent>
      </Tabs>

      {/* Dialog Criar Documento */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {tipoDocumento === "FT" ? "Nova Factura" : tipoDocumento === "NC" ? "Nova Nota de Credito" : "Nova Nota de Debito"}
            </DialogTitle>
            <DialogDescription>
              {tipoDocumento === "FT"
                ? "Preencha os dados da factura. O numero sera gerado automaticamente."
                : `Seleccione a factura de origem e preencha os dados da ${TIPO_DOCUMENTO_LABELS[tipoDocumento]}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* NC: Fluxo especial - seleccionar factura e itens */}
            {tipoDocumento === "NC" && (
              <>
                <div className="space-y-4 rounded-lg border border-dashed p-4 bg-red-50/30">
                  <div className="space-y-2">
                    <Label>Factura de Origem *</Label>
                    <Select value={facturaOrigemId} onValueChange={(val) => {
                      setFacturaOrigemId(val)
                      const orig = facturasFT.find((f) => f.id === val)
                      if (orig?.cliente_id) setClienteId(orig.cliente_id)
                      loadItensOrigem(val)
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione a factura a creditar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {facturasFT.filter((f) => {
                          // So mostrar facturas com saldo disponivel para creditar
                          const ncJaEmitidas = ncPorFactura[f.id] || 0
                          const saldoCreditavel = (Number(f.total) || 0) - ncJaEmitidas
                          return saldoCreditavel > 0.01
                        }).map((f) => {
                          const ncJaEmitidas = ncPorFactura[f.id] || 0
                          const saldoCreditavel = (Number(f.total) || 0) - ncJaEmitidas
                          return (
                            <SelectItem key={f.id} value={f.id}>
                              {f.numero_documento || f.numero} - {f.clientes?.nome} (Total: {formatarMZN(Number(f.total))} | Saldo creditavel: {formatarMZN(saldoCreditavel)} MZN)
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {/* Mostrar info do saldo da factura seleccionada */}
                    {facturaOrigemId && (() => {
                      const orig = facturasFT.find((f) => f.id === facturaOrigemId)
                      const ncJaEmitidas = ncPorFactura[facturaOrigemId] || 0
                      const saldoCreditavel = (Number(orig?.total) || 0) - ncJaEmitidas
                      return (
                        <div className="mt-2 rounded-md border border-dashed p-3 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total da factura:</span>
                            <span className="font-medium">{formatarMZN(Number(orig?.total))} MZN</span>
                          </div>
                          {ncJaEmitidas > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">NCs ja emitidas:</span>
                              <span className="font-medium text-red-600">-{formatarMZN(ncJaEmitidas)} MZN</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-1">
                            <span className="font-medium">Saldo creditavel:</span>
                            <span className="font-bold text-amber-600">{formatarMZN(saldoCreditavel)} MZN</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Estado actual:</span>
                            <Badge variant="outline" className={ESTADO_CORES[orig?.estado] || ""}>{orig?.estado}</Badge>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Itens da factura original com checkboxes */}
                  {facturaOrigemId && (
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Seleccione os itens a creditar</Label>
                      <p className="text-xs text-muted-foreground">Marque os produtos que o cliente devolveu ou que foram facturados incorrectamente. Pode ajustar a quantidade.</p>
                      
                      {loadingItens ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">A carregar itens...</div>
                      ) : itensOrigem.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">Nenhum item encontrado nesta factura</div>
                      ) : (
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">Creditar</TableHead>
                                <TableHead>Descricao</TableHead>
                                <TableHead className="w-24 text-right">Qtd Original</TableHead>
                                <TableHead className="w-28">Qtd a Creditar</TableHead>
                                <TableHead className="w-28 text-right">Preco Unit.</TableHead>
                                <TableHead className="w-20 text-right">IVA</TableHead>
                                <TableHead className="w-28 text-right">Total a Creditar</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {itensOrigem.map((item, index) => {
                                const subtotalCreditar = item.qtd_creditar * item.preco_unitario
                                const ivaCreditar = calcularIvaLinha(subtotalCreditar, item.taxa_iva)
                                const totalCreditar = subtotalCreditar + ivaCreditar
                                return (
                                  <TableRow key={item.id} className={item.selecionado ? "bg-red-50/50" : ""}>
                                    <TableCell>
                                      <input
                                        type="checkbox"
                                        checked={item.selecionado}
                                        onChange={() => toggleItemOrigem(index)}
                                        className="h-4 w-4 rounded border-muted-foreground"
                                      />
                                    </TableCell>
                                    <TableCell className="text-sm">{item.descricao}</TableCell>
                                    <TableCell className="text-right text-sm">{item.quantidade}</TableCell>
                                    <TableCell>
                                      <Input
                                        className="h-8 text-xs"
                                        type="number"
                                        min={1}
                                        max={item.quantidade}
                                        value={item.qtd_creditar}
                                        onChange={(e) => updateQtdCreditar(index, Number(e.target.value))}
                                        disabled={!item.selecionado}
                                      />
                                    </TableCell>
                                    <TableCell className="text-right text-sm">{formatarMZN(item.preco_unitario)}</TableCell>
                                    <TableCell className="text-right text-sm">{item.taxa_iva}%</TableCell>
                                    <TableCell className="text-right text-sm font-medium">
                                      {item.selecionado ? (
                                        <span className="text-red-600">-{formatarMZN(totalCreditar)}</span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Totais NC */}
                      {itensNCSeleccionados.length > 0 && (
                        <div className="flex justify-end">
                          <div className="w-72 space-y-2 rounded-lg border border-red-200 bg-red-50/50 p-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Subtotal a creditar:</span>
                              <span className="text-red-600">-{formatarMZN(totaisNC.subtotal)} MZN</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">IVA a creditar:</span>
                              <span className="text-red-600">-{formatarMZN(totaisNC.iva)} MZN</span>
                            </div>
                            <div className="flex justify-between border-t border-red-200 pt-2 text-base font-bold">
                              <span>Total NC:</span>
                              <span className="text-red-600">-{formatarMZN(totaisNC.total)} MZN</span>
                            </div>
                            <p className="text-xs text-muted-foreground italic">{numeroPorExtenso(totaisNC.total)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Motivo da Nota de Credito *</Label>
                    <Textarea
                      value={motivoNota}
                      onChange={(e) => setMotivoNota(e.target.value)}
                      placeholder="Ex: Devolucao de mercadoria, erro de facturacao, produto danificado..."
                    />
                  </div>

                  {/* Conta bancária para débito (saída) - opcional */}
                  <div className="space-y-2">
                    <Label>Conta Bancaria para Devolucao</Label>
                    <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione a conta para debitar o valor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contasBancarias.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {conta.nome} {conta.banco && `(${conta.banco})`} - Saldo: {formatarMZN(conta.saldo_atual)} MZN
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Se seleccionada, sera criado um movimento de saida (debito) nesta conta</p>
                  </div>
                </div>

                {/* Observacoes */}
                <div className="space-y-2">
                  <Label>Observacoes</Label>
                  <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas adicionais..." />
                </div>
              </>
            )}

            {/* ND: Factura Origem + motivo */}
            {tipoDocumento === "ND" && (
              <div className="space-y-4 rounded-lg border border-dashed p-4">
                <div className="space-y-2">
                  <Label>Factura de Origem *</Label>
                  <Select value={facturaOrigemId} onValueChange={(val) => {
                    setFacturaOrigemId(val)
                    const orig = facturasFT.find((f) => f.id === val)
                    if (orig?.cliente_id) setClienteId(orig.cliente_id)
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione a factura..." />
                    </SelectTrigger>
                    <SelectContent>
                      {facturasFT.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.numero_documento || f.numero} - {f.clientes?.nome} ({formatarMZN(Number(f.total))} MZN)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Motivo *</Label>
                  <Textarea
                    value={motivoNota}
                    onChange={(e) => setMotivoNota(e.target.value)}
                    placeholder="Ex: Acrescimo de servicos, correccao de valor..."
                  />
                </div>
              </div>
            )}

            {/* FT e ND: Cliente + Pagamento + Itens manuais */}
            {tipoDocumento !== "NC" && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select value={clienteId} onValueChange={setClienteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Label>Data de Vencimento</Label>
                    <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
                  </div>
                </div>

                {/* Itens */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Itens</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addItem}>
                      <Plus className="mr-1 h-3 w-3" /> Adicionar Linha
                    </Button>
                  </div>

                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-44">Produto</TableHead>
                          <TableHead>Descricao</TableHead>
                          <TableHead className="w-20">Qtd</TableHead>
                          <TableHead className="w-28">Preco Unit.</TableHead>
                          <TableHead className="w-32">IVA</TableHead>
                          <TableHead className="w-28 text-right">Total</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((item, index) => {
                          const subtotalLinha = item.quantidade * item.preco_unitario
                          const ivaLinha = calcularIvaLinha(subtotalLinha, item.taxa_iva)
                          const totalLinha = subtotalLinha + ivaLinha
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <Select value={item.produto_id} onValueChange={(v) => updateItem(index, "produto_id", v)}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Produto..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {produtos.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input className="h-8 text-xs" value={item.descricao} onChange={(e) => updateItem(index, "descricao", e.target.value)} placeholder="Descricao..." />
                              </TableCell>
                              <TableCell>
                                <Input className="h-8 text-xs" type="number" min={1} value={item.quantidade} onChange={(e) => updateItem(index, "quantidade", Number(e.target.value))} />
                              </TableCell>
                              <TableCell>
                                <Input className="h-8 text-xs" type="number" min={0} step={0.01} value={item.preco_unitario} onChange={(e) => updateItem(index, "preco_unitario", Number(e.target.value))} />
                              </TableCell>
                              <TableCell>
                                <Select value={String(item.taxa_iva)} onValueChange={(v) => updateItem(index, "taxa_iva", Number(v))}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TAXAS_IVA.map((t) => (
                                      <SelectItem key={t.valor} value={String(t.valor)}>{t.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">{formatarMZN(totalLinha)}</TableCell>
                              <TableCell>
                                {itens.length > 1 && (
                                  <Button size="sm" variant="ghost" onClick={() => removeItem(index)}>
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totais */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 rounded-lg border p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatarMZN(totaisCalc.subtotal)} MZN</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA:</span>
                        <span>{formatarMZN(totaisCalc.iva)} MZN</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 text-base font-bold">
                        <span>Total:</span>
                        <span>{formatarMZN(totaisCalc.total)} MZN</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">{numeroPorExtenso(totaisCalc.total)}</p>
                    </div>
                  </div>
                </div>

                {/* Observacoes */}
                <div className="space-y-2">
                  <Label>Observacoes</Label>
                  <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas adicionais..." />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "A criar..." : `Criar ${TIPO_DOCUMENTO_LABELS[tipoDocumento]}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Impressao AT */}
      <Dialog open={showPrint} onOpenChange={setShowPrint}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              {selectedFactura?.numero_documento || selectedFactura?.numero}
            </DialogTitle>
          </DialogHeader>

          <div ref={printRef}>
            {selectedFactura && (
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#000" }}>
                {/* Cabecalho Empresa */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>{empresa?.nome || "Empresa"}</div>
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      {empresa?.nuit && <div>NUIT: {empresa.nuit}</div>}
                      {empresa?.endereco && <div>{empresa.endereco}</div>}
                      {empresa?.cidade && <div>{[empresa.cidade, empresa.provincia].filter(Boolean).join(", ")}</div>}
                      {empresa?.telefone && <div>Tel: {empresa.telefone}</div>}
                      {empresa?.email && <div>Email: {empresa.email}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                      {TIPO_DOCUMENTO_LABELS[selectedFactura.tipo_documento] || "Factura"}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>
                      {selectedFactura.numero_documento || selectedFactura.numero}
                    </div>
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      Data: {formatarDataExtenso(selectedFactura.data)}
                    </div>
                    {selectedFactura.data_vencimento && (
                      <div style={{ fontSize: "11px", color: "#666" }}>
                        Vencimento: {formatarData(selectedFactura.data_vencimento)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dados Cliente */}
                <div style={{ borderTop: "2px solid #000", borderBottom: "1px solid #ccc", padding: "10px 0", marginBottom: "15px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "3px" }}>Cliente:</div>
                  <div>{selectedFactura.clientes?.nome}</div>
                  {selectedFactura.clientes?.nuit && <div>NUIT: {selectedFactura.clientes.nuit}</div>}
                  {selectedFactura.clientes?.endereco && <div>{selectedFactura.clientes.endereco}</div>}
                  {selectedFactura.clientes?.telefone && <div>Tel: {selectedFactura.clientes.telefone}</div>}
                </div>

                {/* Referencia NC/ND */}
                {selectedFactura.factura_origem && (
                  <div style={{ marginBottom: "10px", fontStyle: "italic", fontSize: "11px", padding: "6px", background: "#fff3cd", border: "1px solid #ffc107" }}>
                    Referente a: {selectedFactura.factura_origem.numero_documento || selectedFactura.factura_origem.numero}
                    {selectedFactura.motivo_nota && <span> | Motivo: {selectedFactura.motivo_nota}</span>}
                  </div>
                )}

                {/* Tabela Itens */}
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Descricao</th>
                      <th style={{ textAlign: "right" }}>Qtd</th>
                      <th style={{ textAlign: "right" }}>Preco Unit.</th>
                      <th style={{ textAlign: "right" }}>IVA %</th>
                      <th style={{ textAlign: "right" }}>Valor IVA</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItens.map((item, i) => {
                      const subtL = Number(item.quantidade) * Number(item.preco_unitario)
                      const ivaL = Number(item.valor_iva) || calcularIvaLinha(subtL, Number(item.taxa_iva) || 16)
                      return (
                        <tr key={i}>
                          <td>{item.descricao}</td>
                          <td style={{ textAlign: "right" }}>{item.quantidade}</td>
                          <td style={{ textAlign: "right" }}>{formatarMZN(Number(item.preco_unitario))}</td>
                          <td style={{ textAlign: "right" }}>{item.taxa_iva ?? 16}%</td>
                          <td style={{ textAlign: "right" }}>{formatarMZN(ivaL)}</td>
                          <td style={{ textAlign: "right" }}>{formatarMZN(subtL + ivaL)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Totais */}
                <div style={{ background: "#f9f9f9", padding: "12px", border: "1px solid #ccc", marginTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Subtotal:</span>
                    <span>{formatarMZN(Number(selectedFactura.subtotal))} MZN</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>IVA:</span>
                    <span>{formatarMZN(Number(selectedFactura.iva))} MZN</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", borderTop: "1px solid #ccc", paddingTop: "5px", marginTop: "5px" }}>
                    <span>Total:</span>
                    <span>{formatarMZN(Number(selectedFactura.total))} MZN</span>
                  </div>
                  <div style={{ fontStyle: "italic", fontSize: "11px", marginTop: "5px" }}>
                    {numeroPorExtenso(Number(selectedFactura.total))}
                  </div>
                </div>

                {selectedFactura.forma_pagamento && (
                  <div style={{ marginTop: "10px", fontSize: "11px" }}>
                    <strong>Forma de Pagamento:</strong> {selectedFactura.forma_pagamento}
                  </div>
                )}

                {selectedFactura.observacoes && (
                  <div style={{ marginTop: "10px", fontSize: "11px" }}>
                    <strong>Observacoes:</strong> {selectedFactura.observacoes}
                  </div>
                )}

                {/* Rodape legal */}
                <div style={{ marginTop: "40px", fontSize: "10px", color: "#666", textAlign: "center", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
                  <p>Documento processado por computador - {empresa?.nome || "Empresa"}</p>
                  <p>{empresa?.nuit ? `NUIT: ${empresa.nuit}` : ""}{empresa?.endereco ? ` | ${empresa.endereco}` : ""}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrint(false)}>Fechar</Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
