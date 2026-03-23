-- Criar tabela para histórico de emails enviados
CREATE TABLE IF NOT EXISTS emails_enviados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destinatario TEXT NOT NULL,
  cc TEXT,
  assunto TEXT NOT NULL,
  corpo TEXT,
  tipo_documento TEXT, -- 'carta', 'cotacao', 'factura', 'outro'
  documento_id UUID,
  documento_numero TEXT,
  enviado_por UUID REFERENCES funcionarios(id),
  enviado_por_nome TEXT,
  enviado_por_email TEXT,
  status TEXT DEFAULT 'enviado', -- 'enviado', 'falhou'
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_emails_enviados_created_at ON emails_enviados(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_enviados_tipo ON emails_enviados(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_emails_enviados_enviado_por ON emails_enviados(enviado_por);

-- RLS
ALTER TABLE emails_enviados ENABLE ROW LEVEL SECURITY;

-- Política para permitir visualização por funcionários autenticados
CREATE POLICY "Funcionários podem ver emails enviados"
  ON emails_enviados
  FOR SELECT
  USING (true);

-- Política para permitir inserção
CREATE POLICY "Funcionários podem inserir emails"
  ON emails_enviados
  FOR INSERT
  WITH CHECK (true);
