"use client"

import React from "react"

import { useRef } from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Search, Eye, Download, Trash2, FileText, Mail, Printer, File } from "lucide-react"
import { DocumentoUpload } from "@/components/shared/documento-upload"
import { EmailDialog } from "@/components/shared/email-dialog"
import { CartaTemplate } from "./carta-template"
import { CartaPrint } from "./carta-print"
import type { Carta } from "@/lib/types"

interface CartasClientProps {
  initialCartas: Carta[]
}

export function CartasClient({ initialCartas }: CartasClientProps) {
  const [cartas, setCartas] = useState<Carta[]>(initialCartas)
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [isPrintOpen, setIsPrintOpen] = useState(false)
  const [selectedCarta, setSelectedCarta] = useState<Carta | null>(null)
  const [printCarta, setPrintCarta] = useState<Carta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [funcionarioId, setFuncionarioId] = useState<string | null>(null)
  const supabase = createClient()
  const printRef = useRef(null) // Declare the printRef variable

  // Obter funcionario logado
  useEffect(() => {
    const getFuncionario = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: funcionario } = await supabase
          .from("funcionarios")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle()
        if (funcionario) {
          setFuncionarioId(funcionario.id)
        }
      }
    }
    getFuncionario()
  }, [supabase])

  const [formData, setFormData] = useState({
    entidade_destinataria: "",
    numero_contrato: "",
    data_contrato: "",
    valor_total: "",
    prazo_dias: "15",
    local: "Maputo",
    data_carta: new Date().toISOString().split("T")[0],
    nome_advogado: "Augusto Matalene Paunde Zandamela",
    cp_advogado: "2559",
  })

  const filteredCartas = cartas.filter(
    (carta) =>
      carta.entidade_destinataria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carta.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Formatadores
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + " MZN"
  }

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("[v0] Usuário não autenticado")
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("cartas")
        .insert([{
          user_id: user.id,
          entidade_destinataria: formData.entidade_destinataria,
          numero_contrato: formData.numero_contrato,
          data_contrato: formData.data_contrato || null,
          valor_total: parseFloat(formData.valor_total),
          prazo_dias: parseInt(formData.prazo_dias),
          local: formData.local,
          data_carta: formData.data_carta,
          nome_advogado: formData.nome_advogado,
          cp_advogado: formData.cp_advogado,
        }])
        .select()
        .single()

      if (error) {
        console.error("[v0] Erro ao salvar carta:", error)
      } else if (data) {
        setCartas([data, ...cartas])
        setFormData({
          entidade_destinataria: "",
          numero_contrato: "",
          data_contrato: "",
          valor_total: "",
          prazo_dias: "15",
          local: "Maputo",
          data_carta: new Date().toISOString().split("T")[0],
          nome_advogado: "Augusto Matalene Paunde Zandamela",
          cp_advogado: "2559",
        })
        setIsOpen(false)
      }
    } catch (error) {
      console.error("[v0] Exceção ao salvar carta:", error)
    }
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar esta carta?")) return
    const { error } = await supabase.from("cartas").delete().eq("id", id)
    if (!error) {
      setCartas(cartas.filter((c) => c.id !== id))
    }
  }

  const handlePreview = (carta: Carta) => {
    setSelectedCarta(carta)
    setIsPreviewOpen(true)
  }

  const handleEmail = (carta: Carta) => {
    setSelectedCarta(carta)
    setIsEmailOpen(true)
  }

  // Imprimir/Exportar PDF usando componente de impressao
  const handlePrint = (carta: Carta) => {
    setPrintCarta(carta)
    setIsPrintOpen(true)
  }

  const generateEmailHtml = (carta: Carta) => {
    return `\
      <h2 style="color: #2962ff; margin-bottom: 20px;">Carta de Interpelação Extrajudicial</h2>
      <p><strong>Destinatário:</strong> ${carta.entidade_destinataria}</p>
      <p><strong>Nº do Contrato:</strong> ${carta.numero_contrato}</p>
      <p><strong>Data do Contrato:</strong> ${formatDate(carta.data_contrato || '')}</p>
      <p><strong>Valor em Dívida:</strong> ${formatCurrency(carta.valor_total)}</p>
      <p><strong>Prazo de Pagamento:</strong> ${carta.prazo_dias} dias</p>
      <p><strong>Data da Carta:</strong> ${formatDate(carta.data_carta)}</p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
      <p>Por procuração outorgada pela interessada, a Empresa Magic Pro Services, servimos a presente carta para interpelar sobre o débito acima mencionado.</p>
      <p>Solicitamos o pagamento no prazo de ${carta.prazo_dias} dias, sob pena de instauração de processo judicial para cobrança.</p>
      <p style="margin-top: 20px;"><strong>O Advogado:</strong><br/>${carta.nome_advogado}<br/>CP ${carta.cp_advogado}</p>
    `
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold underline">Cartas</h1>
        <p className="text-muted-foreground">Gestão de cartas de interpelação</p>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar cartas por entidade ou contrato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Carta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Carta de Interpelação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="entidade">Entidade Destinatária *</Label>
                  <Input
                    id="entidade"
                    value={formData.entidade_destinataria}
                    onChange={(e) => setFormData({ ...formData, entidade_destinataria: e.target.value })}
                    placeholder="Ex: Instituto Oceanográfico de Moçambique"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contrato">Nº do Contrato *</Label>
                  <Input
                    id="contrato"
                    value={formData.numero_contrato}
                    onChange={(e) => setFormData({ ...formData, numero_contrato: e.target.value })}
                    placeholder="Ex: 27/ARTS/ITC/GC/UP/2025"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="data_contrato">Data do Contrato *</Label>
                  <Input
                    id="data_contrato"
                    type="date"
                    value={formData.data_contrato}
                    onChange={(e) => setFormData({ ...formData, data_contrato: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="valor">Valor da Dívida (MZN) *</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={formData.valor_total}
                    onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                    placeholder="Ex: 23400.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prazo">Prazo de Pagamento (dias)</Label>
                  <Input
                    id="prazo"
                    type="number"
                    value={formData.prazo_dias}
                    onChange={(e) => setFormData({ ...formData, prazo_dias: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="local">Local</Label>
                  <Input
                    id="local"
                    value={formData.local}
                    onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="data_carta">Data da Carta</Label>
                  <Input
                    id="data_carta"
                    type="date"
                    value={formData.data_carta}
                    onChange={(e) => setFormData({ ...formData, data_carta: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="advogado">Nome do Advogado</Label>
                  <Input
                    id="advogado"
                    value={formData.nome_advogado}
                    onChange={(e) => setFormData({ ...formData, nome_advogado: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cedula">Cédula Profissional</Label>
                  <Input
                    id="cedula"
                    value={formData.cp_advogado}
                    onChange={(e) => setFormData({ ...formData, cp_advogado: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "A guardar..." : "Guardar Carta"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entidade</TableHead>
              <TableHead>Nº Contrato</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCartas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Nenhuma carta criada. Clique em Nova Carta para começar.
                </TableCell>
              </TableRow>
            ) : (
              filteredCartas.map((carta) => (
                <TableRow key={carta.id}>
                  <TableCell className="font-medium">{carta.entidade_destinataria}</TableCell>
                  <TableCell>{carta.numero_contrato}</TableCell>
                  <TableCell>{new Date(carta.data_carta).toLocaleDateString("pt-PT")}</TableCell>
                  <TableCell>{formatCurrency(carta.valor_total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handlePreview(carta)} title="Pré-visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handlePrint(carta)} title="Imprimir/PDF">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEmail(carta)} title="Enviar por Email">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(carta.id)}
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                      >
<Trash2 className="h-4 w-4" />
</Button>
<DocumentoUpload
  tipoDocumento="carta"
  documentoId={carta.id}
  documentoNumero={carta.numero}
/>
</div>
</TableCell>
</TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filteredCartas.length > 0 && (
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            {filteredCartas.length} carta{filteredCartas.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Preview Modal - Usa o Template */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Carta</DialogTitle>
          </DialogHeader>
          {selectedCarta && (
            <div className="border rounded-lg overflow-hidden shadow-lg">
              <CartaTemplate carta={selectedCarta} />
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Fechar
            </Button>
            {selectedCarta && (
              <Button onClick={() => handlePrint(selectedCarta)}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir / PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      {selectedCarta && (
        <EmailDialog
          isOpen={isEmailOpen}
          onClose={() => {
            setIsEmailOpen(false)
            setSelectedCarta(null)
          }}
          documentType="carta"
          documentNumber={selectedCarta.numero_contrato}
          defaultSubject={`Carta de Interpelação Extrajudicial - Contrato ${selectedCarta.numero_contrato}`}
          defaultBody={`Exmo(a). Senhor(a),

Enviamos em anexo a Carta de Interpelação Extrajudicial referente ao contrato nº ${selectedCarta.numero_contrato}, no valor de ${formatCurrency(selectedCarta.valor_total)}.

Solicitamos o pagamento no prazo de ${selectedCarta.prazo_dias} dias.

Com os melhores cumprimentos,
Magic Pro Services`}
          attachmentHtml={generateEmailHtml(selectedCarta)}
          referenciaId={selectedCarta.id}
          enviadoPor={funcionarioId || undefined}
        />
      )}

      {/* Print Modal */}
      {isPrintOpen && printCarta && (
        <CartaPrint
          carta={printCarta}
          onClose={() => {
            setIsPrintOpen(false)
            setPrintCarta(null)
          }}
        />
      )}
    </div>
  )
}
