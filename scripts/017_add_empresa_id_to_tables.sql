-- Migration para adicionar empresa_id em todas as tabelas principais
-- Isto permitirá que múltiplos funcionários da mesma empresa vejam os mesmos dados

-- Primeiro, adicionar coluna empresa_id na tabela funcionarios (sem foreign key inicialmente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funcionarios' AND column_name = 'empresa_id') THEN
        ALTER TABLE funcionarios ADD COLUMN empresa_id UUID;
    END IF;
END $$;

-- Adicionar coluna empresa_id na tabela clientes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'empresa_id') THEN
        ALTER TABLE clientes ADD COLUMN empresa_id UUID;
    END IF;
END $$;

-- Adicionar coluna empresa_id na tabela produtos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'empresa_id') THEN
        ALTER TABLE produtos ADD COLUMN empresa_id UUID;
    END IF;
END $$;

-- Adicionar coluna empresa_id na tabela fornecedores
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fornecedores' AND column_name = 'empresa_id') THEN
        ALTER TABLE fornecedores ADD COLUMN empresa_id UUID;
    END IF;
END $$;

-- Adicionar coluna empresa_id na tabela facturas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facturas' AND column_name = 'empresa_id') THEN
        ALTER TABLE facturas ADD COLUMN empresa_id UUID;
    END IF;
END $$;

-- Adicionar coluna empresa_id na tabela cotacoes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cotacoes' AND column_name = 'empresa_id') THEN
        ALTER TABLE cotacoes ADD COLUMN empresa_id UUID;
    END IF;
END $$;

-- Adicionar coluna empresa_id na tabela cartas (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cartas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cartas' AND column_name = 'empresa_id') THEN
            ALTER TABLE cartas ADD COLUMN empresa_id UUID;
        END IF;
    END IF;
END $$;

-- Adicionar coluna empresa_id na tabela emails_enviados (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emails_enviados') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails_enviados' AND column_name = 'empresa_id') THEN
            ALTER TABLE emails_enviados ADD COLUMN empresa_id UUID;
        END IF;
    END IF;
END $$;
