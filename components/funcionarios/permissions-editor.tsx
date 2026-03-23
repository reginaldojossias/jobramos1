"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  FileText, 
  Receipt, 
  Wallet, 
  FileSpreadsheet, 
  Users, 
  Package, 
  Truck, 
  Mail, 
  UserCog, 
  Banknote, 
  Calculator, 
  BarChart3, 
  Activity, 
  Settings,
  EyeOff,
  Eye,
  Pencil
} from "lucide-react"

export type PermissionLevel = "sem_acesso" | "visualizar" | "editar"

export interface Permissoes {
  facturas: PermissionLevel
  recibos: PermissionLevel
  despesas: PermissionLevel
  cotacoes: PermissionLevel
  clientes: PermissionLevel
  produtos: PermissionLevel
  fornecedores: PermissionLevel
  cartas: PermissionLevel
  funcionarios: PermissionLevel
  salarios: PermissionLevel
  conciliacao: PermissionLevel
  relatorios: PermissionLevel
  logs: PermissionLevel
  configuracoes: PermissionLevel
}

export const DEFAULT_PERMISSOES: Permissoes = {
  facturas: "editar",
  recibos: "editar",
  despesas: "editar",
  cotacoes: "editar",
  clientes: "editar",
  produtos: "editar",
  fornecedores: "editar",
  cartas: "editar",
  funcionarios: "sem_acesso",
  salarios: "sem_acesso",
  conciliacao: "sem_acesso",
  relatorios: "visualizar",
  logs: "sem_acesso",
  configuracoes: "sem_acesso",
}

export const ADMIN_PERMISSOES: Permissoes = {
  facturas: "editar",
  recibos: "editar",
  despesas: "editar",
  cotacoes: "editar",
  clientes: "editar",
  produtos: "editar",
  fornecedores: "editar",
  cartas: "editar",
  funcionarios: "editar",
  salarios: "editar",
  conciliacao: "editar",
  relatorios: "editar",
  logs: "editar",
  configuracoes: "editar",
}

const MODULES = [
  { key: "facturas", label: "Facturas", icon: FileText, category: "Documentos" },
  { key: "recibos", label: "Recibos", icon: Receipt, category: "Documentos" },
  { key: "despesas", label: "Despesas", icon: Wallet, category: "Documentos" },
  { key: "cotacoes", label: "Cotacoes", icon: FileSpreadsheet, category: "Documentos" },
  { key: "cartas", label: "Cartas", icon: Mail, category: "Documentos" },
  { key: "clientes", label: "Clientes", icon: Users, category: "Cadastros" },
  { key: "produtos", label: "Produtos", icon: Package, category: "Cadastros" },
  { key: "fornecedores", label: "Fornecedores", icon: Truck, category: "Cadastros" },
  { key: "funcionarios", label: "Funcionarios", icon: UserCog, category: "Administracao" },
  { key: "salarios", label: "Salarios", icon: Banknote, category: "Administracao" },
  { key: "conciliacao", label: "Conciliacao", icon: Calculator, category: "Administracao" },
  { key: "relatorios", label: "Relatorios", icon: BarChart3, category: "Administracao" },
  { key: "logs", label: "Logs Actividade", icon: Activity, category: "Administracao" },
  { key: "configuracoes", label: "Configuracoes", icon: Settings, category: "Administracao" },
] as const

interface PermissionsEditorProps {
  permissoes: Permissoes
  onChange: (permissoes: Permissoes) => void
  disabled?: boolean
}

export function PermissionsEditor({ permissoes, onChange, disabled }: PermissionsEditorProps) {
  const handlePermissionChange = (moduleKey: keyof Permissoes, value: PermissionLevel) => {
    onChange({
      ...permissoes,
      [moduleKey]: value,
    })
  }

  const categories = [...new Set(MODULES.map(m => m.category))]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Permissoes por Modulo</CardTitle>
        <CardDescription>
          Defina o nivel de acesso para cada modulo do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg text-xs">
          <div className="flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5 text-red-500" />
            <span>Sem Acesso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-amber-500" />
            <span>Apenas Visualizar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5 text-green-500" />
            <span>Visualizar e Editar</span>
          </div>
        </div>

        {categories.map(category => (
          <div key={category} className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">{category}</h4>
            <div className="grid gap-2">
              {MODULES.filter(m => m.category === category).map(module => {
                const Icon = module.icon
                const currentValue = permissoes[module.key as keyof Permissoes] || "sem_acesso"
                
                return (
                  <div 
                    key={module.key} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-normal cursor-pointer">{module.label}</Label>
                    </div>
                    
                    <RadioGroup
                      value={currentValue}
                      onValueChange={(value) => handlePermissionChange(module.key as keyof Permissoes, value as PermissionLevel)}
                      className="flex gap-1"
                      disabled={disabled}
                    >
                      <div className="flex items-center">
                        <RadioGroupItem 
                          value="sem_acesso" 
                          id={`${module.key}-sem`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`${module.key}-sem`}
                          className={`flex items-center justify-center w-8 h-8 rounded-md border cursor-pointer transition-colors
                            ${currentValue === "sem_acesso" 
                              ? "bg-red-500/10 border-red-500 text-red-600" 
                              : "hover:bg-muted"
                            }
                            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                          `}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Label>
                      </div>
                      
                      <div className="flex items-center">
                        <RadioGroupItem 
                          value="visualizar" 
                          id={`${module.key}-ver`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`${module.key}-ver`}
                          className={`flex items-center justify-center w-8 h-8 rounded-md border cursor-pointer transition-colors
                            ${currentValue === "visualizar" 
                              ? "bg-amber-500/10 border-amber-500 text-amber-600" 
                              : "hover:bg-muted"
                            }
                            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                          `}
                        >
                          <Eye className="h-4 w-4" />
                        </Label>
                      </div>
                      
                      <div className="flex items-center">
                        <RadioGroupItem 
                          value="editar" 
                          id={`${module.key}-editar`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`${module.key}-editar`}
                          className={`flex items-center justify-center w-8 h-8 rounded-md border cursor-pointer transition-colors
                            ${currentValue === "editar" 
                              ? "bg-green-500/10 border-green-500 text-green-600" 
                              : "hover:bg-muted"
                            }
                            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                          `}
                        >
                          <Pencil className="h-4 w-4" />
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
