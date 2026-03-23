"use client"

import type React from "react"

import { useState } from "react"
import { Search, Plus, Eye, Trash2, UserCog, Mail, Calendar, Briefcase } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { logCriar, logEditar, logEliminar } from "@/lib/audit-log"
import { PermissionsEditor, type Permissoes, DEFAULT_PERMISSOES, ADMIN_PERMISSOES } from "./permissions-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Funcionario {
  id: string
  user_id: string | null
  nome: string
  email: string
  cargo: string | null
  nivel_acesso: "admin" | "funcionario"
  estado: "ativo" | "inativo" | "pendente"
  telefone: string | null
  telefone_alternativo: string | null
  data_nascimento: string | null
  data_admissao: string | null
  bi: string | null
  nuit: string | null
  salario_base: number | null
  inss: string | null
  endereco: string | null
  nivel_academico: string | null
  instituicao_ensino: string | null
  doenca_cronica: boolean | null
  descricao: string | null
  permissoes: Permissoes | null
  created_at: string
  updated_at: string
}

interface FuncionariosClientProps {
  funcionarios: Funcionario[]
  currentUserId: string
  empresaId: string
}

export function FuncionariosClient({ funcionarios: initialFuncionarios, currentUserId, empresaId }: FuncionariosClientProps) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(initialFuncionarios)
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const router = useRouter()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    cargo: "",
    telefone: "",
    telefone_alternativo: "",
    data_nascimento: "",
    data_admissao: "",
    bi: "",
    nuit: "",
    salario_base: "",
    inss: "",
    endereco: "",
    nivel_academico: "",
    instituicao_ensino: "",
    doenca_cronica: false,
    descricao: "",
    nivel_acesso: "funcionario" as "admin" | "funcionario",
    permissoes: DEFAULT_PERMISSOES,
  })

  const filteredFuncionarios = funcionarios.filter(
    (f) =>
      f.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cargo?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      
      // Verificar se o usuário está autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error("Você precisa estar autenticado para realizar esta ação")
      }

      const dataToSave = {
        nome: formData.nome,
        email: formData.email,
        cargo: formData.cargo || null,
        telefone: formData.telefone || null,
        telefone_alternativo: formData.telefone_alternativo || null,
        data_nascimento: formData.data_nascimento || null,
        data_admissao: formData.data_admissao || null,
        bi: formData.bi || null,
        nuit: formData.nuit || null,
        salario_base: formData.salario_base ? parseFloat(formData.salario_base) : null,
        inss: formData.inss || null,
        endereco: formData.endereco || null,
        nivel_academico: formData.nivel_academico || null,
        instituicao_ensino: formData.instituicao_ensino || null,
        doenca_cronica: formData.doenca_cronica,
        descricao: formData.descricao || null,
        nivel_acesso: formData.nivel_acesso,
        permissoes: formData.nivel_acesso === "admin" ? ADMIN_PERMISSOES : formData.permissoes,
        estado: "pendente",
        empresa_id: empresaId,
      }

      if (editingId) {
        // Atualizar funcionário existente
        const { data, error } = await supabase
          .from("funcionarios")
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq("id", editingId)
          .select()
          .single()

        if (error) throw error

        setFuncionarios(funcionarios.map((f) => (f.id === editingId ? data : f)))
      } else {
        // Criar novo funcionário
        const { data, error } = await supabase.from("funcionarios").insert(dataToSave).select().single()

        if (error) throw error

        setFuncionarios([data, ...funcionarios])
      }

      // Registar log de actividade
      if (editingId) {
        await logEditar("funcionarios", editingId, `Funcionario actualizado - ${formData.nome} (${formData.email})`)
      } else {
        await logCriar("funcionarios", "", `Funcionario criado - ${formData.nome} (${formData.email})`, { 
          nome: formData.nome, 
          email: formData.email, 
          cargo: formData.cargo, 
          nivelAcesso: formData.nivel_acesso 
        })
      }
  
  resetForm()
  setIsOpen(false)
  router.refresh()
    } catch (error: any) {
      alert(error.message || `Erro ao ${editingId ? "atualizar" : "criar"} funcionário`)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      cargo: "",
      telefone: "",
      telefone_alternativo: "",
      data_nascimento: "",
      data_admissao: "",
      bi: "",
      nuit: "",
      salario_base: "",
      inss: "",
      endereco: "",
      nivel_academico: "",
      instituicao_ensino: "",
      doenca_cronica: false,
      descricao: "",
      nivel_acesso: "funcionario",
      permissoes: DEFAULT_PERMISSOES,
    })
    setEditingId(null)
  }

  const handleEdit = (funcionario: Funcionario) => {
    setFormData({
      nome: funcionario.nome || "",
      email: funcionario.email || "",
      cargo: funcionario.cargo || "",
      telefone: funcionario.telefone || "",
      telefone_alternativo: funcionario.telefone_alternativo || "",
      data_nascimento: funcionario.data_nascimento || "",
      data_admissao: funcionario.data_admissao || "",
      bi: funcionario.bi || "",
      nuit: funcionario.nuit || "",
      salario_base: funcionario.salario_base?.toString() || "",
      inss: funcionario.inss || "",
      endereco: funcionario.endereco || "",
      nivel_academico: funcionario.nivel_academico || "",
      instituicao_ensino: funcionario.instituicao_ensino || "",
      doenca_cronica: funcionario.doenca_cronica || false,
      descricao: funcionario.descricao || "",
      nivel_acesso: funcionario.nivel_acesso,
      permissoes: funcionario.permissoes || DEFAULT_PERMISSOES,
    })
    setEditingId(funcionario.id)
    setIsOpen(true)
  }

  const handleChangeEstado = async (funcionarioId: string, novoEstado: "ativo" | "inativo" | "pendente") => {
    setLoadingStates((prev) => ({ ...prev, [funcionarioId]: true }))

    try {
      const supabase = createClient()
      
      // Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error("Você precisa estar autenticado para realizar esta ação")
      }

      const { error } = await supabase
        .from("funcionarios")
        .update({ estado: novoEstado, updated_at: new Date().toISOString() })
        .eq("id", funcionarioId)

      if (error) throw error

      setFuncionarios(funcionarios.map((f) => (f.id === funcionarioId ? { ...f, estado: novoEstado } : f)))

      // Feedback visual
      console.log(`[v0] Estado do funcionário ${funcionarioId} alterado para ${novoEstado}`)
    } catch (error: any) {
      console.error("[v0] Erro ao atualizar estado:", error)
      alert(error.message || "Erro ao atualizar estado")
    } finally {
      setLoadingStates((prev) => ({ ...prev, [funcionarioId]: false }))
    }
  }

  const handleDelete = async (funcionarioId: string, userId: string | null) => {
  const funcionarioToDelete = funcionarios.find(f => f.id === funcionarioId)
  if (!confirm("Tem certeza que deseja remover este funcionário? Esta ação irá desativar o acesso dele ao sistema."))
  return
  
  setLoadingStates((prev) => ({ ...prev, [`delete-${funcionarioId}`]: true }))

    try {
      const supabase = createClient()
      
      // Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error("Você precisa estar autenticado para realizar esta ação")
      }

      // Primeiro, marcar como inativo para bloquear acesso imediato
      await supabase
        .from("funcionarios")
        .update({ estado: "inativo", updated_at: new Date().toISOString() })
        .eq("id", funcionarioId)

      // Depois, eliminar o registo
      const { error } = await supabase.from("funcionarios").delete().eq("id", funcionarioId)

  if (error) throw error
  
  setFuncionarios(funcionarios.filter((f) => f.id !== funcionarioId))
  await logEliminar("funcionarios", funcionarioId, `Funcionario eliminado - ${funcionarioToDelete?.nome || "N/A"} (${funcionarioToDelete?.email || "N/A"})`, funcionarioToDelete)
  console.log(`[v0] Funcionário ${funcionarioId} removido com sucesso`)
    } catch (error: any) {
      console.error("[v0] Erro ao remover funcionário:", error)
      alert(error.message || "Erro ao remover funcionário")
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`delete-${funcionarioId}`]: false }))
    }
  }

  const handleChangeNivelAcesso = async (funcionarioId: string, novoNivel: "admin" | "funcionario") => {
    setLoadingStates((prev) => ({ ...prev, [`nivel-${funcionarioId}`]: true }))

    try {
      const supabase = createClient()
      
      // Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error("Você precisa estar autenticado para realizar esta ação")
      }

      const { error } = await supabase
        .from("funcionarios")
        .update({ nivel_acesso: novoNivel, updated_at: new Date().toISOString() })
        .eq("id", funcionarioId)

      if (error) throw error

      setFuncionarios(funcionarios.map((f) => (f.id === funcionarioId ? { ...f, nivel_acesso: novoNivel } : f)))
    } catch (error: any) {
      alert(error.message || "Erro ao atualizar nível de acesso")
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`nivel-${funcionarioId}`]: false }))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "ativo":
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Ativo</Badge>
      case "inativo":
        return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">Inativo</Badge>
      case "pendente":
        return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">Pendente</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar funcionários por nome, email ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="dados" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
                  <TabsTrigger value="permissoes">Permissoes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_admissao">Data de Admissão</Label>
                  <Input
                    id="data_admissao"
                    type="date"
                    value={formData.data_admissao}
                    onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bi">N° B.I</Label>
                  <Input
                    id="bi"
                    value={formData.bi}
                    onChange={(e) => setFormData({ ...formData, bi: e.target.value })}
                    placeholder="BI"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nuit">NUIT</Label>
                  <Input
                    id="nuit"
                    value={formData.nuit}
                    onChange={(e) => setFormData({ ...formData, nuit: e.target.value })}
                    placeholder="NUIT"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="Cargo ou função"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salario_base">Salário Base (MZN)</Label>
                  <Input
                    id="salario_base"
                    type="number"
                    step="0.01"
                    value={formData.salario_base}
                    onChange={(e) => setFormData({ ...formData, salario_base: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inss">N° INSS</Label>
                  <Input
                    id="inss"
                    value={formData.inss}
                    onChange={(e) => setFormData({ ...formData, inss: e.target.value })}
                    placeholder="Número do INSS"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Endereço completo"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Contacto Pessoal</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="+258..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone_alternativo">Contacto Alternativo</Label>
                  <Input
                    id="telefone_alternativo"
                    value={formData.telefone_alternativo}
                    onChange={(e) => setFormData({ ...formData, telefone_alternativo: e.target.value })}
                    placeholder="+258..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nivel_academico">Nível Académico</Label>
                  <Select
                    value={formData.nivel_academico}
                    onValueChange={(value) => setFormData({ ...formData, nivel_academico: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Básico">Básico</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Superior">Superior</SelectItem>
                      <SelectItem value="Pós-Graduação">Pós-Graduação</SelectItem>
                      <SelectItem value="Mestrado">Mestrado</SelectItem>
                      <SelectItem value="Doutoramento">Doutoramento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instituicao_ensino">Instituição de Ensino</Label>
                  <Input
                    id="instituicao_ensino"
                    value={formData.instituicao_ensino}
                    onChange={(e) => setFormData({ ...formData, instituicao_ensino: e.target.value })}
                    placeholder="Nome da instituição"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="doenca_cronica"
                  checked={formData.doenca_cronica}
                  onChange={(e) => setFormData({ ...formData, doenca_cronica: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="doenca_cronica" className="font-normal cursor-pointer">
                  Doença crónica
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Observações adicionais..."
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
                </TabsContent>
                
                <TabsContent value="permissoes" className="mt-4">
                  {formData.nivel_acesso === "admin" ? (
                    <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                      <p className="font-medium">Administradores tem acesso total a todos os modulos.</p>
                      <p className="text-sm mt-1">Para definir permissoes especificas, altere o nivel de acesso para &quot;Funcionario&quot;.</p>
                    </div>
                  ) : (
                    <PermissionsEditor
                      permissoes={formData.permissoes}
                      onChange={(newPermissoes) => setFormData({ ...formData, permissoes: newPermissoes })}
                    />
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsOpen(false)
                  resetForm()
                }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (editingId ? "A atualizar..." : "A criar...") : (editingId ? "Atualizar" : "Criar Funcionário")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Nível de Acesso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Data de Registo</TableHead>
              <TableHead className="text-right">Acções</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFuncionarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {funcionarios.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <UserCog className="h-8 w-8 opacity-50" />
                      <p>Nenhum funcionário registado.</p>
                      <p className="text-sm">Clique em &apos;Novo Funcionário&apos; para adicionar.</p>
                    </div>
                  ) : (
                    "Nenhum funcionário encontrado com os critérios de pesquisa."
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredFuncionarios.map((funcionario) => (
                <TableRow key={funcionario.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UserCog className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{funcionario.nome || "Sem nome"}</span>
                      {funcionario.user_id === currentUserId && (
                        <Badge variant="outline" className="text-xs">
                          Você
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {funcionario.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {funcionario.cargo ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        {funcionario.cargo}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={funcionario.nivel_acesso}
                      onValueChange={(value: "admin" | "funcionario") => handleChangeNivelAcesso(funcionario.id, value)}
                      disabled={loadingStates[`nivel-${funcionario.id}`] || funcionario.user_id === currentUserId}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue>
                          <Badge variant={funcionario.nivel_acesso === "admin" ? "default" : "secondary"}>
                            {funcionario.nivel_acesso === "admin" ? "Administrador" : "Funcionário"}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <span className="font-medium">Administrador</span>
                        </SelectItem>
                        <SelectItem value="funcionario">
                          <span>Funcionário</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={funcionario.estado}
                      onValueChange={(value: "ativo" | "inativo" | "pendente") =>
                        handleChangeEstado(funcionario.id, value)
                      }
                      disabled={loadingStates[funcionario.id] || funcionario.user_id === currentUserId}
                    >
                      <SelectTrigger className="w-[130px] h-8">{getEstadoBadge(funcionario.estado)}</SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">
                          <span className="text-green-600">Ativo</span>
                        </SelectItem>
                        <SelectItem value="inativo">
                          <span className="text-red-600">Inativo</span>
                        </SelectItem>
                        <SelectItem value="pendente">
                          <span className="text-yellow-600">Pendente</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(funcionario.created_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Ver e editar detalhes"
                      onClick={() => handleEdit(funcionario)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {funcionario.user_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remover funcionário"
                        onClick={() => handleDelete(funcionario.id, funcionario.user_id)}
                        disabled={loadingStates[`delete-${funcionario.id}`]}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="border-t px-4 py-3 text-sm text-muted-foreground">
          {filteredFuncionarios.length} funcionário(s)
        </div>
      </div>
    </div>
  )
}
