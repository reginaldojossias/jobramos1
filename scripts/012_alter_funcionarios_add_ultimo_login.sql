-- Adicionar coluna ultimo_login à tabela funcionarios
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_funcionarios_ultimo_login ON funcionarios(ultimo_login);
