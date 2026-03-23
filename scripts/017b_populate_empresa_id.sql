-- Script para preencher empresa_id baseado no user_id existente
-- Execute APÓS o script 017_add_empresa_id_to_tables.sql

-- Preencher empresa_id para funcionários
UPDATE funcionarios f
SET empresa_id = e.id
FROM empresas e
WHERE f.user_id = e.user_id AND f.empresa_id IS NULL;

-- Preencher empresa_id para clientes
UPDATE clientes c
SET empresa_id = e.id
FROM empresas e
WHERE c.user_id = e.user_id AND c.empresa_id IS NULL;

-- Preencher empresa_id para produtos
UPDATE produtos p
SET empresa_id = e.id
FROM empresas e
WHERE p.user_id = e.user_id AND p.empresa_id IS NULL;

-- Preencher empresa_id para fornecedores
UPDATE fornecedores fo
SET empresa_id = e.id
FROM empresas e
WHERE fo.user_id = e.user_id AND fo.empresa_id IS NULL;

-- Preencher empresa_id para facturas
UPDATE facturas fa
SET empresa_id = e.id
FROM empresas e
WHERE fa.user_id = e.user_id AND fa.empresa_id IS NULL;

-- Preencher empresa_id para cotacoes
UPDATE cotacoes co
SET empresa_id = e.id
FROM empresas e
WHERE co.user_id = e.user_id AND co.empresa_id IS NULL;

-- Preencher empresa_id para cartas (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cartas') THEN
        EXECUTE 'UPDATE cartas ca SET empresa_id = e.id FROM empresas e WHERE ca.user_id = e.user_id AND ca.empresa_id IS NULL';
    END IF;
END $$;

-- Preencher empresa_id para emails_enviados (se existir)
-- Usa a relação através de funcionarios
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emails_enviados') THEN
        EXECUTE 'UPDATE emails_enviados ee SET empresa_id = f.empresa_id FROM funcionarios f WHERE ee.enviado_por = f.id AND ee.empresa_id IS NULL';
    END IF;
END $$;
