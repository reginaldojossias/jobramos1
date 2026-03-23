"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { logEmitir } from "@/lib/audit-log"
import { Plus, Printer, Search, Receipt, Eye, Building2 } from "lucide-react"
import {
  FORMAS_PAGAMENTO,
  formatarMZN,
  formatarData,
  formatarDataExtenso,
} from "@/lib/documento-utils"
import { numeroPorExtenso } from "@/lib/numero-por-extenso"

interface FacturaPendente {
  id: string
  numero_documento: string | null
  numero: string | null
  total: number
  estado: string
  cliente_id: string | null
  clientes: { nome: string } | null
  total_nc: number
  ja_recebido: number
  saldo: number
}

interface ContaBancaria {
  id: string
  nome: string
  banco: string | null
  numero_conta: string | null
}

interface RecibosClientProps {
  recibos: any[]
  facturasPendentes: FacturaPendente[]
  clientes: any[]
  contasBancarias: ContaBancaria[]
  empresaId: string
  empresa: any
}

export function RecibosClient({
  recibos: initialRecibos,
  facturasPendentes: initialFacturas,
  clientes,
  contasBancarias,
  empresaId,
  empresa,
}: RecibosClientProps) {
  const [recibos, setRecibos] = useState(initialRecibos)
  const [facturasPendentes, setFacturasPendentes] = useState(initialFacturas)
  const [showDialog, setShowDialog] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [selectedRecibo, setSelectedRecibo] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Form
  const [facturaId, setFacturaId] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [valor, setValor] = useState("")
  const [formaPagamento, setFormaPagamento] = useState("Transferencia")
  const [contaBancariaId, setContaBancariaId] = useState("")
  const [observacoes, setObservacoes] = useState("")

  const supabase = createClient()

  const totalRecebido = recibos.reduce((a: number, r: any) => a + (Number(r.valor) || 0), 0)
  const totalPendente = facturasPendentes.reduce((a: number, f: FacturaPendente) => a + f.saldo, 0)

  const selectedFactura = facturasPendentes.find((f) => f.id === facturaId)

  const filteredRecibos = recibos.filter(
    (r: any) =>
      search === "" ||
      (r.numero_recibo || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.clientes?.nome || "").toLowerCase().includes(search.toLowerCase())
  )

  function resetForm() {
    setFacturaId("")
    setClienteId("")
    setValor("")
    setFormaPagamento("Transferencia")
    setContaBancariaId("")
    setObservacoes("")
  }

  function handleSelectFactura(fId: string) {
    setFacturaId(fId)
    const fac = facturasPendentes.find((f) => f.id === fId)
    if (fac) {
      setClienteId(fac.cliente_id || "")
      // Pre-preencher com o saldo em divida
      setValor(String(fac.saldo))
    }
  }

  async function handleSave() {
    if (!clienteId) {
      toast.error("Seleccione um cliente")
      return
    }
    if (!valor || Number(valor) <= 0) {
      toast.error("Indique um valor valido")
      return
    }

    // Validar que nao se paga mais que o saldo
    if (facturaId && selectedFactura) {
      if (Number(valor) > selectedFactura.saldo + 0.01) {
        toast.error(`O valor maximo para esta factura e ${formatarMZN(selectedFactura.saldo)} MZN (saldo em divida)`)
        return
      }
    }

    setIsLoading(true)
    try {
      const { data: numeroRecibo } = await supabase.rpc("gerar_numero_documento", {
        p_tipo: "RC",
        p_empresa_id: empresaId,
      })

      const { data: newRecibo, error } = await supabase
        .from("recibos")
        .insert({
          numero_recibo: numeroRecibo,
          factura_id: facturaId || null,
          cliente_id: clienteId,
          valor: Number(valor),
          forma_pagamento: formaPagamento,
          conta_bancaria_id: contaBancariaId || null,
          observacoes: observacoes || null,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          empresa_id: empresaId,
        })
        .select(`*, clientes(nome, nuit, endereco, telefone, email), facturas:factura_id(numero_documento, numero, total), conta_bancaria:conta_bancaria_id(id, nome, banco)`)
        .single()

      if (error) throw error

      // Criar movimento bancário de entrada (crédito) se conta bancária foi seleccionada
      if (contaBancariaId) {
        // Buscar saldo actual da base de dados (não usar o valor em memória que pode estar desactualizado)
        const { data: contaActual } = await supabase
          .from("contas_bancarias")
          .select("saldo_atual")
          .eq("id", contaBancariaId)
          .single()
        
        if (contaActual) {
          // Calcular novo saldo usando o valor actual da BD
          const saldoActual = Number(contaActual.saldo_atual) || 0
          const novoSaldoApos = saldoActual + Number(valor)
          
          // Inserir movimento bancário
          await supabase
            .from("movimentos_bancarios")
            .insert({
              conta_bancaria_id: contaBancariaId,
              data: new Date().toISOString().split("T")[0],
              descricao: `Recibo ${numeroRecibo} - ${clientes.find(c => c.id === clienteId)?.nome || "Cliente"}`,
              referencia: numeroRecibo,
              tipo: "credito",
              valor: Number(valor),
              saldo_apos: novoSaldoApos,
              conciliado: false,
              documento_tipo: "RC",
              documento_id: newRecibo.id,
            })

          // Actualizar saldo da conta bancária
          await supabase
            .from("contas_bancarias")
            .update({ saldo_atual: novoSaldoApos, updated_at: new Date().toISOString() })
            .eq("id", contaBancariaId)
        }
      }

      // Se vinculado a factura, actualizar estado baseado no pagamento
      if (facturaId && selectedFactura) {
        const novoRecebido = selectedFactura.ja_recebido + Number(valor)
        const totalFactura = Number(selectedFactura.total) || 0
        const novoSaldo = totalFactura - novoRecebido

        let novoEstado: string
        if (novoSaldo <= 0.01) {
          novoEstado = "Pago"
        } else {
          novoEstado = "Parcialmente Pago"
        }

        await supabase
          .from("facturas")
          .update({ estado: novoEstado })
          .eq("id", facturaId)

        // Actualizar a lista de facturas pendentes
        if (novoEstado === "Pago") {
          // Remover da lista porque ja esta pago totalmente
          setFacturasPendentes((prev) => prev.filter((f) => f.id !== facturaId))
        } else {
          // Actualizar saldo
          setFacturasPendentes((prev) =>
            prev.map((f) =>
              f.id === facturaId
                ? { ...f, ja_recebido: novoRecebido, saldo: novoSaldo, estado: novoEstado }
                : f
            )
          )
        }
      }

  setRecibos([newRecibo, ...recibos])
  setShowDialog(false)
  resetForm()
  
  // Registar log de actividade
  const clienteNome = clientes.find(c => c.id === clienteId)?.nome || "Cliente"
  await logEmitir("recibos", newRecibo.id, `Recibo ${numeroRecibo} emitido para ${clienteNome} - ${formatarMZN(Number(valor))} MZN`, {
    numero: numeroRecibo,
    cliente: clienteNome,
    valor: Number(valor)
  })
  
  toast.success(`Recibo ${numeroRecibo} emitido com sucesso`)
    } catch (error: any) {
      toast.error("Erro ao emitir recibo: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleViewPrint(recibo: any) {
    setSelectedRecibo(recibo)
    setShowPrint(true)
  }

  function handlePrint() {
    const content = printRef.current
    if (!content) return
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <html><head><title>${selectedRecibo?.numero_recibo || "Recibo"}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #000; max-width: 800px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; font-weight: bold; }
        .total-box { background: #f0fdf4; padding: 15px; border: 2px solid #22c55e; margin-top: 15px; }
        .footer { margin-top: 40px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10px; }
        @media print { body { padding: 15px; } }
      </style></head><body>${content.innerHTML}</body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Recibos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{recibos.length}</div>
            <p className="text-xs text-muted-foreground">Emitidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatarMZN(totalRecebido)} MZN</div>
            <p className="text-xs text-muted-foreground">Valor total recebido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Saldo Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">{formatarMZN(totalPendente)} MZN</div>
            <p className="text-xs text-muted-foreground">{facturasPendentes.length} factura{facturasPendentes.length !== 1 ? "s" : ""} por cobrar</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar recibos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Recibo
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Conta Destino</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecibos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhum recibo encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredRecibos.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.numero_recibo}</TableCell>
                  <TableCell>{r.clientes?.nome || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {r.facturas ? (
                      <Badge variant="outline" className="bg-primary/5 text-primary">
                        {r.facturas.numero_documento || r.facturas.numero}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Manual</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{formatarData(r.data_emissao || r.created_at)}</TableCell>
                  <TableCell className="text-sm">{r.forma_pagamento || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {r.conta_bancaria ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span>{r.conta_bancaria.nome}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {formatarMZN(Number(r.valor))} MZN
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => handleViewPrint(r)} title="Ver / Imprimir">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filteredRecibos.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">{filteredRecibos.length} recibo{filteredRecibos.length !== 1 ? "s" : ""}</span>
            <span className="font-medium text-green-600">
              {formatarMZN(filteredRecibos.reduce((a: number, r: any) => a + (Number(r.valor) || 0), 0))} MZN
            </span>
          </div>
        )}
      </div>

      {/* Dialog Novo Recibo */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Recibo</DialogTitle>
            <DialogDescription>
              Emita um recibo vinculado a uma factura ou manualmente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Factura vinculada (opcional) */}
            <div className="space-y-2">
              <Label>Factura (opcional)</Label>
              <Select value={facturaId} onValueChange={handleSelectFactura}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a uma factura..." />
                </SelectTrigger>
                <SelectContent>
                  {facturasPendentes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        <span>{f.numero_documento || f.numero}</span>
                        <span className="text-muted-foreground">-</span>
                        <span>{f.clientes?.nome}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="font-medium">Saldo: {formatarMZN(f.saldo)} MZN</span>
                        {f.ja_recebido > 0 && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 text-xs ml-1">
                            Parc.
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info da factura seleccionada */}
            {selectedFactura && (
              <div className="rounded-lg border border-dashed p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total da Factura:</span>
                  <span className="font-medium">{formatarMZN(Number(selectedFactura.total))} MZN</span>
                </div>
                {selectedFactura.total_nc > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Notas de Credito:</span>
                    <span className="font-medium text-red-600">-{formatarMZN(selectedFactura.total_nc)} MZN</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ja Recebido:</span>
                  <span className="font-medium text-green-600">{formatarMZN(selectedFactura.ja_recebido)} MZN</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-medium">Saldo em Divida:</span>
                  <span className="font-bold text-amber-600">{formatarMZN(selectedFactura.saldo)} MZN</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Valor (MZN) *
                  {selectedFactura && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      (max: {formatarMZN(selectedFactura.saldo)})
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={selectedFactura ? selectedFactura.saldo : undefined}
                  step={0.01}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0.00"
                />
                {selectedFactura && Number(valor) > 0 && Number(valor) < selectedFactura.saldo - 0.01 && (
                  <p className="text-xs text-blue-600">
                    Pagamento parcial - restara {formatarMZN(selectedFactura.saldo - Number(valor))} MZN
                  </p>
                )}
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
            </div>

            {valor && Number(valor) > 0 && (
              <p className="text-xs text-muted-foreground italic">
                {numeroPorExtenso(Number(valor))}
              </p>
            )}

            {/* Conta Bancária de Destino */}
            <div className="space-y-2">
              <Label>Conta Bancária de Destino</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione a conta para onde vai o valor..." />
                </SelectTrigger>
                <SelectContent>
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
              <p className="text-xs text-muted-foreground">Indica para qual conta bancária este pagamento foi depositado</p>
            </div>

            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Notas adicionais..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "A emitir..." : "Emitir Recibo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Impressao Recibo */}
      <Dialog open={showPrint} onOpenChange={setShowPrint}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {selectedRecibo?.numero_recibo}
            </DialogTitle>
          </DialogHeader>

          <div ref={printRef}>
            {selectedRecibo && (
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#000" }}>
                {/* Cabecalho */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>{empresa?.nome || "Empresa"}</div>
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      {empresa?.nuit && <div>NUIT: {empresa.nuit}</div>}
                      {empresa?.endereco && <div>{empresa.endereco}</div>}
                      {empresa?.cidade && <div>{[empresa.cidade, empresa.provincia].filter(Boolean).join(", ")}</div>}
                      {empresa?.telefone && <div>Tel: {empresa.telefone}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#16a34a" }}>RECIBO</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>{selectedRecibo.numero_recibo}</div>
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      Data: {formatarDataExtenso(selectedRecibo.data_emissao || selectedRecibo.created_at)}
                    </div>
                  </div>
                </div>

                {/* Cliente */}
                <div style={{ borderTop: "2px solid #000", borderBottom: "1px solid #ccc", padding: "10px 0", marginBottom: "15px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "3px" }}>Recebemos de:</div>
                  <div>{selectedRecibo.clientes?.nome}</div>
                  {selectedRecibo.clientes?.nuit && <div>NUIT: {selectedRecibo.clientes.nuit}</div>}
                  {selectedRecibo.clientes?.endereco && <div>{selectedRecibo.clientes.endereco}</div>}
                </div>

                {/* Detalhes */}
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Descricao</th>
                      <th style={{ textAlign: "left" }}>Referencia</th>
                      <th style={{ textAlign: "left" }}>Forma de Pagamento</th>
                      <th style={{ textAlign: "right" }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        {selectedRecibo.facturas
                          ? `Pagamento da ${selectedRecibo.facturas.numero_documento || selectedRecibo.facturas.numero}`
                          : "Recebimento manual"}
                      </td>
                      <td>{selectedRecibo.facturas?.numero_documento || selectedRecibo.facturas?.numero || "-"}</td>
                      <td>{selectedRecibo.forma_pagamento}</td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>{formatarMZN(Number(selectedRecibo.valor))} MZN</td>
                    </tr>
                  </tbody>
                </table>

                {/* Total */}
                <div style={{ background: "#f0fdf4", padding: "15px", border: "2px solid #22c55e", marginTop: "15px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px" }}>
                    <span>Total Recebido:</span>
                    <span>{formatarMZN(Number(selectedRecibo.valor))} MZN</span>
                  </div>
                  <div style={{ fontStyle: "italic", fontSize: "11px", marginTop: "5px" }}>
                    {numeroPorExtenso(Number(selectedRecibo.valor))}
                  </div>
                </div>

                {selectedRecibo.conta_bancaria && (
                  <div style={{ marginTop: "10px", fontSize: "11px", padding: "8px", background: "#f5f5f5", borderRadius: "4px" }}>
                    <strong>Depositado na conta:</strong> {selectedRecibo.conta_bancaria.nome}
                    {selectedRecibo.conta_bancaria.banco && ` (${selectedRecibo.conta_bancaria.banco})`}
                  </div>
                )}

                {selectedRecibo.observacoes && (
                  <div style={{ marginTop: "10px", fontSize: "11px" }}>
                    <strong>Observacoes:</strong> {selectedRecibo.observacoes}
                  </div>
                )}

                {/* Assinaturas */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "60px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "200px", paddingTop: "5px", fontSize: "11px" }}>
                      O Emitente
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "200px", paddingTop: "5px", fontSize: "11px" }}>
                      O Recebedor
                    </div>
                  </div>
                </div>

                {/* Rodape */}
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
