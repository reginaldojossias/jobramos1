export interface Empresa {
  id: string
  nome: string
  nuit: string
  endereco: string
  telefone: string
  email: string
  logo_url?: string
}

export interface Cliente {
  id: string
  nome: string
  nuit?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
}

export interface Produto {
  id: string
  nome: string
  descricao?: string | null
  preco: number
  stock: number
  unidade: string
}

export interface Carta {
  id: string
  entidade_destinataria: string
  numero_contrato: string
  data_contrato: string | null
  valor_total: number
  prazo_dias: number
  local: string
  data_carta: string
  nome_advogado: string
  cp_advogado: string
  created_at: string
}
