"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea" // Adicionei o Textarea
import { Plus, Search, FileSpreadsheet, Eye, Trash2, Printer, Mail, File } from "lucide-react"
import { EmailDialog } from "@/components/shared/email-dialog"
import { DocumentoUpload } from "@/components/shared/documento-upload"
import { Badge } from "@/components/ui/badge"
import { CotacaoPrint } from "./cotacao-print"

interface Funcionario {
  id: string
  nome: string
  cargo?: string
}

interface Cotacao {
  id: string
  numero: string
  data: string
  validade: string | null
  cliente_id: string | null
  total: number
  estado: string
  notas?: string // Adicionei este campo
  clientes?: {
    id: string
    nome: string
    nuit?: string | null
    endereco?: string | null
    telefone?: string | null
    email?: string | null
  } | null
  funcionarios?: { nome: string } | null
  diretor_geral?: string
}

interface Cliente {
  id: string
  nome: string
  nuit?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
}

interface Produto {
  id: string
  nome: string
  preco: number
}

interface ItemLinha {
  id: string
  produto_id: string
  descricao: string
  quantidade: number
  preco_unitario: number
  total: number
}

interface CotacoesClientProps {
  cotacoes: Cotacao[]
  clientes: Cliente[]
  produtos: Produto[]
  funcionarioId: string | null
}

const fetcher = async (key: string) => {
  const supabase = createClient()
  const { data } = await supabase
    .from("cotacoes")
    .select(`
      *,
      clientes:cliente_id (
        id,
        nome,
        nuit,
        endereco,
        telefone,
        email
      ),
      funcionarios:criado_por_funcionario_id(nome)
    `)
    .order("created_at", { ascending: false })
  return data || []
}

const fetchFuncionarios = async () => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("funcionarios")
    .select("id, nome, cargo")
    .order("nome")
  if (error) {
    console.error("Erro ao buscar funcionários:", error)
    return []
  }
  return data
}

const fetchClienteCompleto = async (clienteId: string | null) => {
  if (!clienteId) return null
  const supabase = createClient()
  const { data } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .single()
  return data
}

export function CotacoesClient({ cotacoes: initialCotacoes, clientes, produtos, funcionarioId }: CotacoesClientProps) {
  const router = useRouter()
  const { data: cotacoes = initialCotacoes, mutate } = useSWR<Cotacao[]>("cotacoes", fetcher, {
    fallbackData: initialCotacoes,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null)
  const [cotacaoItens, setCotacaoItens] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [empresa, setEmpresa] = useState<any>(null)
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [emailCotacao, setEmailCotacao] = useState<Cotacao | null>(null)
  const [emailItens, setEmailItens] = useState<any[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [diretorGeral, setDiretorGeral] = useState<string>("")
  const [selectedDiretorGeral, setSelectedDiretorGeral] = useState<string>("")

  const [numero, setNumero] = useState(String(initialCotacoes.length + 1).padStart(3, "0"))
  const [data, setData] = useState(new Date().toISOString().split("T")[0])
  const [validade, setValidade] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [estado, setEstado] = useState("Pendente")
  const [itens, setItens] = useState<ItemLinha[]>([])
  const [notas, setNotas] = useState<string>("") // Adicionei estado para notas

  useEffect(() => {
    const loadFuncionarios = async () => {
      const funcionariosData = await fetchFuncionarios()
      setFuncionarios(funcionariosData)
      
      const diretor = funcionariosData.find(f => f.cargo?.toLowerCase().includes('diretor'))
      if (diretor) {
        setDiretorGeral(diretor.id)
      }
    }
    loadFuncionarios()
  }, [])

  const filteredCotacoes = cotacoes.filter(
    (c) =>
      c.numero.toLowerCase().includes(search.toLowerCase()) ||
      c.clientes?.nome?.toLowerCase().includes(search.toLowerCase()),
  )

  const subtotal = itens.reduce((acc, item) => acc + item.total, 0)
  const iva = subtotal * 0.16
  const total = subtotal + iva

  const addLinha = () => {
    setItens([
      ...itens,
      {
        id: crypto.randomUUID(),
        produto_id: "",
        descricao: "",
        quantidade: 1,
        preco_unitario: 0,
        total: 0,
      },
    ])
  }

  const updateLinha = (id: string, field: keyof ItemLinha, value: string | number) => {
    setItens(
      itens.map((item) => {
        if (item.id !== id) return item

        const updated = { ...item, [field]: value }

        if (field === "produto_id") {
          const produto = produtos.find((p) => p.id === value)
          if (produto) {
            updated.descricao = produto.nome
            updated.preco_unitario = Number(produto.preco)
          }
        }

        if (field === "quantidade" || field === "preco_unitario" || field === "produto_id") {
          const qty = field === "quantidade" ? Number(value) : updated.quantidade
          const price = field === "preco_unitario" ? Number(value) : updated.preco_unitario
          updated.total = qty * price
        }

        return updated
      }),
    )
  }

  const removeLinha = (id: string) => {
    setItens(itens.filter((item) => item.id !== id))
  }

  const handleSubmit = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Não autenticado")

      const { data: cotacao, error } = await supabase
        .from("cotacoes")
        .insert({
          user_id: user.id,
          criado_por_funcionario_id: funcionarioId,
          numero,
          data,
          validade: validade || null,
          cliente_id: clienteId || null,
          subtotal,
          iva,
          total,
          estado,
          diretor_geral: diretorGeral,
          notas: notas || null,
        })
        .select()
        .single()

      if (error) throw error

      if (itens.length > 0) {
        const itensToInsert = itens.map((item) => ({
          cotacao_id: cotacao.id,
          produto_id: item.produto_id || null,
          descricao: item.descricao,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          total: item.total,
        }))

        await supabase.from("cotacao_itens").insert(itensToInsert)
      }

      setIsOpen(false)
      mutate()
      // Limpar o formulário
      setNumero(String(cotacoes.length + 2).padStart(3, "0"))
      setData(new Date().toISOString().split("T")[0])
      setValidade("")
      setClienteId("")
      setEstado("Pendente")
      setItens([])
      setNotas("")
    } catch (error) {
      console.error("Erro ao criar cotação:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from("cotacoes").delete().eq("id", id)
    mutate(cotacoes.filter((c) => c.id !== id))
  }

  const handleView = async (cotacao: Cotacao) => {
    setSelectedCotacao(cotacao)
    setSelectedDiretorGeral(cotacao.diretor_geral || "")
    const supabase = createClient()
    const { data } = await supabase
      .from("cotacao_itens")
      .select("*, produtos(nome)")
      .eq("cotacao_id", cotacao.id)
    setCotacaoItens(data || [])
    setViewDialogOpen(true)
  }

  const handlePreview = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (user) {
      const { data: empresaData } = await supabase
        .from("empresas")
        .select("*")
        .eq("user_id", user.id)
        .single()
      
      if (empresaData) {
        setEmpresa(empresaData)
      } else {
        setEmpresa({
          id: "",
          user_id: user.id,
          nome: "Magic Pro Services",
          nuit: "400000000",
          endereco: "Maputo, Moçambique",
          telefone: "+258 84 000 0000",
          email: "info@magicpro.co.mz",
          created_at: new Date().toISOString()
        })
      }
    }
    
    // Buscar dados completos do cliente
    if (clienteId) {
      const clienteCompleto = await fetchClienteCompleto(clienteId)
      setClienteSelecionado(clienteCompleto)
    }
    
    setShowPreview(true)
  }

  const handlePrintExisting = async (cotacao: Cotacao) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (user) {
      const { data: empresaData } = await supabase
        .from("empresas")
        .select("*")
        .eq("user_id", user.id)
        .single()
      
      if (empresaData) {
        setEmpresa(empresaData)
      } else {
        setEmpresa({
          id: "",
          user_id: user.id,
          nome: "Magic Pro Services",
          nuit: "400000000",
          endereco: "Maputo, Moçambique",
          telefone: "+258 84 000 0000",
          email: "info@magicpro.co.mz",
          created_at: new Date().toISOString()
        })
      }
    }

    // Buscar dados completos do cliente
    if (cotacao.cliente_id) {
      const clienteCompleto = await fetchClienteCompleto(cotacao.cliente_id)
      setClienteSelecionado(clienteCompleto)
    }

    setSelectedCotacao(cotacao)
    setSelectedDiretorGeral(cotacao.diretor_geral || "")
    setShowPreview(true)
  }

  const totalGeral = filteredCotacoes.reduce((acc, c) => acc + Number(c.total), 0)

  const handleEmail = async (cotacao: Cotacao) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("cotacao_itens")
      .select("*, produtos(nome)")
      .eq("cotacao_id", cotacao.id)
    setEmailItens(data || [])
    setEmailCotacao(cotacao)
    setIsEmailOpen(true)
  }

  const handleEstadoChange = async (novoEstado: string) => {
    if (!selectedCotacao) return
    
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("cotacoes")
        .update({ estado: novoEstado })
        .eq("id", selectedCotacao.id)
      
      if (error) throw error
      
      setSelectedCotacao({ ...selectedCotacao, estado: novoEstado })
      
      mutate(
        cotacoes.map((c) =>
          c.id === selectedCotacao.id ? { ...c, estado: novoEstado } : c
        )
      )
    } catch (error) {
      console.error("Erro ao atualizar estado:", error)
    }
  }

  const handleDiretorGeralChange = async (novoDiretorId: string) => {
    if (!selectedCotacao) return
    
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("cotacoes")
        .update({ diretor_geral: novoDiretorId })
        .eq("id", selectedCotacao.id)
      
      if (error) throw error
      
      setSelectedCotacao({ ...selectedCotacao, diretor_geral: novoDiretorId })
      setSelectedDiretorGeral(novoDiretorId)
      
      mutate(
        cotacoes.map((c) =>
          c.id === selectedCotacao.id ? { ...c, diretor_geral: novoDiretorId } : c
        )
      )
    } catch (error) {
      console.error("Erro ao atualizar diretor geral:", error)
    }
  }

  const handleNotasChange = async (novasNotas: string) => {
    if (!selectedCotacao) return
    
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("cotacoes")
        .update({ notas: novasNotas })
        .eq("id", selectedCotacao.id)
      
      if (error) throw error
      
      setSelectedCotacao({ ...selectedCotacao, notas: novasNotas })
      
      mutate(
        cotacoes.map((c) =>
          c.id === selectedCotacao.id ? { ...c, notas: novasNotas } : c
        )
      )
    } catch (error) {
      console.error("Erro ao atualizar notas:", error)
    }
  }

  const generateEmailHtml = (cotacao: Cotacao, itens: any[]) => {
    const subtotal = Number(cotacao.total) / 1.16
    const iva = Number(cotacao.total) - subtotal
    
    const itensHtml = itens.map((item, index) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.produtos?.nome || item.descricao}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${Number(item.quantidade)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${Number(item.preco_unitario).toLocaleString("pt-MZ")} MZN</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${Number(item.total).toLocaleString("pt-MZ")} MZN</td>
      </tr>
    `).join("")

    return `
      <h2 style="color: #2962ff; margin-bottom: 20px;">Cotação Nº ${cotacao.numero}</h2>
      <p><strong>Cliente:</strong> ${cotacao.clientes?.nome || "-"}</p>
      <p><strong>Data:</strong> ${new Date(cotacao.data).toLocaleDateString("pt-PT")}</p>
      <p><strong>Validade:</strong> ${cotacao.validade ? new Date(cotacao.validade).toLocaleDateString("pt-PT") : "-"}</p>
      <p><strong>Estado:</strong> ${cotacao.estado}</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">#</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Descrição</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Qtd</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Preço Unit.</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itensHtml}
        </tbody>
      </table>
      
      <div style="margin-top: 20px; text-align: right;">
        <p><strong>Subtotal:</strong> ${subtotal.toLocaleString("pt-MZ")} MZN</p>
        <p><strong>IVA (16%):</strong> ${iva.toLocaleString("pt-MZ")} MZN</p>
        <p style="font-size: 18px; color: #2962ff;"><strong>Total:</strong> ${Number(cotacao.total).toLocaleString("pt-MZ")} MZN</p>
      </div>
    `
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar cotações por número ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Cotação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Cotação</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Nº da Cotação</Label>
                  <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
                </div>
                <div>
                  <Label>Data da Cotação</Label>
                  <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
                </div>
                <div>
                  <Label>Validade</Label>
                  <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={estado} onValueChange={setEstado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Aceite">Aceite</SelectItem>
                      <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Cliente *</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione ou digite o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Diretor Geral para assinar a fatura</Label>
                <Select value={diretorGeral} onValueChange={setDiretorGeral}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione o Diretor Geral..." />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((funcionario) => (
                      <SelectItem key={funcionario.id} value={funcionario.id}>
                        {funcionario.nome} {funcionario.cargo ? `(${funcionario.cargo})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Adicionei o campo de Notas */}
              <div>
                <Label>Notas para a cotação</Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Escreva notas importantes sobre esta cotação..."
                  rows={4}
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Estas notas aparecerão na fatura impressa na secção "NOTA".
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Produtos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLinha}>
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar Linha
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Produto / Descrição</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Clique em &quot;Adicionar Linha&quot; para incluir produtos
                        </TableCell>
                      </TableRow>
                    ) : (
                      itens.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Select
                              value={item.produto_id}
                              onValueChange={(v) => updateLinha(item.id, "produto_id", v)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Produto..." />
                              </SelectTrigger>
                              <SelectContent>
                                {produtos.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-24"
                              value={item.preco_unitario}
                              onChange={(e) => updateLinha(item.id, "preco_unitario", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-16"
                              value={item.quantidade}
                              onChange={(e) => updateLinha(item.id, "quantidade", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>{item.total.toLocaleString("pt-MZ")} MZN</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeLinha(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-semibold mb-2">Resumo</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{subtotal.toLocaleString("pt-MZ")} MZN</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (16%)</span>
                    <span>{iva.toLocaleString("pt-MZ")} MZN</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{total.toLocaleString("pt-MZ")} MZN</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
                  {isLoading ? "A guardar..." : "Guardar Cotação"}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  className="flex items-center gap-2 bg-transparent"
                  onClick={handlePreview}
                  disabled={!clienteId || itens.length === 0}
                >
                  <Printer className="h-4 w-4" />
                  Pré-visualizar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Cotação</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCotacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-sidebar-accent">
                  Nenhuma cotação criada. Clique em &quot;Nova Cotação&quot; para começar.
                </TableCell>
              </TableRow>
            ) : (
              filteredCotacoes.map((cotacao) => (
                <TableRow key={cotacao.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                      {cotacao.numero}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(cotacao.data).toLocaleDateString("pt-PT")}</TableCell>
                  <TableCell>
                    {cotacao.validade ? new Date(cotacao.validade).toLocaleDateString("pt-PT") : "-"}
                  </TableCell>
                  <TableCell>{cotacao.clientes?.nome || "-"}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {cotacao.funcionarios?.nome || "-"}
                    </span>
                  </TableCell>
                  <TableCell>{Number(cotacao.total).toLocaleString("pt-MZ")} MZN</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        cotacao.estado === "Pendente"
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          : cotacao.estado === "Aceite"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : ""
                      }
                    >
                      {cotacao.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleView(cotacao)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEmail(cotacao)} title="Enviar por Email">
                        <Mail className="h-4 w-4" />
                      </Button>
<Button variant="ghost" size="sm" onClick={() => handleDelete(cotacao.id)} title="Eliminar cotacao">
<Trash2 className="h-4 w-4 text-destructive" />
</Button>
<DocumentoUpload
  tipoDocumento="cotacao"
  documentoId={cotacao.id}
  documentoNumero={cotacao.numero}
/>
</div>
</TableCell>
</TableRow>
))
)}
</TableBody>
        </Table>
        {filteredCotacoes.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-sidebar-accent">
              {filteredCotacoes.length} cotaç{filteredCotacoes.length !== 1 ? "ões" : "ão"}
            </span>
            <span className="text-sidebar-accent">Total: {totalGeral.toLocaleString("pt-MZ")} MZN</span>
          </div>
        )}
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Cotação {selectedCotacao?.numero}</DialogTitle>
          </DialogHeader>
          {selectedCotacao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Cliente:</span> {selectedCotacao.clientes?.nome || "-"}
                </div>
                <div>
                  <span className="font-semibold">Data:</span> {new Date(selectedCotacao.data).toLocaleDateString("pt-PT")}
                </div>
                <div>
                  <span className="font-semibold">Validade:</span>{" "}
                  {selectedCotacao.validade ? new Date(selectedCotacao.validade).toLocaleDateString("pt-PT") : "-"}
                </div>
                <div>
                  <span className="font-semibold">Estado:</span>{" "}
                  <Select value={selectedCotacao.estado} onValueChange={handleEstadoChange}>
                    <SelectTrigger className="w-40 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Aceite">Aceite</SelectItem>
                      <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Diretor Geral para assinar a fatura</Label>
                <Select value={selectedDiretorGeral} onValueChange={handleDiretorGeralChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione o Diretor Geral..." />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((funcionario) => (
                      <SelectItem key={funcionario.id} value={funcionario.id}>
                        {funcionario.nome} {funcionario.cargo ? `(${funcionario.cargo})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  O diretor selecionado aparecerá como assinante na fatura impressa.
                </p>
              </div>

              {/* Adicionei o campo de Notas na visualização */}
              <div>
                <Label>Notas da cotação</Label>
                <Textarea
                  value={selectedCotacao.notas || ""}
                  onChange={(e) => {
                    setSelectedCotacao({ ...selectedCotacao, notas: e.target.value })
                  }}
                  onBlur={(e) => {
                    if (e.target.value !== selectedCotacao.notas) {
                      handleNotasChange(e.target.value)
                    }
                  }}
                  placeholder="Escreva notas importantes sobre esta cotação..."
                  rows={4}
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Estas notas aparecerão na fatura impressa na secção "NOTA".
                </p>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto/Descrição</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Preço Unitário</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cotacaoItens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.produtos?.nome || item.descricao}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{Number(item.preco_unitario).toLocaleString("pt-MZ")} MZN</TableCell>
                        <TableCell className="text-right">{Number(item.total).toLocaleString("pt-MZ")} MZN</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{Number(selectedCotacao.total / 1.16).toLocaleString("pt-MZ")} MZN</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%):</span>
                  <span>{Number(selectedCotacao.total - selectedCotacao.total / 1.16).toLocaleString("pt-MZ")} MZN</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{Number(selectedCotacao.total).toLocaleString("pt-MZ")} MZN</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => handlePrintExisting(selectedCotacao)}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showPreview && empresa && (
        <CotacaoPrint
          empresa={empresa}
          cliente={clienteSelecionado}
          numeroCotacao={selectedCotacao ? selectedCotacao.numero : numero}
          dataCotacao={selectedCotacao ? selectedCotacao.data : data}
          dataValidade={selectedCotacao ? selectedCotacao.validade || "" : validade}
          linhas={
            selectedCotacao
              ? cotacaoItens.map((item, index) => ({
                  id: index,
                  produto_id: item.produto_id,
                  descricao: item.produtos?.nome || item.descricao,
                  preco_unitario: Number(item.preco_unitario),
                  quantidade: item.quantidade,
                }))
              : itens.map((item) => ({
                  id: Number(item.id.split("-")[0]),
                  produto_id: item.produto_id,
                  descricao: item.descricao,
                  preco_unitario: item.preco_unitario,
                  quantidade: item.quantidade,
                }))
          }
          subtotal={selectedCotacao ? Number(selectedCotacao.total / 1.16) : subtotal}
          iva={selectedCotacao ? Number(selectedCotacao.total - selectedCotacao.total / 1.16) : iva}
          total={selectedCotacao ? Number(selectedCotacao.total) : total}
          diretorGeral={
            selectedCotacao 
              ? funcionarios.find(f => f.id === selectedCotacao.diretor_geral)?.nome || "Ramos Siquice"
              : funcionarios.find(f => f.id === diretorGeral)?.nome || "Ramos Siquice"
          }
          notas={selectedCotacao ? selectedCotacao.notas : notas} // Passei as notas
          onClose={() => {
            setShowPreview(false)
            setSelectedCotacao(null)
            setClienteSelecionado(null)
            setViewDialogOpen(false)
          }}
        />
      )}

      {emailCotacao && (
        <EmailDialog
          isOpen={isEmailOpen}
          onClose={() => {
            setIsEmailOpen(false)
            setEmailCotacao(null)
            setEmailItens([])
          }}
          documentType="cotacao"
          documentNumber={emailCotacao.numero}
          defaultSubject={`Cotação Nº ${emailCotacao.numero} - Magic Pro Services`}
          defaultBody={`Exmo(a). Senhor(a),\n\nEnviamos em anexo a Cotação Nº ${emailCotacao.numero}, no valor de ${Number(emailCotacao.total).toLocaleString("pt-MZ")} MZN.\n\nA cotação tem validade até ${emailCotacao.validade ? new Date(emailCotacao.validade).toLocaleDateString("pt-PT") : "30 dias a partir da data de emissão"}.\n\nFicamos ao dispor para qualquer esclarecimento adicional.\n\nCom os melhores cumprimentos,\nMagic Pro Services`}
          attachmentHtml={generateEmailHtml(emailCotacao, emailItens)}
          referenciaId={emailCotacao.id}
          enviadoPor={funcionarioId || undefined}
        />
      )}
    </div>
  )
}
