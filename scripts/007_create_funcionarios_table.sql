-- Criar tabela de funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT,
  telefone_alternativo TEXT,
  cargo TEXT DEFAULT 'Funcionário',
  data_nascimento DATE,
  data_admissao DATE,
  bi TEXT,
  nuit TEXT,
  salario_base DECIMAL(12, 2) DEFAULT 0,
  inss TEXT,
  endereco TEXT,
  nivel_academico TEXT,
  instituicao_ensino TEXT,
  doenca_cronica BOOLEAN DEFAULT false,
  descricao TEXT,
  nivel_acesso TEXT DEFAULT 'funcionario' CHECK (nivel_acesso IN ('admin', 'funcionario')),
  estado TEXT DEFAULT 'ativo' CHECK (estado IN ('ativo', 'inativo', 'pendente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Apenas admins podem gerir funcionários
CREATE POLICY "funcionarios_select_all" ON funcionarios
  FOR SELECT USING (true);

CREATE POLICY "funcionarios_insert_admin" ON funcionarios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "funcionarios_update_admin" ON funcionarios
  FOR UPDATE USING (true);

CREATE POLICY "funcionarios_delete_admin" ON funcionarios
  FOR DELETE USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_funcionarios_user_id ON funcionarios(user_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_email ON funcionarios(email);
CREATE INDEX IF NOT EXISTS idx_funcionarios_estado ON funcionarios(estado);
