# Análise Completa dos 16 Scripts SQL - Magic Pro Services

## 📊 Resumo Executivo
- **Total de Scripts**: 16
- **Scripts de Criação**: 8 (Tabelas principais)
- **Scripts de Alteração**: 8 (Adições de colunas)
- **Tabelas Ativas no Supabase**: 9 + 2 tabelas de iten
- **Scripts em Uso**: 14 (ativos)
- **Scripts Não Utilizados**: 2 (scripts 9 e 13 redundantes)

---

## ✅ SCRIPTS PRINCIPAIS (CRIAÇÃO DE TABELAS)

### Script 001: `001_create_empresa_table.sql`
**Status**: ✅ ESSENCIAL - EM USO
- **Tabela**: `empresas`
- **Descrição**: Informações da empresa (NUIT, nome, telefone, email, endereço)
- **Colunas**: id, nome, nuit, telefone, email, endereco, pais
- **Uso**: Dados centralizados da empresa, configurações globais
- **Supabase**: SIM - Ativa e com RLS
- **Uso na App**: `/dashboard/configuracoes` - Edição de configurações da empresa

---

### Script 002: `002_create_clientes_table.sql`
**Status**: ✅ ESSENCIAL - EM USO
- **Tabela**: `clientes`
- **Descrição**: Dados dos clientes (NUIT, endereço, contactos)
- **Colunas**: id, nome, nuit, endereco, telefone, email, cidade, provincia, user_id
- **Uso**: Gestão de clientes, base para facturas e cotações
- **Supabase**: SIM - Ativa e com RLS
- **Uso na App**: `/dashboard/clientes` - CRUD completo de clientes

---

### Script 003: `003_create_produtos_table.sql`
**Status**: ✅ ESSENCIAL - EM USO
- **Tabela**: `produtos`
- **Descrição**: Catálogo de produtos (nome, preço, stock, unidade)
- **Colunas**: id, nome, descricao, preco, stock, unidade, user_id
- **Uso**: Base para cotações e facturas, gestão de inventário
- **Supabase**: SIM - Ativa e com RLS
- **Uso na App**: `/dashboard/produtos` - CRUD de produtos

---

### Script 004: `004_create_fornecedores_table.sql`
**Status**: ✅ ESSENCIAL - EM USO
- **Tabela**: `fornecedores`
- **Descrição**: Dados dos fornecedores (NUIT, endereço, contactos)
- **Colunas**: id, nome, nuit, endereco, telefone, email, banco, iban, user_id
- **Uso**: Gestão de fornecedores, pagamentos
- **Supabase**: SIM - Ativa e com RLS
- **Uso na App**: `/dashboard/fornecedores` - CRUD de fornecedores

---

### Script 005: `005_create_facturas_table.sql`
**Status**: ✅ ESSENCIAL - EM USO
- **Tabelas**: `facturas` + `factura_itens` (2 tabelas)
- **Descrição**: Sistema de facturas com itens
- **Colunas Facturas**: id, numero_factura, cliente_id, data_emissao, data_vencimento, valor_total, estado, user_id
- **Colunas Itens**: id, factura_id, produto_id, quantidade, preco_unitario, subtotal
- **Uso**: Gestão de faturas, relatórios de vendas
- **Supabase**: SIM - Ambas ativas e com RLS
- **Uso na App**: `/dashboard/facturas` - Criar, editar, visualizar faturas

---

### Script 006: `006_create_cotacoes_table.sql`
**Status**: ✅ ESSENCIAL - EM USO
- **Tabelas**: `cotacoes` + `cotacao_itens` (2 tabelas)
- **Descrição**: Sistema de cotações/orçamentos com itens
- **Colunas Cotações**: id, numero_cotacao, cliente_id, data_emissao, data_validade, valor_total, estado, diretor_geral, notas, user_id
- **Colunas Itens**: id, cotacao_id, produto_id, quantidade, preco_unitario, subtotal
- **Uso**: Gestão de orçamentos/cotações
- **Supabase**: SIM - Ambas ativas e com RLS
- **Uso na App**: `/dashboard/cotacoes` - Criar, editar, visualizar cotações

---

### Script 007: `007_create_funcionarios_table.sql`
**Status**: ✅ ESSENCIAL - EM USO
- **Tabela**: `funcionarios`
- **Descrição**: Dados dos funcionários com autenticação
- **Colunas**: id, user_id (FK), nome, email, cargo, nivel_acesso, estado, telefone_alternativo, data_nascimento, data_admissao, bi, nuit, salario_base, inss, endereco, nivel_academico, instituicao_ensino, doenca_cronica, descricao, ultimo_login
- **Uso**: Autenticação, autorização, rastreamento de criação de documentos
- **Supabase**: SIM - Ativa com RLS e autenticação integrada
- **Uso na App**: Autenticação, `/dashboard/funcionarios` - Gestão de funcionários

---

### Script 008: `008_create_cartas_table.sql`
**Status**: ✅ ESSENCIAL - EM USO
- **Tabela**: `cartas`
- **Descrição**: Sistema de cartas/interpelações
- **Colunas**: id, entidade_destinataria, numero_contrato, data_contrato, valor_total, prazo_dias, local, data_carta, nome_advogado, cp_advogado, user_id
- **Uso**: Gestão de correspondência legal
- **Supabase**: SIM - Ativa e com RLS
- **Uso na App**: `/dashboard/cartas` - Criar, visualizar, imprimir, enviar cartas

---

### Script 014: `014_create_emails_enviados_table.sql`
**Status**: ✅ ESSENCIAL - EM USO
- **Tabela**: `emails_enviados`
- **Descrição**: Histórico de emails enviados (auditoria)
- **Colunas**: id, destinatario, cc, assunto, corpo, tipo_documento, documento_id, enviado_por, enviado_por_nome, enviado_por_email, status, erro_mensagem, created_at
- **Uso**: Rastreamento e auditoria de emails
- **Supabase**: SIM - Ativa e com RLS
- **Uso na App**: `/dashboard/emails` - Visualizar histórico de emails

---

## 🔧 SCRIPTS DE ALTERAÇÃO (ALTER TABLE)

### Script 009: `009_alter_funcionarios_add_columns.sql`
**Status**: ⚠️ REDUNDANTE - PARCIALMENTE NECESSÁRIO
- **Tabela**: `funcionarios`
- **Alterações**: Adiciona 13 colunas de informações pessoais
- **Colunas**: telefone_alternativo, data_nascimento, data_admissao, bi, nuit, salario_base, inss, endereco, nivel_academico, instituicao_ensino, doenca_cronica, descricao
- **Problema**: Algumas colunas já existem no script 007
- **Recomendação**: ⚠️ Verificar redundâncias
- **Supabase**: Parcialmente ativa

---

### Script 010: `010_alter_cotacoes_add_criado_por.sql`
**Status**: ✅ EM USO
- **Tabela**: `cotacoes`
- **Alterações**: Adiciona coluna `criado_por_funcionario_id` (FK para funcionarios)
- **Uso**: Rastrear qual funcionário criou cada cotação
- **Supabase**: SIM - Ativa
- **Uso na App**: Relatórios, filtros por funcionário

---

### Script 011: `011_alter_facturas_add_criado_por.sql`
**Status**: ✅ EM USO
- **Tabela**: `facturas`
- **Alterações**: Adiciona coluna `criado_por_funcionario_id` (FK para funcionarios)
- **Uso**: Rastrear qual funcionário criou cada fatura
- **Supabase**: SIM - Ativa
- **Uso na App**: Relatórios, filtros por funcionário

---

### Script 012: `012_alter_funcionarios_add_ultimo_login.sql`
**Status**: ✅ EM USO
- **Tabela**: `funcionarios`
- **Alterações**: Adiciona coluna `ultimo_login` (TIMESTAMP)
- **Uso**: Rastrear acesso de funcionários, estatísticas de uso
- **Supabase**: SIM - Ativa
- **Uso na App**: Dashboard, relatórios de atividade

---

### Script 013: `013_alter_empresas_add_columns.sql`
**Status**: ⚠️ PARCIALMENTE NECESSÁRIO
- **Tabela**: `empresas`
- **Alterações**: website, cidade, provincia, sector_actividade, ramo_actividade
- **Problema**: Algumas colunas podem não estar em uso na interface
- **Recomendação**: ⚠️ Verificar se está a ser utilizado
- **Supabase**: SIM - Ativa

---

### Script 015: `015_alter_cotacoes_add_diretor_geral.sql`
**Status**: ✅ EM USO - RECENTEMENTE ADICIONADO
- **Tabela**: `cotacoes`
- **Alterações**: Adiciona coluna `diretor_geral` (FK para funcionarios)
- **Uso**: Registar qual é o diretor geral responsável
- **Supabase**: SIM - Ativa
- **Uso na App**: `/dashboard/cotacoes` - Campo editável na visualização

---

### Script 016: `016_alter_cotacoes_add_notas.sql`
**Status**: ✅ EM USO - RECENTEMENTE ADICIONADO
- **Tabela**: `cotacoes`
- **Alterações**: Adiciona coluna `notas` (TEXT)
- **Uso**: Adicionar observações/notas às cotações
- **Supabase**: SIM - Ativa
- **Uso na App**: `/dashboard/cotacoes` - Campo editável

---

## 📋 TABELA RESUMIDA DE STATUS

| Script | Tabela | Tipo | Status | Em Uso | Crítico |
|--------|--------|------|--------|--------|---------|
| 001 | empresas | CREATE | ✅ Ativo | SIM | ✅ CRÍTICO |
| 002 | clientes | CREATE | ✅ Ativo | SIM | ✅ CRÍTICO |
| 003 | produtos | CREATE | ✅ Ativo | SIM | ✅ CRÍTICO |
| 004 | fornecedores | CREATE | ✅ Ativo | SIM | ✅ CRÍTICO |
| 005 | facturas + itens | CREATE | ✅ Ativo | SIM | ✅ CRÍTICO |
| 006 | cotacoes + itens | CREATE | ✅ Ativo | SIM | ✅ CRÍTICO |
| 007 | funcionarios | CREATE | ✅ Ativo | SIM | ✅ CRÍTICO |
| 008 | cartas | CREATE | ✅ Ativo | SIM | ✅ CRÍTICO |
| 009 | funcionarios | ALTER | ⚠️ Parcial | PARCIAL | ⚠️ Revisar |
| 010 | cotacoes | ALTER | ✅ Ativo | SIM | ✅ IMPORTANTE |
| 011 | facturas | ALTER | ✅ Ativo | SIM | ✅ IMPORTANTE |
| 012 | funcionarios | ALTER | ✅ Ativo | SIM | ✅ IMPORTANTE |
| 013 | empresas | ALTER | ⚠️ Parcial | PARCIAL | ⚠️ Revisar |
| 014 | emails_enviados | CREATE | ✅ Ativo | SIM | ✅ IMPORTANTE |
| 015 | cotacoes | ALTER | ✅ Ativo | SIM | ✅ Novo |
| 016 | cotacoes | ALTER | ✅ Ativo | SIM | ✅ Novo |

---

## 🎯 CATEGORIAS

### ✅ SCRIPTS CRÍTICOS (Não remover)
Scripts 001-008, 010, 011, 012, 014
- Formam a base do sistema
- Todas as funcionalidades dependem deles

### ⚠️ SCRIPTS A REVISAR
- **Script 009**: Verificar redundâncias com script 007
- **Script 013**: Verificar utilização das colunas adicionadas

### 📊 ESTATÍSTICAS FINAIS
- **Tabelas Principais**: 9
- **Tabelas de Itens**: 2 (factura_itens, cotacao_itens)
- **Total de Tabelas**: 11
- **Colunas Adicionadas via ALTER**: 30+
- **Scripts Críticos**: 13/16 (81%)
- **Scripts com Possíveis Redundâncias**: 2/16 (13%)

---

## 🔍 COMO CADA TABELA SE RELACIONA

\`\`\`
empresas (Configuração Central)
    ↓
funcionarios (Autenticação & Rastreamento)
    ↓
┌───────────────────────────────────────────────┐
│                                               │
clientes ←→ cotacoes ←→ cotacao_itens          │
    ↓            ↓                              │
    └→ facturas ←→ factura_itens               │
             ↓                                  │
        emails_enviados (Auditoria)           │
             ↓                                  │
cartas (Documentação Legal)                   │
             ↓                                  │
fornecedores (Suprimentos)                    │
             ↓                                  │
produtos (Base de Dados de Produtos)          │
└───────────────────────────────────────────────┘
\`\`\`

---

## ⚙️ PRÓXIMOS PASSOS RECOMENDADOS

1. **Verificar Script 009**: Consolidar colunas de funcionarios
2. **Verificar Script 013**: Confirmar necessidade das colunas de empresa
3. **Adicionar Índices**: Melhorar performance nas queries frequentes
4. **Documentar Queries**: Adicionar guia de queries mais comuns
5. **Backup Regular**: Configurar backups automáticos no Supabase
