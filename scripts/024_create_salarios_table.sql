-- Criar tabela de Folha de Salários (processamento mensal)
CREATE TABLE IF NOT EXISTS folha_salarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  
  -- Período de referência
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  
  -- Valores
  salario_base DECIMAL(15, 2) NOT NULL DEFAULT 0,
  subsidio_alimentacao DECIMAL(15, 2) DEFAULT 0,
  subsidio_transporte DECIMAL(15, 2) DEFAULT 0,
  horas_extras DECIMAL(15, 2) DEFAULT 0,
  bonus DECIMAL(15, 2) DEFAULT 0,
  outros_rendimentos DECIMAL(15, 2) DEFAULT 0,
  
  -- Deduções
  inss_trabalhador DECIMAL(15, 2) DEFAULT 0,
  irps DECIMAL(15, 2) DEFAULT 0,
  faltas_desconto DECIMAL(15, 2) DEFAULT 0,
  adiantamentos DECIMAL(15, 2) DEFAULT 0,
  outras_deducoes DECIMAL(15, 2) DEFAULT 0,
  
  -- Encargos patronais
  inss_patronal DECIMAL(15, 2) DEFAULT 0,
  
  -- Totais (calculados no frontend/backend)
  total_rendimentos DECIMAL(15, 2) DEFAULT 0,
  total_deducoes DECIMAL(15, 2) DEFAULT 0,
  salario_liquido DECIMAL(15, 2) DEFAULT 0,
  
  -- Estado do processamento
  estado TEXT DEFAULT 'pendente' CHECK (estado IN ('pendente', 'processado', 'pago', 'cancelado')),
  data_processamento TIMESTAMPTZ,
  data_pagamento TIMESTAMPTZ,
  
  -- Referência ao lançamento contábil
  lancamento_despesa_id UUID,
  lancamento_pagamento_id UUID,
  
  -- Metadados
  observacoes TEXT,
  criado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Garantir unicidade: um funcionário só pode ter uma folha por mês/ano
  UNIQUE(funcionario_id, mes, ano)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_folha_salarios_empresa ON folha_salarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarios_funcionario ON folha_salarios(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_folha_salarios_periodo ON folha_salarios(ano, mes);
CREATE INDEX IF NOT EXISTS idx_folha_salarios_estado ON folha_salarios(estado);

-- RLS Policies
ALTER TABLE folha_salarios ENABLE ROW LEVEL SECURITY;

-- Policy para todas as operações na tabela de salários
CREATE POLICY "folha_salarios_policy" ON folha_salarios FOR ALL USING (true) WITH CHECK (true);
