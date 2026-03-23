"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Mail,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Receipt,
  ScrollText,
} from "lucide-react"

interface Email {
  id: string
  destinatario: string
  cc: string | null
  assunto: string
  corpo: string | null
  tipo_documento: string | null
  documento_id: string | null
  documento_numero: string | null
  enviado_por: string | null
  enviado_por_nome: string | null
  enviado_por_email: string | null
  status: string
  erro_mensagem: string | null
  created_at: string
}

interface EmailsClientProps {
  emails: Email[]
}

export function EmailsClient({ emails: initialEmails }: EmailsClientProps) {
  const [emails] = useState<Email[]>(initialEmails)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("todos")
  const [filterStatus, setFilterStatus] = useState<string>("todos")
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTipoLabel = (tipo: string | null) => {
    switch (tipo) {
      case "carta":
        return "Carta"
      case "cotacao":
        return "Cotacao"
      case "factura":
        return "Factura"
      default:
        return "Outro"
    }
  }

  const getTipoIcon = (tipo: string | null) => {
    switch (tipo) {
      case "carta":
        return <ScrollText className="h-4 w-4" />
      case "cotacao":
        return <FileText className="h-4 w-4" />
      case "factura":
        return <Receipt className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enviado":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Enviado
          </Badge>
        )
      case "falhou":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Falhou
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        )
    }
  }

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.destinatario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (email.enviado_por_nome || "").toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTipo = filterTipo === "todos" || email.tipo_documento === filterTipo
    const matchesStatus = filterStatus === "todos" || email.status === filterStatus

    return matchesSearch && matchesTipo && matchesStatus
  })

  const stats = {
    total: emails.length,
    enviados: emails.filter((e) => e.status === "enviado").length,
    erros: emails.filter((e) => e.status === "falhou").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Emails Enviados</h1>
        <p className="text-muted-foreground">
          Historico de todos os emails enviados pelo sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enviados com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{stats.enviados}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Erros de Envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{stats.erros}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por destinatario, assunto ou remetente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="carta">Cartas</SelectItem>
                <SelectItem value="cotacao">Cotacoes</SelectItem>
                <SelectItem value="factura">Facturas</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="enviado">Enviados</SelectItem>
                <SelectItem value="falhou">Falhou</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Enviado Por</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum email encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(email.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTipoIcon(email.tipo_documento)}
                        <span>{getTipoLabel(email.tipo_documento)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {email.destinatario}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">
                      {email.assunto}
                    </TableCell>
                    <TableCell>
                      {email.enviado_por_nome ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{email.enviado_por_nome}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sistema</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(email.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEmail(email)
                          setIsViewOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Email Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Detalhes do Email
            </DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">{formatDate(selectedEmail.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedEmail.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getTipoIcon(selectedEmail.tipo_documento)}
                    <span>{getTipoLabel(selectedEmail.tipo_documento)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enviado Por</p>
                  <p className="font-medium">
                    {selectedEmail.enviado_por_nome || "Sistema"}
                  </p>
                  {selectedEmail.enviado_por_email && (
                    <p className="text-sm text-muted-foreground">
                      {selectedEmail.enviado_por_email}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Destinatario</p>
                <p className="font-medium">{selectedEmail.destinatario}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Assunto</p>
                <p className="font-medium">{selectedEmail.assunto}</p>
              </div>

              {selectedEmail.erro_mensagem && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-700">Mensagem de Erro</p>
                  <p className="text-sm text-red-600">{selectedEmail.erro_mensagem}</p>
                </div>
              )}

              {selectedEmail.corpo && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Conteudo do Email</p>
                  <div
                    className="border rounded-lg p-4 bg-white max-h-[400px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.corpo }}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
