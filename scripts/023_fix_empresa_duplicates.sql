-- Script para corrigir empresas duplicadas
-- Todos os funcionarios devem pertencer a mesma empresa Magic Pro Services

-- 1. Identificar a empresa original Magic Pro Services (a mais antiga)
-- e actualizar todos os funcionarios para apontar para ela

DO $$
DECLARE
  v_empresa_original_id UUID;
BEGIN
  -- Buscar a empresa Magic Pro Services mais antiga (a original)
  SELECT id INTO v_empresa_original_id
  FROM empresas
  WHERE nome = 'Magic Pro Services'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_empresa_original_id IS NULL THEN
    RAISE NOTICE 'Empresa Magic Pro Services não encontrada';
    RETURN;
  END IF;

  RAISE NOTICE 'Empresa original ID: %', v_empresa_original_id;

  -- 2. Actualizar todos os funcionarios para apontar para a empresa original
  UPDATE funcionarios
  SET empresa_id = v_empresa_original_id
  WHERE empresa_id IS NULL 
     OR empresa_id != v_empresa_original_id;

  -- 3. Actualizar todas as tabelas que tenham empresa_id para a empresa original
  UPDATE clientes SET empresa_id = v_empresa_original_id WHERE empresa_id IS NULL OR empresa_id != v_empresa_original_id;
  UPDATE produtos SET empresa_id = v_empresa_original_id WHERE empresa_id IS NULL OR empresa_id != v_empresa_original_id;
  UPDATE fornecedores SET empresa_id = v_empresa_original_id WHERE empresa_id IS NULL OR empresa_id != v_empresa_original_id;
  UPDATE facturas SET empresa_id = v_empresa_original_id WHERE empresa_id IS NULL OR empresa_id != v_empresa_original_id;
  UPDATE cotacoes SET empresa_id = v_empresa_original_id WHERE empresa_id IS NULL OR empresa_id != v_empresa_original_id;
  UPDATE cartas SET empresa_id = v_empresa_original_id WHERE empresa_id IS NULL OR empresa_id != v_empresa_original_id;

  -- 4. Remover as empresas duplicadas (manter apenas a original)
  DELETE FROM empresas
  WHERE nome = 'Magic Pro Services'
    AND id != v_empresa_original_id;

  RAISE NOTICE 'Limpeza concluída com sucesso!';
END;
$$;
