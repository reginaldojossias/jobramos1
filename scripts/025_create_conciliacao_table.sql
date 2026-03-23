-- Criar tabela de Contas Bancárias
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  nome TEXT NOT NULL, -- Ex: "Conta Principal BCI"
  banco TEXT NOT NULL,
  numero_conta TEXT NOT NULL,
  iban TEXT,
  swift TEXT,
  moeda TEXT DEFAULT 'MZN',
  saldo_inicial DECIMAL(15, 2) DEFAULT 0,
  saldo_atual DECIMAL(15, 2) DEFAULT 0,
  
  estado TEXT DEFAULT 'ativo' CHECK (estado IN ('ativo', 'inativo')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(empresa_id, numero_conta)
);

-- Criar tabela de Movimentos Bancários (extrato)
CREATE TABLE IF NOT EXISTS movimentos_bancarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE CASCADE,
  
  data_movimento DATE NOT NULL,
  descricao TEXT NOT NULL,
  referencia TEXT, -- Referência do banco
  
  tipo TEXT NOT NULL CHECK (tipo IN ('debito', 'credito')),
  valor DECIMAL(15, 2) NOT NULL,
  saldo_apos DECIMAL(15, 2),
  
  -- Conciliação
  conciliado BOOLEAN DEFAULT FALSE,
  data_conciliacao TIMESTAMPTZ,
  conciliado_por UUID,
  
  -- Referência ao documento relacionado
  documento_tipo TEXT, -- 'factura', 'recibo', 'despesa', 'salario'
  documento_id UUID,
  
  -- Importação de extrato
  importado_de TEXT, -- 'manual', 'csv', 'ofx'
  linha_extrato INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de Fecho Mensal
CREATE TABLE IF NOT EXISTS fechos_mensais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  
  -- Estado do fecho
  estado TEXT DEFAULT 'aberto' CHECK (estado IN ('aberto', 'em_revisao', 'fechado')),
  
  -- Resumo financeiro no momento do fecho
  total_facturas DECIMAL(15, 2) DEFAULT 0,
  total_recibos DECIMAL(15, 2) DEFAULT 0,
  total_despesas DECIMAL(15, 2) DEFAULT 0,
  total_salarios DECIMAL(15, 2) DEFAULT 0,
  
  -- IVA
  iva_a_entregar DECIMAL(15, 2) DEFAULT 0, -- IVA cobrado - IVA suportado
  iva_cobrado DECIMAL(15, 2) DEFAULT 0,
  iva_suportado DECIMAL(15, 2) DEFAULT 0,
  
  -- Resultado
  resultado_liquido DECIMAL(15, 2) DEFAULT 0,
  
  -- Conciliação bancária
  saldo_bancario_extrato DECIMAL(15, 2),
  saldo_bancario_sistema DECIMAL(15, 2),
  diferenca_conciliacao DECIMAL(15, 2),
  
  -- Datas
  data_inicio_revisao TIMESTAMPTZ,
  data_fecho TIMESTAMPTZ,
  
  -- Quem fechou
  fechado_por UUID,
  
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(empresa_id, mes, ano)
);

-- Criar tabela de Lançamentos Contábeis (para integração contabilística)
CREATE TABLE IF NOT EXISTS lancamentos_contabeis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  data_lancamento DATE NOT NULL,
  descricao TEXT NOT NULL,
  
  -- Contas (seguindo o plano de contas)
  conta_debito TEXT NOT NULL,
  conta_credito TEXT NOT NULL,
  valor DECIMAL(15, 2) NOT NULL,
  
  -- Referência ao documento de origem
  documento_tipo TEXT, -- 'factura', 'recibo', 'despesa', 'salario'
  documento_id UUID,
  
  -- Período
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  
  -- Estado
  estado TEXT DEFAULT 'ativo' CHECK (estado IN ('ativo', 'anulado')),
  bloqueado BOOLEAN DEFAULT FALSE, -- Bloqueado após fecho mensal
  
  criado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_empresa ON contas_bancarias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentos_empresa ON movimentos_bancarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentos_conta ON movimentos_bancarios(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_movimentos_data ON movimentos_bancarios(data_movimento);
CREATE INDEX IF NOT EXISTS idx_movimentos_conciliado ON movimentos_bancarios(conciliado);
CREATE INDEX IF NOT EXISTS idx_fechos_empresa ON fechos_mensais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fechos_periodo ON fechos_mensais(ano, mes);
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa ON lancamentos_contabeis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_periodo ON lancamentos_contabeis(ano, mes);

-- RLS Policies
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contas_bancarias_policy" ON contas_bancarias FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE movimentos_bancarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movimentos_bancarios_policy" ON movimentos_bancarios FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE fechos_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fechos_mensais_policy" ON fechos_mensais FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE lancamentos_contabeis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lancamentos_contabeis_policy" ON lancamentos_contabeis FOR ALL USING (true) WITH CHECK (true);
