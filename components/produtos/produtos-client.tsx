"use client"

import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, Search, Package, Pencil, Trash2, Save, 
  ArrowDownCircle, ArrowUpCircle, History, TrendingUp,
  Truck, AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

interface Produto {
  id: string
  nome: string
  descricao: string | null
  preco: number
  custo_unitario: number | null
  stock: number
  unidade: string
  fornecedor_id: string | null
  total_entradas?: number
  total_vendido?: number
  margem_lucro?: number | null
  fornecedor_principal?: string | null
  movimentos?: any[]
}

interface Fornecedor {
  id: string
  nome: string
}

interface ProdutosClientProps {
  produtos: Produto[]
  fornecedores: Fornecedor[]
  empresaId: string
}

const formatarMZN = (valor: number) => {
  return new Intl.NumberFormat("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor || 0)
}

const formatarData = (data: string) => {
  if (!data) return "-"
  return new Date(data).toLocaleDateString("pt-MZ")
}

export function ProdutosClient({ produtos: initialProdutos, fornecedores, empresaId }: ProdutosClientProps) {
  const supabase = createClient()
  const [produtos, setProdutos] = useState<Produto[]>(initialProdutos)
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isStockOpen, setIsStockOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null)
  
  // Prevent double submissions
  const isSubmittingRef = useRef(false)
  const isStockSubmittingRef = useRef(false)

  // Form states for product
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [preco, setPreco] = useState("")
  const [custoUnitario, setCustoUnitario] = useState("")
  const [stock, setStock] = useState("")
  const [unidade, setUnidade] = useState("un")
  const [fornecedorId, setFornecedorId] = useState("")

  // Form states for stock entry
  const [stockProdutoId, setStockProdutoId] = useState("")
  const [stockFornecedorId, setStockFornecedorId] = useState("")
  const [stockQuantidade, setStockQuantidade] = useState("")
  const [stockPrecoCusto, setStockPrecoCusto] = useState("")
  const [stockData, setStockData] = useState(new Date().toISOString().split("T")[0])
  const [stockReferencia, setStockReferencia] = useState("")
  const [stockObservacoes, setStockObservacoes] = useState("")

  // Stats
  const totalProdutos = produtos.length
  const produtosComStock = produtos.filter(p => p.stock > 0).length
  const produtosSemStock = produtos.filter(p => p.stock <= 0).length
  const valorTotalStock = produtos.reduce((acc, p) => acc + (p.stock * (p.custo_unitario || p.preco || 0)), 0)

  const filteredProdutos = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) || 
      p.descricao?.toLowerCase().includes(search.toLowerCase()),
  )

  const resetForm = () => {
    setNome("")
    setDescricao("")
    setPreco("")
    setCustoUnitario("")
    setStock("")
    setUnidade("un")
    setFornecedorId("")
    setEditingId(null)
  }

  const resetStockForm = () => {
    setStockProdutoId("")
    setStockFornecedorId("")
    setStockQuantidade("")
    setStockPrecoCusto("")
    setStockData(new Date().toISOString().split("T")[0])
    setStockReferencia("")
    setStockObservacoes("")
  }

  // Auto-fill price when supplier is selected in stock entry
  useEffect(() => {
    if (stockFornecedorId && stockProdutoId) {
      const fetchPrecoCusto = async () => {
        const { data } = await supabase
          .from("fornecedor_produtos")
          .select("preco_custo")
          .eq("fornecedor_id", stockFornecedorId)
          .eq("produto_id", stockProdutoId)
          .single()
        
        if (data?.preco_custo) {
          setStockPrecoCusto(data.preco_custo.toString())
        }
      }
      fetchPrecoCusto()
    }
  }, [stockFornecedorId, stockProdutoId])

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Não autenticado")
      isSubmittingRef.current = false
      return
    }

    setIsLoading(true)

    try {
      const produtoData = {
        nome,
        descricao: descricao || null,
        preco: Number.parseFloat(preco) || 0,
        custo_unitario: Number.parseFloat(custoUnitario) || null,
        stock: Number.parseInt(stock) || 0,
        unidade,
        fornecedor_id: fornecedorId || null,
      }

      if (editingId) {
        const { error } = await supabase.from("produtos").update(produtoData).eq("id", editingId)
        if (error) throw error
        setProdutos(produtos.map(p => p.id === editingId ? { ...p, ...produtoData } : p))
        toast.success("Produto actualizado com sucesso")
      } else {
        const { data: newProduto, error } = await supabase.from("produtos").insert({
          user_id: user.id,
          empresa_id: empresaId,
          ...produtoData,
        }).select().single()
        if (error) throw error
        setProdutos([{ ...newProduto, total_entradas: 0, total_vendido: 0, movimentos: [] }, ...produtos])
        toast.success("Produto criado com sucesso")
      }

      setIsOpen(false)
      resetForm()
    } catch (error: any) {
      toast.error(`Erro ao ${editingId ? "actualizar" : "criar"} produto: ${error.message}`)
    } finally {
      setIsLoading(false)
      isSubmittingRef.current = false
    }
  }

  const handleStockEntry = async () => {
    // Prevent double submission
    if (isStockSubmittingRef.current) return
    isStockSubmittingRef.current = true
    
    if (!stockProdutoId || !stockQuantidade || Number(stockQuantidade) <= 0) {
      toast.error("Preencha o produto e a quantidade")
      isStockSubmittingRef.current = false
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Não autenticado")
      isStockSubmittingRef.current = false
      return
    }

    setIsLoading(true)

    try {
      const quantidade = Number.parseInt(stockQuantidade)
      const precoCusto = Number.parseFloat(stockPrecoCusto) || null

      // Insert stock movement
      const { error: movError } = await supabase.from("movimentos_stock").insert({
        empresa_id: empresaId,
        produto_id: stockProdutoId,
        fornecedor_id: stockFornecedorId || null,
        tipo: "entrada",
        quantidade,
        preco_custo: precoCusto,
        documento_tipo: "compra",
        documento_referencia: stockReferencia || null,
        observacoes: stockObservacoes || null,
        data: stockData,
        user_id: user.id,
      })
      if (movError) throw movError

      // Update product stock and cost
      const produto = produtos.find(p => p.id === stockProdutoId)
      if (produto) {
        const novoStock = (produto.stock || 0) + quantidade
        const updateData: any = { stock: novoStock }
        
        // Update unit cost if provided
        if (precoCusto) {
          updateData.custo_unitario = precoCusto
        }

        await supabase.from("produtos").update(updateData).eq("id", stockProdutoId)

        // Update local state
        setProdutos(produtos.map(p => 
          p.id === stockProdutoId 
            ? { 
                ...p, 
                stock: novoStock, 
                custo_unitario: precoCusto || p.custo_unitario,
                total_entradas: (p.total_entradas || 0) + quantidade 
              } 
            : p
        ))
      }

      // Update or create supplier product relationship
      if (stockFornecedorId && precoCusto) {
        await supabase.from("fornecedor_produtos").upsert({
          empresa_id: empresaId,
          fornecedor_id: stockFornecedorId,
          produto_id: stockProdutoId,
          preco_custo: precoCusto,
          ultimo_fornecimento: stockData,
        }, { onConflict: "fornecedor_id,produto_id" })
      }

      setIsStockOpen(false)
      resetStockForm()
      toast.success(`Entrada de ${quantidade} unidades registada com sucesso`)
    } catch (error: any) {
      toast.error(`Erro ao registar entrada: ${error.message}`)
    } finally {
      setIsLoading(false)
      isStockSubmittingRef.current = false
    }
  }

  const handleEdit = (produto: Produto) => {
    setEditingId(produto.id)
    setNome(produto.nome)
    setDescricao(produto.descricao || "")
    setPreco(produto.preco?.toString() || "")
    setCustoUnitario(produto.custo_unitario?.toString() || "")
    setStock(produto.stock?.toString() || "0")
    setUnidade(produto.unidade || "un")
    setFornecedorId(produto.fornecedor_id || "")
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar este produto?")) return
    
    const { error } = await supabase.from("produtos").delete().eq("id", id)
    if (error) {
      toast.error("Erro ao eliminar produto: " + error.message)
      return
    }
    setProdutos(produtos.filter((p) => p.id !== id))
    toast.success("Produto eliminado")
  }

  const openHistory = (produto: Produto) => {
    setSelectedProduto(produto)
    setIsHistoryOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProdutos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Com Stock</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{produtosComStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sem Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{produtosSemStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor em Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMZN(valorTotalStock)} MZN</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar produtos por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Stock Entry Dialog */}
        <Dialog open={isStockOpen} onOpenChange={(open) => {
          setIsStockOpen(open)
          if (!open) resetStockForm()
        }}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              Registar Entrada de Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Registar Entrada de Stock</DialogTitle>
              <DialogDescription>
                Registe a entrada de produtos no stock, associando ao fornecedor e factura de compra.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Produto */}
              <div className="grid gap-2">
                <Label>Produto *</Label>
                <Select value={stockProdutoId} onValueChange={setStockProdutoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione o produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} (Stock actual: {p.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fornecedor */}
              <div className="grid gap-2">
                <Label>Fornecedor</Label>
                <Select value={stockFornecedorId} onValueChange={setStockFornecedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione o fornecedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantidade e Preço */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    value={stockQuantidade}
                    onChange={(e) => setStockQuantidade(e.target.value)}
                    placeholder="0"
                    min="1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Preço de Custo Unitário (MZN)</Label>
                  <Input
                    type="number"
                    value={stockPrecoCusto}
                    onChange={(e) => setStockPrecoCusto(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Data e Referência */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={stockData}
                    onChange={(e) => setStockData(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Referência (Nº Factura Fornecedor)</Label>
                  <Input
                    value={stockReferencia}
                    onChange={(e) => setStockReferencia(e.target.value)}
                    placeholder="Ex: FT2024/001"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea
                  value={stockObservacoes}
                  onChange={(e) => setStockObservacoes(e.target.value)}
                  placeholder="Notas adicionais..."
                  rows={2}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsStockOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleStockEntry} disabled={isLoading || !stockProdutoId || !stockQuantidade}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "A registar..." : "Registar Entrada"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Product Dialog */}
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome do Produto *</Label>
                <Input 
                  id="nome" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Nome do produto" 
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descricao">Detalhes</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição detalhada do produto"
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label>Fornecedor Principal</Label>
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione o fornecedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="custoUnitario">Preço de Custo (MZN)</Label>
                  <Input
                    id="custoUnitario"
                    type="number"
                    value={custoUnitario}
                    onChange={(e) => setCustoUnitario(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="preco">Preço de Venda (MZN)</Label>
                  <Input
                    id="preco"
                    type="number"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="stock">Stock Inicial</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Unidade</Label>
                  <Select value={unidade} onValueChange={setUnidade}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidade</SelectItem>
                      <SelectItem value="kg">Quilograma</SelectItem>
                      <SelectItem value="lt">Litro</SelectItem>
                      <SelectItem value="m">Metro</SelectItem>
                      <SelectItem value="cx">Caixa</SelectItem>
                      <SelectItem value="pc">Peça</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading || !nome}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "A guardar..." : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Preço Venda</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Comprado</TableHead>
              <TableHead className="text-right">Vendido</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Acções</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProdutos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhum produto registado. Clique em &quot;Novo Produto&quot; para começar.
                </TableCell>
              </TableRow>
            ) : (
              filteredProdutos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{produto.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                    {produto.descricao || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {produto.custo_unitario ? `${formatarMZN(produto.custo_unitario)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatarMZN(produto.preco)} MZN
                  </TableCell>
                  <TableCell className="text-right">
                    {produto.margem_lucro !== null && produto.margem_lucro !== undefined ? (
                      <Badge variant={produto.margem_lucro > 20 ? "default" : produto.margem_lucro > 0 ? "secondary" : "destructive"}>
                        {produto.margem_lucro.toFixed(1)}%
                      </Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={produto.stock > 0 ? "outline" : "destructive"}>
                      {produto.stock} {produto.unidade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    +{produto.total_entradas || 0}
                  </TableCell>
                  <TableCell className="text-right text-blue-600">
                    -{produto.total_vendido || 0}
                  </TableCell>
                  <TableCell className="text-sm">
                    {produto.fornecedor_principal ? (
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {produto.fornecedor_principal}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openHistory(produto)} title="Ver histórico">
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(produto)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(produto.id)} title="Eliminar">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filteredProdutos.length > 0 && (
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            {filteredProdutos.length} produto{filteredProdutos.length !== 1 ? "s" : ""} registado{filteredProdutos.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Histórico de Movimentos - {selectedProduto?.nome}</DialogTitle>
            <DialogDescription>
              Todas as entradas e saídas de stock deste produto
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!selectedProduto?.movimentos || selectedProduto.movimentos.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum movimento registado
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedProduto.movimentos.map((mov: any) => (
                    <TableRow key={mov.id}>
                      <TableCell>{formatarData(mov.data)}</TableCell>
                      <TableCell>
                        <Badge variant={mov.tipo === 'entrada' ? 'default' : mov.tipo === 'saida' ? 'destructive' : 'secondary'}>
                          {mov.tipo === 'entrada' ? 'Entrada' : mov.tipo === 'saida' ? 'Saída' : 'Ajuste'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                      </TableCell>
                      <TableCell className="text-right">
                        {mov.preco_custo ? `${formatarMZN(mov.preco_custo)} MZN` : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{mov.documento_referencia || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {mov.observacoes || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
