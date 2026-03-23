-- Fix RLS policies for stock tables to allow funcionarios access

-- Drop existing policies and recreate with proper access
DROP POLICY IF EXISTS "movimentos_stock_policy" ON movimentos_stock;
DROP POLICY IF EXISTS "fornecedor_produtos_policy" ON fornecedor_produtos;

-- movimentos_stock: allow users who own the empresa OR funcionarios of that empresa
CREATE POLICY "movimentos_stock_policy" ON movimentos_stock
FOR ALL USING (
  empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
    UNION
    SELECT empresa_id FROM funcionarios WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND estado = 'Activo'
  )
);

-- fornecedor_produtos: allow users who own the empresa OR funcionarios of that empresa
CREATE POLICY "fornecedor_produtos_policy" ON fornecedor_produtos
FOR ALL USING (
  empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
    UNION
    SELECT empresa_id FROM funcionarios WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND estado = 'Activo'
  )
);
