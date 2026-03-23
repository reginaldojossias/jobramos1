"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Truck, Pencil, Trash2, Save, Package, Eye } from "lucide-react"
import { toast } from "sonner"

interface Fornecedor {
  id: string
  nome: string
  nuit: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
}

interface Produto {
  id: string
  nome: string
  preco: number
  custo_unitario: number | null
}

interface FornecedorProduto {
  id: string
  fornecedor_id: string
  produto_id: string
  preco_custo: number
  ultimo_fornecimento: string | null
}

interface FornecedoresClientProps {
  fornecedores: Fornecedor[]
  produtos: Produto[]
  fornecedorProdutos: FornecedorProduto[]
  empresaId: string
}

const formatarMZN = (valor: number) => {
  return new Intl.NumberFormat("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor || 0)
}

const formatarData = (data: string | null) => {
  if (!data) return "-"
  return new Date(data).toLocaleDateString("pt-MZ")
}

export function FornecedoresClient({ 
  fornecedores: initialFornecedores, 
  produtos,
  fornecedorProdutos: initialFornecedorProdutos,
  empresaId 
}: FornecedoresClientProps) {
  const supabase = createClient()
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(initialFornecedores)
  const [fornecedorProdutos, setFornecedorProdutos] = useState<FornecedorProduto[]>(initialFornecedorProdutos)
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isCatalogoOpen, setIsCatalogoOpen] = useState(false)
  const [isAddProdutoOpen, setIsAddProdutoOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null)

  // Form states for fornecedor
  const [nome, setNome] = useState("")
  const [nuit, setNuit] = useState("")
  const [endereco, setEndereco] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [cidade, setCidade] = useState("")
  const [pais, setPais] = useState("Moçambique")
  const [detalhes, setDetalhes] = useState("")

  // Form states for adding product to catalog
  const [catalogoProdutoId, setCatalogoProdutoId] = useState("")
  const [catalogoPrecoCusto, setCatalogoPrecoCusto] = useState("")

  // Stats
  const totalFornecedores = fornecedores.length
  const fornecedoresComProdutos = new Set(fornecedorProdutos.map(fp => fp.fornecedor_id)).size
  const totalProdutosCatalogados = fornecedorProdutos.length

  const filteredFornecedores = fornecedores.filter(
    (f) =>
      f.nome.toLowerCase().includes(search.toLowerCase()) ||
      f.nuit?.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const resetForm = () => {
    setNome("")
    setNuit("")
    setEndereco("")
    setTelefone("")
    setEmail("")
    setCidade("")
    setPais("Moçambique")
    setDetalhes("")
    setEditingId(null)
  }

  const resetCatalogoForm = () => {
    setCatalogoProdutoId("")
    setCatalogoPrecoCusto("")
  }

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Não autenticado")
      return
    }

    setIsLoading(true)

    try {
      const fornecedorData = {
        nome,
        nuit: nuit || null,
        endereco: endereco || null,
        telefone: telefone || null,
        email: email || null,
      }

      if (editingId) {
        const { error } = await supabase.from("fornecedores").update(fornecedorData).eq("id", editingId)
        if (error) throw error
        setFornecedores(fornecedores.map(f => f.id === editingId ? { ...f, ...fornecedorData } : f))
        toast.success("Fornecedor actualizado com sucesso")
      } else {
        const { data: newFornecedor, error } = await supabase.from("fornecedores").insert({
          user_id: user.id,
          empresa_id: empresaId,
          ...fornecedorData,
        }).select().single()
        if (error) throw error
        setFornecedores([newFornecedor, ...fornecedores])
        toast.success("Fornecedor criado com sucesso")
      }

      setIsOpen(false)
      resetForm()
    } catch (error: any) {
      toast.error(`Erro ao ${editingId ? "actualizar" : "criar"} fornecedor: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingId(fornecedor.id)
    setNome(fornecedor.nome)
    setNuit(fornecedor.nuit || "")
    setEndereco(fornecedor.endereco || "")
    setTelefone(fornecedor.telefone || "")
    setEmail(fornecedor.email || "")
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar este fornecedor?")) return
    
    const { error } = await supabase.from("fornecedores").delete().eq("id", id)
    if (error) {
      toast.error("Erro ao eliminar fornecedor: " + error.message)
      return
    }
    setFornecedores(fornecedores.filter((f) => f.id !== id))
    setFornecedorProdutos(fornecedorProdutos.filter(fp => fp.fornecedor_id !== id))
    toast.success("Fornecedor eliminado")
  }

  const openCatalogo = (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor)
    setIsCatalogoOpen(true)
  }

  const handleAddProdutoCatalogo = async () => {
    if (!selectedFornecedor || !catalogoProdutoId || !catalogoPrecoCusto) {
      toast.error("Preencha todos os campos")
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.from("fornecedor_produtos").upsert({
        empresa_id: empresaId,
        fornecedor_id: selectedFornecedor.id,
        produto_id: catalogoProdutoId,
        preco_custo: Number.parseFloat(catalogoPrecoCusto),
      }, { onConflict: "fornecedor_id,produto_id" }).select().single()

      if (error) throw error

      // Update local state
      const existingIndex = fornecedorProdutos.findIndex(
        fp => fp.fornecedor_id === selectedFornecedor.id && fp.produto_id === catalogoProdutoId
      )
      if (existingIndex >= 0) {
        setFornecedorProdutos(fornecedorProdutos.map((fp, i) => i === existingIndex ? data : fp))
      } else {
        setFornecedorProdutos([...fornecedorProdutos, data])
      }

      setIsAddProdutoOpen(false)
      resetCatalogoForm()
      toast.success("Produto adicionado ao catálogo")
    } catch (error: any) {
      toast.error("Erro ao adicionar produto: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveProdutoCatalogo = async (fornecedorProdutoId: string) => {
    if (!confirm("Remover este produto do catálogo do fornecedor?")) return

    const { error } = await supabase.from("fornecedor_produtos").delete().eq("id", fornecedorProdutoId)
    if (error) {
      toast.error("Erro ao remover: " + error.message)
      return
    }
    setFornecedorProdutos(fornecedorProdutos.filter(fp => fp.id !== fornecedorProdutoId))
    toast.success("Produto removido do catálogo")
  }

  const getProdutosDoFornecedor = (fornecedorId: string) => {
    return fornecedorProdutos
      .filter(fp => fp.fornecedor_id === fornecedorId)
      .map(fp => {
        const produto = produtos.find(p => p.id === fp.produto_id)
        return {
          ...fp,
          produto_nome: produto?.nome || "Produto não encontrado",
          preco_venda: produto?.preco || 0,
        }
      })
  }

  const getProdutosDisponiveis = () => {
    if (!selectedFornecedor) return produtos
    const produtosJaCatalogados = fornecedorProdutos
      .filter(fp => fp.fornecedor_id === selectedFornecedor.id)
      .map(fp => fp.produto_id)
    return produtos.filter(p => !produtosJaCatalogados.includes(p.id))
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Fornecedores</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFornecedores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Com Catálogo</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fornecedoresComProdutos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produtos Catalogados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProdutosCatalogados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar fornecedores por nome, NUIT ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome do Fornecedor *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome ou razão social"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="detalhes">Detalhes</Label>
                <Textarea
                  id="detalhes"
                  value={detalhes}
                  onChange={(e) => setDetalhes(e.target.value)}
                  placeholder="Informações adicionais..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pais">País</Label>
                  <Select value={pais} onValueChange={setPais}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Moçambique">Moçambique</SelectItem>
                      <SelectItem value="Portugal">Portugal</SelectItem>
                      <SelectItem value="África do Sul">África do Sul</SelectItem>
                      <SelectItem value="Brasil">Brasil</SelectItem>
                      <SelectItem value="Angola">Angola</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nuit">NUIT</Label>
                  <Input
                    id="nuit"
                    value={nuit}
                    onChange={(e) => setNuit(e.target.value)}
                    placeholder="Número de identificação tributária"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="telefone">Contactos</Label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="+258..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
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

      {/* Fornecedores Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>NUIT</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead>Acções</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFornecedores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum fornecedor registado. Clique em &quot;Novo Fornecedor&quot; para começar.
                </TableCell>
              </TableRow>
            ) : (
              filteredFornecedores.map((fornecedor) => {
                const numProdutos = fornecedorProdutos.filter(fp => fp.fornecedor_id === fornecedor.id).length
                return (
                  <TableRow key={fornecedor.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{fornecedor.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>{fornecedor.nuit || "-"}</TableCell>
                    <TableCell>{fornecedor.telefone || "-"}</TableCell>
                    <TableCell>{fornecedor.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={numProdutos > 0 ? "default" : "secondary"}>
                        {numProdutos} produto{numProdutos !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openCatalogo(fornecedor)} title="Ver catálogo de produtos">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(fornecedor)} title="Editar fornecedor">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(fornecedor.id)} title="Eliminar fornecedor">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {filteredFornecedores.length > 0 && (
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            {filteredFornecedores.length} fornecedor{filteredFornecedores.length !== 1 ? "es" : ""} registado{filteredFornecedores.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Catalogo Dialog */}
      <Dialog open={isCatalogoOpen} onOpenChange={setIsCatalogoOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Catálogo de Produtos - {selectedFornecedor?.nome}</DialogTitle>
            <DialogDescription>
              Lista de produtos fornecidos por este fornecedor com os respectivos preços de custo
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setIsAddProdutoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Produto
            </Button>
          </div>

          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Preço Custo</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead>Último Fornec.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedFornecedor && getProdutosDoFornecedor(selectedFornecedor.id).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum produto catalogado. Clique em &quot;Adicionar Produto&quot; para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedFornecedor && getProdutosDoFornecedor(selectedFornecedor.id).map((fp) => {
                    const margem = fp.preco_venda && fp.preco_custo 
                      ? ((fp.preco_venda - fp.preco_custo) / fp.preco_custo * 100)
                      : null
                    return (
                      <TableRow key={fp.id}>
                        <TableCell className="font-medium">{fp.produto_nome}</TableCell>
                        <TableCell className="text-right">{formatarMZN(fp.preco_custo)} MZN</TableCell>
                        <TableCell className="text-right">{formatarMZN(fp.preco_venda)} MZN</TableCell>
                        <TableCell className="text-right">
                          {margem !== null ? (
                            <Badge variant={margem > 20 ? "default" : margem > 0 ? "secondary" : "destructive"}>
                              {margem.toFixed(1)}%
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{formatarData(fp.ultimo_fornecimento)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveProdutoCatalogo(fp.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Product to Catalog Dialog */}
      <Dialog open={isAddProdutoOpen} onOpenChange={(open) => {
        setIsAddProdutoOpen(open)
        if (!open) resetCatalogoForm()
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Adicionar Produto ao Catálogo</DialogTitle>
            <DialogDescription>
              Associe um produto a este fornecedor com o preço de custo que ele cobra.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Produto *</Label>
              <Select value={catalogoProdutoId} onValueChange={setCatalogoProdutoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione o produto..." />
                </SelectTrigger>
                <SelectContent>
                  {getProdutosDisponiveis().map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Preço de Custo (MZN) *</Label>
              <Input
                type="number"
                value={catalogoPrecoCusto}
                onChange={(e) => setCatalogoPrecoCusto(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                O preço que este fornecedor cobra por este produto
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsAddProdutoOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddProdutoCatalogo} disabled={isLoading || !catalogoProdutoId || !catalogoPrecoCusto}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "A guardar..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
