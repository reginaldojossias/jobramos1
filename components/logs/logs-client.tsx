"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Activity, 
  LogIn, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileText, 
  XCircle,
  Mail,
  CreditCard,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AuditLog {
  id: string
  created_at: string
  tabela: string
  acao: string
  user_nome: string
  user_email: string
  descricao: string
  registro_id: string | null
  dados_anteriores: Record<string, any> | null
  dados_novos: Record<string, any> | null
  campos_alterados: string[] | null
}

interface Funcionario {
  id: string
  nome: string
  email: string
}

interface LogsClientProps {
  logs: AuditLog[]
  funcionarios: Funcionario[]
}

const acaoIcons: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  criar: Plus,
  editar: Edit,
  eliminar: Trash2,
  visualizar: Eye,
  emitir: FileText,
  anular: XCircle,
  pagar: CreditCard,
  enviar_email: Mail,
}

const acaoColors: Record<string, string> = {
  login: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  logout: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  criar: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  editar: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  eliminar: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  visualizar: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  emitir: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  anular: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  pagar: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  enviar_email: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
}

const tabelaLabels: Record<string, string> = {
  auth: "Autenticação",
  facturas: "Facturas",
  recibos: "Recibos",
  despesas: "Despesas",
  cotacoes: "Cotações",
  clientes: "Clientes",
  fornecedores: "Fornecedores",
  produtos: "Produtos",
  funcionarios: "Funcionários",
  empresas: "Empresa",
  cartas: "Cartas",
  emails_enviados: "Emails",
  contas_bancarias: "Contas Bancárias",
  movimentos_bancarios: "Movimentos",
  notas_credito: "Notas de Crédito",
  folha_salarios: "Salários",
}

export function LogsClient({ logs, funcionarios }: LogsClientProps) {
  const [search, setSearch] = useState("")
  const [filtroAcao, setFiltroAcao] = useState<string>("todas")
  const [filtroTabela, setFiltroTabela] = useState<string>("todas")
  const [filtroUtilizador, setFiltroUtilizador] = useState<string>("todos")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  // Get unique tables and actions from logs
  const tabelas = useMemo(() => {
    const unique = [...new Set(logs.map(l => l.tabela))]
    return unique.sort()
  }, [logs])

  const acoes = useMemo(() => {
    const unique = [...new Set(logs.map(l => l.acao))]
    return unique.sort()
  }, [logs])

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = search === "" || 
        log.descricao.toLowerCase().includes(search.toLowerCase()) ||
        log.user_nome?.toLowerCase().includes(search.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(search.toLowerCase())
      
      const matchesAcao = filtroAcao === "todas" || log.acao === filtroAcao
      const matchesTabela = filtroTabela === "todas" || log.tabela === filtroTabela
      const matchesUtilizador = filtroUtilizador === "todos" || log.user_email === filtroUtilizador

      return matchesSearch && matchesAcao && matchesTabela && matchesUtilizador
    })
  }, [logs, search, filtroAcao, filtroTabela, filtroUtilizador])

  // Stats
  const stats = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    
    const logsHoje = logs.filter(l => new Date(l.created_at) >= hoje)
    const logins = logs.filter(l => l.acao === "login").length
    const alteracoes = logs.filter(l => ["criar", "editar", "eliminar"].includes(l.acao)).length
    
    return {
      total: logs.length,
      hoje: logsHoje.length,
      logins,
      alteracoes
    }
  }, [logs])

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedLogs(newExpanded)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actividade Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.hoje}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Logins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.logins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alteracoes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.alteracoes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por descricao, utilizador..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filtroAcao} onValueChange={setFiltroAcao}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Accao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas Accoes</SelectItem>
                {acoes.map(acao => (
                  <SelectItem key={acao} value={acao}>{acao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroTabela} onValueChange={setFiltroTabela}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Modulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos Modulos</SelectItem>
                {tabelas.map(tabela => (
                  <SelectItem key={tabela} value={tabela}>{tabelaLabels[tabela] || tabela}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroUtilizador} onValueChange={setFiltroUtilizador}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Utilizador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Utilizadores</SelectItem>
                {funcionarios.map(f => (
                  <SelectItem key={f.id} value={f.email}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historico de Actividade
            <Badge variant="secondary" className="ml-2">{filteredLogs.length} registos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum log encontrado com os filtros seleccionados
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = acaoIcons[log.acao] || Activity
                  const colorClass = acaoColors[log.acao] || "bg-gray-100 text-gray-800"
                  const isExpanded = expandedLogs.has(log.id)
                  const hasDetails = log.dados_anteriores || log.dados_novos || log.campos_alterados

                  return (
                    <div 
                      key={log.id} 
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{log.user_nome || log.user_email}</span>
                            <Badge variant="outline" className="text-xs">
                              {tabelaLabels[log.tabela] || log.tabela}
                            </Badge>
                            <Badge className={`text-xs ${colorClass}`}>
                              {log.acao}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{log.descricao}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.user_email}
                            </span>
                          </div>
                          
                          {/* Expandable details */}
                          {hasDetails && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleExpand(log.id)}
                                className="text-xs text-primary flex items-center gap-1 hover:underline"
                              >
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                              </button>
                              
                              {isExpanded && (
                                <div className="mt-3 border rounded-lg overflow-hidden">
                                  {log.campos_alterados && log.campos_alterados.length > 0 && (
                                    <div className="px-4 py-3 bg-muted/30 border-b">
                                      <span className="text-xs font-medium text-muted-foreground">Campos alterados</span>
                                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {log.campos_alterados.map((campo, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs font-normal">
                                            {campo}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                                    {log.dados_anteriores && Object.keys(log.dados_anteriores).length > 0 && (
                                      <div className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">Dados Anteriores</span>
                                        </div>
                                        <div className="space-y-2">
                                          {Object.entries(log.dados_anteriores).map(([key, value]) => (
                                            <div key={key} className="flex flex-col">
                                              <span className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                                              <span className="text-sm font-medium truncate">
                                                {typeof value === "object" ? JSON.stringify(value) : String(value ?? "-")}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {log.dados_novos && Object.keys(log.dados_novos).length > 0 && (
                                      <div className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">Dados Novos</span>
                                        </div>
                                        <div className="space-y-2">
                                          {Object.entries(log.dados_novos).map(([key, value]) => (
                                            <div key={key} className="flex flex-col">
                                              <span className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                                              <span className="text-sm font-medium truncate">
                                                {typeof value === "object" ? JSON.stringify(value) : String(value ?? "-")}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
