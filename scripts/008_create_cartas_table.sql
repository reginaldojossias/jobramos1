-- Criar tabela de cartas
CREATE TABLE IF NOT EXISTS cartas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados do destinatário
  entidade_destinataria TEXT NOT NULL,
  
  -- Dados do contrato
  numero_contrato TEXT NOT NULL,
  data_contrato DATE,
  
  -- Valores e prazos
  valor_total DECIMAL(15,2),
  prazo_dias INTEGER DEFAULT 15,
  
  -- Local e data
  local TEXT DEFAULT 'Maputo',
  data_carta DATE NOT NULL,
  
  -- Dados do advogado
  nome_advogado TEXT DEFAULT 'Augusto Matalene Paunde Zandamela',
  cp_advogado TEXT DEFAULT '2559',
  
  -- Metadados
  titulo TEXT DEFAULT 'Interpelação extrajudicial',
  observacoes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE cartas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "cartas_select_all" ON cartas
  FOR SELECT USING (true);

CREATE POLICY "cartas_insert_own" ON cartas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cartas_update_own" ON cartas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cartas_delete_own" ON cartas
  FOR DELETE USING (auth.uid() = user_id);
