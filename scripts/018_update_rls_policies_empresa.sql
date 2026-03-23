-- Migration para atualizar as políticas RLS para usar empresa_id
-- Isto permite que múltiplos funcionários da mesma empresa acessem os dados

-- ========== FUNCIONÁRIOS ==========
DROP POLICY IF EXISTS "funcionarios_select_all" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_insert_admin" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_update_admin" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_delete_admin" ON funcionarios;

-- Funcionários podem ver outros funcionários da mesma empresa
CREATE POLICY "funcionarios_select_empresa" ON funcionarios
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid()
  )
);

-- Apenas admins podem inserir novos funcionários
CREATE POLICY "funcionarios_insert_admin" ON funcionarios
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM funcionarios 
    WHERE user_id = auth.uid() 
    AND nivel_acesso = 'admin'
    AND estado = 'ativo'
  )
);

-- Admins podem atualizar funcionários da mesma empresa
CREATE POLICY "funcionarios_update_empresa" ON funcionarios
FOR UPDATE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios 
    WHERE user_id = auth.uid() 
    AND nivel_acesso = 'admin'
    AND estado = 'ativo'
  )
);

-- Admins podem deletar funcionários da mesma empresa
CREATE POLICY "funcionarios_delete_empresa" ON funcionarios
FOR DELETE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios 
    WHERE user_id = auth.uid() 
    AND nivel_acesso = 'admin'
    AND estado = 'ativo'
  )
);

-- ========== CLIENTES ==========
DROP POLICY IF EXISTS "clientes_select_own" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_own" ON clientes;
DROP POLICY IF EXISTS "clientes_update_own" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_own" ON clientes;

CREATE POLICY "clientes_select_empresa" ON clientes
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "clientes_insert_empresa" ON clientes
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "clientes_update_empresa" ON clientes
FOR UPDATE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "clientes_delete_empresa" ON clientes
FOR DELETE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

-- ========== PRODUTOS ==========
DROP POLICY IF EXISTS "produtos_select_own" ON produtos;
DROP POLICY IF EXISTS "produtos_insert_own" ON produtos;
DROP POLICY IF EXISTS "produtos_update_own" ON produtos;
DROP POLICY IF EXISTS "produtos_delete_own" ON produtos;

CREATE POLICY "produtos_select_empresa" ON produtos
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "produtos_insert_empresa" ON produtos
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "produtos_update_empresa" ON produtos
FOR UPDATE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "produtos_delete_empresa" ON produtos
FOR DELETE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

-- ========== FORNECEDORES ==========
DROP POLICY IF EXISTS "fornecedores_select_own" ON fornecedores;
DROP POLICY IF EXISTS "fornecedores_insert_own" ON fornecedores;
DROP POLICY IF EXISTS "fornecedores_update_own" ON fornecedores;
DROP POLICY IF EXISTS "fornecedores_delete_own" ON fornecedores;

CREATE POLICY "fornecedores_select_empresa" ON fornecedores
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "fornecedores_insert_empresa" ON fornecedores
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "fornecedores_update_empresa" ON fornecedores
FOR UPDATE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "fornecedores_delete_empresa" ON fornecedores
FOR DELETE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

-- ========== FACTURAS ==========
DROP POLICY IF EXISTS "facturas_select_own" ON facturas;
DROP POLICY IF EXISTS "facturas_insert_own" ON facturas;
DROP POLICY IF EXISTS "facturas_update_own" ON facturas;
DROP POLICY IF EXISTS "facturas_delete_own" ON facturas;

CREATE POLICY "facturas_select_empresa" ON facturas
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "facturas_insert_empresa" ON facturas
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "facturas_update_empresa" ON facturas
FOR UPDATE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "facturas_delete_empresa" ON facturas
FOR DELETE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

-- ========== COTAÇÕES ==========
DROP POLICY IF EXISTS "cotacoes_select_own" ON cotacoes;
DROP POLICY IF EXISTS "cotacoes_insert_own" ON cotacoes;
DROP POLICY IF EXISTS "cotacoes_update_own" ON cotacoes;
DROP POLICY IF EXISTS "cotacoes_delete_own" ON cotacoes;

CREATE POLICY "cotacoes_select_empresa" ON cotacoes
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "cotacoes_insert_empresa" ON cotacoes
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "cotacoes_update_empresa" ON cotacoes
FOR UPDATE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "cotacoes_delete_empresa" ON cotacoes
FOR DELETE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

-- ========== CARTAS ==========
DROP POLICY IF EXISTS "cartas_select" ON cartas;
DROP POLICY IF EXISTS "cartas_insert" ON cartas;
DROP POLICY IF EXISTS "cartas_update" ON cartas;
DROP POLICY IF EXISTS "cartas_delete" ON cartas;

CREATE POLICY "cartas_select_empresa" ON cartas
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "cartas_insert_empresa" ON cartas
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "cartas_update_empresa" ON cartas
FOR UPDATE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "cartas_delete_empresa" ON cartas
FOR DELETE USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

-- ========== EMAILS ENVIADOS ==========
DROP POLICY IF EXISTS "emails_enviados_select" ON emails_enviados;
DROP POLICY IF EXISTS "emails_enviados_insert" ON emails_enviados;

CREATE POLICY "emails_enviados_select_empresa" ON emails_enviados
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);

CREATE POLICY "emails_enviados_insert_empresa" ON emails_enviados
FOR INSERT WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
  )
);
