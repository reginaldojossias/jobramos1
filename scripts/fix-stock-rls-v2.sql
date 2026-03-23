-- Drop existing policies and recreate with proper access

-- movimentos_stock policies
DROP POLICY IF EXISTS "movimentos_stock_policy" ON movimentos_stock;
DROP POLICY IF EXISTS "movimentos_stock_access" ON movimentos_stock;

CREATE POLICY "movimentos_stock_access" ON movimentos_stock
FOR ALL USING (
  empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
    UNION
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'Activo'
  )
);

-- fornecedor_produtos policies
DROP POLICY IF EXISTS "fornecedor_produtos_policy" ON fornecedor_produtos;
DROP POLICY IF EXISTS "fornecedor_produtos_access" ON fornecedor_produtos;

CREATE POLICY "fornecedor_produtos_access" ON fornecedor_produtos
FOR ALL USING (
  empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
    UNION
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'Activo'
  )
);
