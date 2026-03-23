"use client"

import { useState } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Users, Pencil, Trash2, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { logCriar, logEditar, logEliminar } from "@/lib/audit-log"

interface Cliente {
  id: string
  nome: string
  nuit: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
}

interface ClientesClientProps {
  clientes: Cliente[]
}

const fetcher = async (key: string) => {
  const supabase = createClient()
  const { data } = await supabase.from("clientes").select("*").order("nome")
  return data || []
}

export function ClientesClient({ clientes: initialClientes }: ClientesClientProps) {
  const { data: clientes = initialClientes, mutate } = useSWR<Cliente[]>("clientes", fetcher, {
    fallbackData: initialClientes,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const router = useRouter()

  const [nome, setNome] = useState("")
  const [nuit, setNuit] = useState("")
  const [endereco, setEndereco] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [cidade, setCidade] = useState("")
  const [pais, setPais] = useState("Moçambique")
  const [ramoActividade, setRamoActividade] = useState("")
  const [sectorActividade, setSectorActividade] = useState("")
  const [detalhes, setDetalhes] = useState("")

  const filteredClientes = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.nuit?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const resetForm = () => {
    setNome("")
    setNuit("")
    setEndereco("")
    setTelefone("")
    setEmail("")
    setCidade("")
    setPais("Moçambique")
    setRamoActividade("")
    setSectorActividade("")
    setDetalhes("")
    setEditingId(null)
  }

  const handleSubmit = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Não autenticado")

      const clienteData = {
        nome,
        nuit: nuit || null,
        endereco: endereco || null,
        telefone: telefone || null,
        email: email || null,
      }

      if (editingId) {
        const { error } = await supabase.from("clientes").update(clienteData).eq("id", editingId)
        if (error) throw error
        await logEditar("clientes", editingId, `Cliente actualizado - ${nome}`)
      } else {
        const { data, error } = await supabase.from("clientes").insert({
          user_id: user.id,
          ...clienteData,
        }).select().single()
        if (error) throw error
        await logCriar("clientes", data?.id || "", `Cliente criado - ${nome}`, { nome, nuit, telefone, email })
      }
  
      setIsOpen(false)
      resetForm()
      mutate()
    } catch (error) {
      console.error(`Erro ao ${editingId ? "atualizar" : "criar"} cliente:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (cliente: Cliente) => {
    setEditingId(cliente.id)
    setNome(cliente.nome)
    setNuit(cliente.nuit || "")
    setEndereco(cliente.endereco || "")
    setTelefone(cliente.telefone || "")
    setEmail(cliente.email || "")
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
  const clienteToDelete = clientes.find(c => c.id === id)
  const supabase = createClient()
  await supabase.from("clientes").delete().eq("id", id)
  await logEliminar("clientes", id, `Cliente eliminado - ${clienteToDelete?.nome || "N/A"}`, clienteToDelete)
  mutate()
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar clientes por nome, NUIT ou email..."
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
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Row 1: Nome e NUIT */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Input 
                    id="nome" 
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    placeholder="Nome completo ou razão social" 
                  />
                </div>
                <div className="grid gap-2">
                  <Input
                    id="nuit"
                    value={nuit}
                    onChange={(e) => setNuit(e.target.value)}
                    placeholder="Número de identificação tributária"
                  />
                </div>
              </div>

              {/* Row 2: Ramo e Sector de Actividade */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ramoActividade">Ramo de Actividade</Label>
                  <Select value={ramoActividade} onValueChange={setRamoActividade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comercio">Comércio</SelectItem>
                      <SelectItem value="servicos">Serviços</SelectItem>
                      <SelectItem value="industria">Indústria</SelectItem>
                      <SelectItem value="agricultura">Agricultura</SelectItem>
                      <SelectItem value="construcao">Construção</SelectItem>
                      <SelectItem value="tecnologia">Tecnologia</SelectItem>
                      <SelectItem value="saude">Saúde</SelectItem>
                      <SelectItem value="educacao">Educação</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sectorActividade">Sector de Actividade</Label>
                  <Select value={sectorActividade} onValueChange={setSectorActividade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="privado">Privado</SelectItem>
                      <SelectItem value="publico">Público</SelectItem>
                      <SelectItem value="ong">ONG</SelectItem>
                      <SelectItem value="misto">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: País e Cidade */}
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
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
              </div>

              {/* Row 4: Endereço */}
              <div className="grid gap-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Endereço completo"
                />
              </div>

              {/* Row 5: Contactos e Email */}
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

              {/* Row 6: Detalhes */}
              <div className="grid gap-2">
                <Label htmlFor="detalhes">Detalhes</Label>
                <Textarea
                  id="detalhes"
                  value={detalhes}
                  onChange={(e) => setDetalhes(e.target.value)}
                  placeholder="Informações adicionais..."
                  rows={3}
                />
              </div>

              {/* Buttons */}
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

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>NUIT</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente registado. Clique em &quot;Novo Cliente&quot; para começar.
                </TableCell>
              </TableRow>
            ) : (
              filteredClientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {cliente.nome}
                    </div>
                  </TableCell>
                  <TableCell>{cliente.nuit || "-"}</TableCell>
                  <TableCell>{cliente.telefone || "-"}</TableCell>
                  <TableCell>{cliente.email || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(cliente)} title="Editar cliente">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cliente.id)} title="Eliminar cliente">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filteredClientes.length > 0 && (
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            {filteredClientes.length} cliente{filteredClientes.length !== 1 ? "s" : ""} registado
            {filteredClientes.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  )
}
