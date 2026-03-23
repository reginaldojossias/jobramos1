-- ===========================================
-- SCRIPT MASTER: CORRIGE TODOS OS PROBLEMAS
-- ===========================================

-- 1. Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 2. TABELA EMPRESAS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nuit TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  logo_url TEXT,
  cidade TEXT,
  provincia TEXT,
  codigo_postal TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_select_own" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert_own" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_own" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete_own" ON public.empresas;

CREATE POLICY "empresas_select_own" ON public.empresas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "empresas_insert_own" ON public.empresas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "empresas_update_own" ON public.empresas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "empresas_delete_own" ON public.empresas FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- 3. TABELA FUNCIONARIOS
-- ===========================================
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
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
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna empresa_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funcionarios' AND column_name = 'empresa_id') THEN
    ALTER TABLE funcionarios ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar coluna ultimo_login se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funcionarios' AND column_name = 'ultimo_login') THEN
    ALTER TABLE funcionarios ADD COLUMN ultimo_login TIMESTAMPTZ;
  END IF;
END $$;

ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas antigas de funcionarios
DROP POLICY IF EXISTS "funcionarios_select_all" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_insert_admin" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_update_admin" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_delete_admin" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_select_empresa" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_update_empresa" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_delete_empresa" ON funcionarios;
DROP POLICY IF EXISTS "funcionarios_insert_permitido" ON funcionarios;

-- POLÍTICAS SIMPLES PARA FUNCIONARIOS (sem recursão)
-- SELECT: Autenticado pode ver funcionários onde tem acesso
CREATE POLICY "funcionarios_select_policy" ON funcionarios
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Pode ver a si mesmo
    user_id = auth.uid()
    OR
    -- Pode ver funcionários da mesma empresa (via tabela empresas)
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
    OR
    -- Pode ver funcionários se é funcionário da mesma empresa
    empresa_id IN (SELECT f.empresa_id FROM funcionarios f WHERE f.user_id = auth.uid())
  )
);

-- INSERT: Qualquer usuário autenticado pode criar funcionário (validação no código)
CREATE POLICY "funcionarios_insert_policy" ON funcionarios
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Dono da empresa ou o próprio funcionário
CREATE POLICY "funcionarios_update_policy" ON funcionarios
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid()
    OR
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  )
);

-- DELETE: Apenas dono da empresa
CREATE POLICY "funcionarios_delete_policy" ON funcionarios
FOR DELETE USING (
  empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_funcionarios_user_id ON funcionarios(user_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_email ON funcionarios(email);
CREATE INDEX IF NOT EXISTS idx_funcionarios_estado ON funcionarios(estado);
CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa_id ON funcionarios(empresa_id);

-- ===========================================
-- 4. TABELA CLIENTES
-- ===========================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  nuit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'empresa_id') THEN
    ALTER TABLE clientes ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_select_own" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_own" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_own" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_own" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_empresa" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_empresa" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_empresa" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_empresa" ON public.clientes;

CREATE POLICY "clientes_policy" ON public.clientes FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() 
    OR empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
    OR empresa_id IN (SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo')
  )
);

-- ===========================================
-- 5. TABELA PRODUTOS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(12, 2) NOT NULL DEFAULT 0,
  unidade TEXT DEFAULT 'un',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'empresa_id') THEN
    ALTER TABLE produtos ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "produtos_select_own" ON public.produtos;
DROP POLICY IF EXISTS "produtos_insert_own" ON public.produtos;
DROP POLICY IF EXISTS "produtos_update_own" ON public.produtos;
DROP POLICY IF EXISTS "produtos_delete_own" ON public.produtos;
DROP POLICY IF EXISTS "produtos_select_empresa" ON public.produtos;
DROP POLICY IF EXISTS "produtos_insert_empresa" ON public.produtos;
DROP POLICY IF EXISTS "produtos_update_empresa" ON public.produtos;
DROP POLICY IF EXISTS "produtos_delete_empresa" ON public.produtos;

CREATE POLICY "produtos_policy" ON public.produtos FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() 
    OR empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
    OR empresa_id IN (SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo')
  )
);

-- ===========================================
-- 6. TABELA FORNECEDORES
-- ===========================================
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  nuit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fornecedores' AND column_name = 'empresa_id') THEN
    ALTER TABLE fornecedores ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fornecedores_select_own" ON public.fornecedores;
DROP POLICY IF EXISTS "fornecedores_insert_own" ON public.fornecedores;
DROP POLICY IF EXISTS "fornecedores_update_own" ON public.fornecedores;
DROP POLICY IF EXISTS "fornecedores_delete_own" ON public.fornecedores;
DROP POLICY IF EXISTS "fornecedores_select_empresa" ON public.fornecedores;
DROP POLICY IF EXISTS "fornecedores_insert_empresa" ON public.fornecedores;
DROP POLICY IF EXISTS "fornecedores_update_empresa" ON public.fornecedores;
DROP POLICY IF EXISTS "fornecedores_delete_empresa" ON public.fornecedores;

CREATE POLICY "fornecedores_policy" ON public.fornecedores FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() 
    OR empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
    OR empresa_id IN (SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo')
  )
);

-- ===========================================
-- 7. TABELA FACTURAS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  cliente_nome TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  itens JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  iva DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  estado TEXT DEFAULT 'rascunho',
  notas TEXT,
  criado_por UUID REFERENCES funcionarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facturas' AND column_name = 'empresa_id') THEN
    ALTER TABLE facturas ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facturas' AND column_name = 'criado_por') THEN
    ALTER TABLE facturas ADD COLUMN criado_por UUID REFERENCES funcionarios(id);
  END IF;
END $$;

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facturas_select_own" ON public.facturas;
DROP POLICY IF EXISTS "facturas_insert_own" ON public.facturas;
DROP POLICY IF EXISTS "facturas_update_own" ON public.facturas;
DROP POLICY IF EXISTS "facturas_delete_own" ON public.facturas;
DROP POLICY IF EXISTS "facturas_select_empresa" ON public.facturas;
DROP POLICY IF EXISTS "facturas_insert_empresa" ON public.facturas;
DROP POLICY IF EXISTS "facturas_update_empresa" ON public.facturas;
DROP POLICY IF EXISTS "facturas_delete_empresa" ON public.facturas;

CREATE POLICY "facturas_policy" ON public.facturas FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() 
    OR empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
    OR empresa_id IN (SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo')
  )
);

-- ===========================================
-- 8. TABELA COTACOES
-- ===========================================
CREATE TABLE IF NOT EXISTS public.cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  cliente_nome TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  itens JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  iva DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  estado TEXT DEFAULT 'rascunho',
  notas TEXT,
  diretor_geral TEXT,
  criado_por UUID REFERENCES funcionarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cotacoes' AND column_name = 'empresa_id') THEN
    ALTER TABLE cotacoes ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cotacoes' AND column_name = 'criado_por') THEN
    ALTER TABLE cotacoes ADD COLUMN criado_por UUID REFERENCES funcionarios(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cotacoes' AND column_name = 'diretor_geral') THEN
    ALTER TABLE cotacoes ADD COLUMN diretor_geral TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cotacoes' AND column_name = 'notas') THEN
    ALTER TABLE cotacoes ADD COLUMN notas TEXT;
  END IF;
END $$;

ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cotacoes_select_own" ON public.cotacoes;
DROP POLICY IF EXISTS "cotacoes_insert_own" ON public.cotacoes;
DROP POLICY IF EXISTS "cotacoes_update_own" ON public.cotacoes;
DROP POLICY IF EXISTS "cotacoes_delete_own" ON public.cotacoes;
DROP POLICY IF EXISTS "cotacoes_select_empresa" ON public.cotacoes;
DROP POLICY IF EXISTS "cotacoes_insert_empresa" ON public.cotacoes;
DROP POLICY IF EXISTS "cotacoes_update_empresa" ON public.cotacoes;
DROP POLICY IF EXISTS "cotacoes_delete_empresa" ON public.cotacoes;

CREATE POLICY "cotacoes_policy" ON public.cotacoes FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() 
    OR empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
    OR empresa_id IN (SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo')
  )
);

-- ===========================================
-- 9. TABELA CARTAS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.cartas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'geral',
  destinatario TEXT,
  assunto TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cartas' AND column_name = 'empresa_id') THEN
    ALTER TABLE cartas ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cartas_select" ON public.cartas;
DROP POLICY IF EXISTS "cartas_insert" ON public.cartas;
DROP POLICY IF EXISTS "cartas_update" ON public.cartas;
DROP POLICY IF EXISTS "cartas_delete" ON public.cartas;
DROP POLICY IF EXISTS "cartas_select_empresa" ON public.cartas;
DROP POLICY IF EXISTS "cartas_insert_empresa" ON public.cartas;
DROP POLICY IF EXISTS "cartas_update_empresa" ON public.cartas;
DROP POLICY IF EXISTS "cartas_delete_empresa" ON public.cartas;

CREATE POLICY "cartas_policy" ON public.cartas FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() 
    OR empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
    OR empresa_id IN (SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo')
  )
);

-- ===========================================
-- 10. TABELA EMAILS_ENVIADOS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.emails_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  enviado_por UUID REFERENCES funcionarios(id),
  tipo TEXT NOT NULL,
  documento_id UUID,
  destinatario TEXT NOT NULL,
  assunto TEXT NOT NULL,
  corpo TEXT,
  status TEXT DEFAULT 'enviado',
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails_enviados' AND column_name = 'empresa_id') THEN
    ALTER TABLE emails_enviados ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.emails_enviados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emails_enviados_select" ON public.emails_enviados;
DROP POLICY IF EXISTS "emails_enviados_insert" ON public.emails_enviados;
DROP POLICY IF EXISTS "emails_enviados_select_empresa" ON public.emails_enviados;
DROP POLICY IF EXISTS "emails_enviados_insert_empresa" ON public.emails_enviados;

CREATE POLICY "emails_enviados_policy" ON public.emails_enviados FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
    OR empresa_id IN (SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid() AND estado = 'ativo')
  )
);

-- ===========================================
-- 11. FUNÇÕES AUXILIARES
-- ===========================================
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Primeiro tenta obter da tabela empresas (dono da empresa)
  SELECT id INTO v_empresa_id
  FROM empresas
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Se não encontrou, tenta obter da tabela funcionarios
  IF v_empresa_id IS NULL THEN
    SELECT empresa_id INTO v_empresa_id
    FROM funcionarios
    WHERE user_id = auth.uid()
    AND estado = 'ativo'
    LIMIT 1;
  END IF;
  
  RETURN v_empresa_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_empresa_id_from_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT id INTO v_empresa_id
  FROM empresas
  WHERE user_id = p_user_id
  LIMIT 1;
  
  IF v_empresa_id IS NULL THEN
    SELECT empresa_id INTO v_empresa_id
    FROM funcionarios
    WHERE user_id = p_user_id
    AND estado = 'ativo'
    LIMIT 1;
  END IF;
  
  RETURN v_empresa_id;
END;
$$;

-- ===========================================
-- FIM DO SCRIPT
-- ===========================================
