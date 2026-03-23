"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Save, Loader2, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ConfiguracoesClient() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [empresa, setEmpresa] = useState({
    id: "",
    nome: "",
    nuit: "",
    endereco: "",
    telefone: "",
    email: "",
    website: "",
    cidade: "",
    provincia: "",
    sectorActividade: "",
    ramoActividade: "",
  })

  useEffect(() => {
    const loadEmpresa = async () => {
      setIsLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Buscar empresa_id do funcionario logado
        const { data: funcionario } = await supabase
          .from("funcionarios")
          .select("empresa_id")
          .eq("user_id", user.id)
          .maybeSingle()

        let empresaData = null

        if (funcionario?.empresa_id) {
          const { data } = await supabase
            .from("empresas")
            .select("*")
            .eq("id", funcionario.empresa_id)
            .maybeSingle()
          empresaData = data
        }

        // Fallback: buscar empresa pelo user_id (dono da empresa)
        if (!empresaData) {
          const { data } = await supabase
            .from("empresas")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle()
          empresaData = data
        }

        if (empresaData) {
          setEmpresa({
            id: empresaData.id,
            nome: empresaData.nome || "",
            nuit: empresaData.nuit || "",
            endereco: empresaData.endereco || "",
            telefone: empresaData.telefone || "",
            email: empresaData.email || "",
            website: empresaData.website || "",
            cidade: empresaData.cidade || "",
            provincia: empresaData.provincia || "",
            sectorActividade: empresaData.sector_actividade || "",
            ramoActividade: empresaData.ramo_actividade || "",
          })
        }
      }
      setIsLoading(false)
    }

    loadEmpresa()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Não autenticado")

      const empresaData = {
        nome: empresa.nome,
        nuit: empresa.nuit || null,
        endereco: empresa.endereco || null,
        telefone: empresa.telefone || null,
        email: empresa.email || null,
        website: empresa.website || null,
        cidade: empresa.cidade || null,
        provincia: empresa.provincia || null,
        sector_actividade: empresa.sectorActividade || null,
        ramo_actividade: empresa.ramoActividade || null,
      }

      if (empresa.id) {
        const { error } = await supabase.from("empresas").update(empresaData).eq("id", empresa.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("empresas")
          .insert({
            user_id: user.id,
            ...empresaData,
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setEmpresa((prev) => ({ ...prev, id: data.id }))
        }
      }

      toast({
        title: "Dados guardados",
        description: "As informações da empresa foram actualizadas com sucesso.",
      })
    } catch (error) {
      console.error("[v0] Erro ao guardar:", error)
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível guardar as alterações. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Configurações" subtitle="Definições da empresa" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Configurações" subtitle="Definições da empresa" />

      <Tabs defaultValue="empresa" className="max-w-4xl">
        <TabsList>
          <TabsTrigger value="empresa">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="bancarios">Dados Bancários</TabsTrigger>
          <TabsTrigger value="conta">Conta</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Informações da Empresa</CardTitle>
                  <CardDescription>Actualize os dados da sua empresa</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Row 1: Nome da Empresa */}
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome da Empresa</Label>
                <Input
                  id="nome"
                  value={empresa.nome}
                  onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })}
                  placeholder="Nome da empresa"
                />
              </div>

              {/* Row 2: NUIT e Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nuit">NUIT</Label>
                  <Input
                    id="nuit"
                    value={empresa.nuit}
                    onChange={(e) => setEmpresa({ ...empresa, nuit: e.target.value })}
                    placeholder="Número de identificação fiscal"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={empresa.email}
                    onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                    placeholder="empresa@exemplo.com"
                  />
                </div>
              </div>

              {/* Row 3: Telefone e Website */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={empresa.telefone}
                    onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
                    placeholder="+258 84 000 0000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={empresa.website}
                    onChange={(e) => setEmpresa({ ...empresa, website: e.target.value })}
                    placeholder="www.empresa.co.mz"
                  />
                </div>
              </div>

              {/* Row 4: Endereço */}
              <div className="grid gap-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={empresa.endereco}
                  onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })}
                  placeholder="Endereço completo"
                />
              </div>

              {/* Row 5: Cidade e Província */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={empresa.cidade}
                    onChange={(e) => setEmpresa({ ...empresa, cidade: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provincia">Província</Label>
                  <Select 
                    value={empresa.provincia} 
                    onValueChange={(value) => setEmpresa({ ...empresa, provincia: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Maputo Cidade">Maputo Cidade</SelectItem>
                      <SelectItem value="Maputo">Maputo</SelectItem>
                      <SelectItem value="Gaza">Gaza</SelectItem>
                      <SelectItem value="Inhambane">Inhambane</SelectItem>
                      <SelectItem value="Sofala">Sofala</SelectItem>
                      <SelectItem value="Manica">Manica</SelectItem>
                      <SelectItem value="Tete">Tete</SelectItem>
                      <SelectItem value="Zambézia">Zambézia</SelectItem>
                      <SelectItem value="Nampula">Nampula</SelectItem>
                      <SelectItem value="Cabo Delgado">Cabo Delgado</SelectItem>
                      <SelectItem value="Niassa">Niassa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 6: Sector e Ramo de Actividade */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sectorActividade">Sector de Actividade</Label>
                  <Select 
                    value={empresa.sectorActividade} 
                    onValueChange={(value) => setEmpresa({ ...empresa, sectorActividade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Privado">Privado</SelectItem>
                      <SelectItem value="Público">Público</SelectItem>
                      <SelectItem value="ONG">ONG</SelectItem>
                      <SelectItem value="Misto">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ramoActividade">Ramo de Actividade</Label>
                  <Select 
                    value={empresa.ramoActividade} 
                    onValueChange={(value) => setEmpresa({ ...empresa, ramoActividade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comércio">Comércio</SelectItem>
                      <SelectItem value="Serviços">Serviços</SelectItem>
                      <SelectItem value="Indústria">Indústria</SelectItem>
                      <SelectItem value="Agricultura">Agricultura</SelectItem>
                      <SelectItem value="Construção">Construção</SelectItem>
                      <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                      <SelectItem value="Saúde">Saúde</SelectItem>
                      <SelectItem value="Educação">Educação</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving || !empresa.nome}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bancarios" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Bancários</CardTitle>
              <CardDescription>Configure as informações bancárias para pagamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em breve...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conta" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Conta</CardTitle>
              <CardDescription>Gerencie as configurações da sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em breve...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
