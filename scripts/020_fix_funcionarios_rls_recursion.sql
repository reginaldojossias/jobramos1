-- Fix para recursão infinita nas políticas RLS de funcionários
-- O problema ocorre quando um novo funcionário tenta ser criado mas não existe nenhum funcionário ainda

-- Remove as políticas existentes
DROP POLICY IF EXISTS "funcionarios_select_empresa" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_insert_admin" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_update_empresa" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_delete_empresa" ON funcionarios;

-- SELECT: Funcionários podem ver outros funcionários da mesma empresa
CREATE POLICY "funcionarios_select_empresa" ON funcionarios
FOR SELECT USING (
  empresa_id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid()
  )
);

-- INSERT: Permite inserção se for o primeiro funcionário da empresa OU se já existe um admin
-- Usa SECURITY DEFINER para evitar recursão
CREATE POLICY "funcionarios_insert_permitido" ON funcionarios
FOR INSERT WITH CHECK (
  -- Caso 1: Não existe nenhum funcionário com este empresa_id ainda (primeiro admin)
  NOT EXISTS (SELECT 1 FROM funcionarios WHERE empresa_id = funcionarios.empresa_id)
  OR
  -- Caso 2: Existe um admin ativo no mesmo empresa_id que está fazendo a inserção
  EXISTS (
    SELECT 1 FROM funcionarios f
    WHERE f.user_id = auth.uid() 
    AND f.empresa_id = funcionarios.empresa_id
    AND f.nivel_acesso = 'admin'
    AND f.estado = 'ativo'
  )
);

-- UPDATE: Admins podem atualizar funcionários da mesma empresa
CREATE POLICY "funcionarios_update_empresa" ON funcionarios
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM funcionarios f
    WHERE f.user_id = auth.uid() 
    AND f.empresa_id = funcionarios.empresa_id
    AND f.nivel_acesso = 'admin'
    AND f.estado = 'ativo'
  )
);

-- DELETE: Admins podem deletar funcionários da mesma empresa
CREATE POLICY "funcionarios_delete_empresa" ON funcionarios
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM funcionarios f
    WHERE f.user_id = auth.uid() 
    AND f.empresa_id = funcionarios.empresa_id
    AND f.nivel_acesso = 'admin'
    AND f.estado = 'ativo'
  )
);
