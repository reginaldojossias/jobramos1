-- Tabela de movimentos de stock (entradas, saídas, ajustes)
CREATE TABLE IF NOT EXISTS movimentos_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade INTEGER NOT NULL,
  preco_custo NUMERIC(15,2),
  documento_tipo TEXT, -- 'FT', 'NC', 'compra', 'ajuste'
  documento_id UUID,
  documento_referencia TEXT, -- ex: nº factura do fornecedor
  observacoes TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Tabela de produtos fornecidos por cada fornecedor (catálogo)
CREATE TABLE IF NOT EXISTS fornecedor_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  preco_custo NUMERIC(15,2) NOT NULL,
  ultimo_fornecimento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fornecedor_id, produto_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentos_stock_empresa ON movimentos_stock(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentos_stock_produto ON movimentos_stock(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentos_stock_fornecedor ON movimentos_stock(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_movimentos_stock_data ON movimentos_stock(data);
CREATE INDEX IF NOT EXISTS idx_fornecedor_produtos_empresa ON fornecedor_produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedor_produtos_fornecedor ON fornecedor_produtos(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_fornecedor_produtos_produto ON fornecedor_produtos(produto_id);

-- RLS para movimentos_stock
ALTER TABLE movimentos_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS movimentos_stock_policy ON movimentos_stock;
CREATE POLICY movimentos_stock_policy ON movimentos_stock
  FOR ALL
  USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
      UNION
      SELECT empresa_id FROM funcionarios WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND estado = 'Activo'
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
      UNION
      SELECT empresa_id FROM funcionarios WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND estado = 'Activo'
    )
  );

-- RLS para fornecedor_produtos
ALTER TABLE fornecedor_produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fornecedor_produtos_policy ON fornecedor_produtos;
CREATE POLICY fornecedor_produtos_policy ON fornecedor_produtos
  FOR ALL
  USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
      UNION
      SELECT empresa_id FROM funcionarios WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND estado = 'Activo'
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
      UNION
      SELECT empresa_id FROM funcionarios WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND estado = 'Activo'
    )
  );
