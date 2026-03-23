-- Corrigir a política de INSERT para funcionarios
-- Permitir que usuários autenticados que são proprietários ou admins da empresa
-- possam inserir novos funcionários

DROP POLICY "funcionarios_insert_policy" ON "public"."funcionarios";

CREATE POLICY "funcionarios_insert_policy" ON "public"."funcionarios"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    -- Propriétario da empresa
    (empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
    ))
    OR
    -- Admin da empresa
    (EXISTS (
      SELECT 1 FROM funcionarios f
      WHERE f.empresa_id = funcionarios.empresa_id
        AND f.user_id = auth.uid()
        AND f.nivel_acesso = 'admin'
    ))
  )
);
