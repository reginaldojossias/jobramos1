-- Função auxiliar para obter o empresa_id do funcionário logado
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM funcionarios
  WHERE user_id = auth.uid()
  AND estado = 'ativo'
  LIMIT 1;
  
  RETURN v_empresa_id;
END;
$$;

-- Função para obter o empresa_id a partir de um user_id específico
CREATE OR REPLACE FUNCTION get_empresa_id_from_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Primeiro tenta obter da tabela funcionarios
  SELECT empresa_id INTO v_empresa_id
  FROM funcionarios
  WHERE user_id = p_user_id
  AND estado = 'ativo'
  LIMIT 1;
  
  -- Se não encontrou, tenta obter da tabela empresas
  IF v_empresa_id IS NULL THEN
    SELECT id INTO v_empresa_id
    FROM empresas
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;
  
  RETURN v_empresa_id;
END;
$$;
