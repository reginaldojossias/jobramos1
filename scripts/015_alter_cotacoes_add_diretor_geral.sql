-- Adicionar coluna diretor_geral à tabela cotacoes
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS diretor_geral UUID REFERENCES funcionarios(id);

-- Comentário para documentação
COMMENT ON COLUMN cotacoes.diretor_geral IS 'ID do funcionário que é diretor geral responsável pela cotação';
