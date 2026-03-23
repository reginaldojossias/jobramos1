-- =====================================================
-- Script 022: Criar tabela documentos_digitalizados
-- =====================================================

-- Criar tabela para armazenar metadados dos documentos digitalizados
CREATE TABLE IF NOT EXISTS documentos_digitalizados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('factura', 'cotacao', 'carta')),
    documento_id UUID NOT NULL,
    file_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_documentos_digitalizados_user_id ON documentos_digitalizados(user_id);
CREATE INDEX IF NOT EXISTS idx_documentos_digitalizados_empresa_id ON documentos_digitalizados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_digitalizados_tipo ON documentos_digitalizados(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_documentos_digitalizados_documento ON documentos_digitalizados(tipo_documento, documento_id);
CREATE INDEX IF NOT EXISTS idx_documentos_digitalizados_file_key ON documentos_digitalizados(file_key);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_documentos_digitalizados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documentos_digitalizados_updated_at ON documentos_digitalizados;
CREATE TRIGGER trigger_documentos_digitalizados_updated_at
    BEFORE UPDATE ON documentos_digitalizados
    FOR EACH ROW
    EXECUTE FUNCTION update_documentos_digitalizados_updated_at();

-- Trigger para preencher empresa_id automaticamente baseado no user_id
CREATE OR REPLACE FUNCTION set_documento_empresa_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Primeiro tentar via funcionario
    SELECT empresa_id INTO NEW.empresa_id
    FROM funcionarios
    WHERE user_id = NEW.user_id AND estado = 'ativo'
    LIMIT 1;
    
    -- Se não encontrar, tentar via empresa diretamente
    IF NEW.empresa_id IS NULL THEN
        SELECT id INTO NEW.empresa_id
        FROM empresas
        WHERE user_id = NEW.user_id
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_documento_empresa_id ON documentos_digitalizados;
CREATE TRIGGER trigger_set_documento_empresa_id
    BEFORE INSERT ON documentos_digitalizados
    FOR EACH ROW
    WHEN (NEW.empresa_id IS NULL)
    EXECUTE FUNCTION set_documento_empresa_id();

-- Habilitar RLS
ALTER TABLE documentos_digitalizados ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "documentos_digitalizados_select" ON documentos_digitalizados;
DROP POLICY IF EXISTS "documentos_digitalizados_insert" ON documentos_digitalizados;
DROP POLICY IF EXISTS "documentos_digitalizados_update" ON documentos_digitalizados;
DROP POLICY IF EXISTS "documentos_digitalizados_delete" ON documentos_digitalizados;
DROP POLICY IF EXISTS "documentos_digitalizados_all" ON documentos_digitalizados;

-- Política única para todas operações
CREATE POLICY "documentos_digitalizados_all" ON documentos_digitalizados
    FOR ALL
    TO authenticated
    USING (
        user_id = auth.uid()
        OR empresa_id IN (
            SELECT id FROM empresas WHERE user_id = auth.uid()
        )
        OR empresa_id IN (
            SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR empresa_id IN (
            SELECT id FROM empresas WHERE user_id = auth.uid()
        )
        OR empresa_id IN (
            SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo'
        )
    );

-- Comentários na tabela
COMMENT ON TABLE documentos_digitalizados IS 'Armazena metadados dos documentos digitalizados (PDF, imagens) enviados para Backblaze B2';
COMMENT ON COLUMN documentos_digitalizados.file_key IS 'Chave única do arquivo no Backblaze B2';
COMMENT ON COLUMN documentos_digitalizados.tipo_documento IS 'Tipo do documento: factura, cotacao ou carta';
COMMENT ON COLUMN documentos_digitalizados.documento_id IS 'ID do documento relacionado (factura, cotacao ou carta)';
