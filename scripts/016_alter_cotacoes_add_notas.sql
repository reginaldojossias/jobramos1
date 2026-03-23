-- Adicionar coluna notas à tabela cotacoes
ALTER TABLE cotacoes
ADD COLUMN IF NOT EXISTS notas TEXT;
