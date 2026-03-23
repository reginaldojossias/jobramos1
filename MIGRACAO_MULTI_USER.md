# Migração para Sistema Multi-Usuário por Empresa

## Problema Identificado

O sistema estava isolando dados por `user_id`, o que significa que cada usuário que fazia login via Supabase Auth via apenas seus próprios dados. Quando um novo funcionário entrava no sistema, ele não conseguia ver:
- Facturas
- Cotações
- Clientes
- Produtos
- Fornecedores
- Outros dados da empresa

Mesmo sendo funcionários da mesma empresa, cada um tinha seu próprio conjunto de dados isolado.

## Solução Implementada

Foi implementado um sistema baseado em `empresa_id` que permite que múltiplos funcionários da mesma empresa compartilhem os mesmos dados.

### Mudanças na Base de Dados

1. **Script 017**: Adiciona `empresa_id` em todas as tabelas principais
   - funcionarios
   - clientes
   - produtos
   - fornecedores
   - facturas
   - cotacoes
   - cartas
   - emails_enviados

2. **Script 018**: Atualiza todas as políticas RLS (Row Level Security)
   - Mudou de verificar `auth.uid() = user_id` para verificar `empresa_id`
   - Agora verifica se o usuário logado pertence à mesma empresa
   - Funcionários da mesma empresa podem ver os mesmos dados

3. **Script 019**: Cria funções auxiliares
   - `get_user_empresa_id()`: Obtém o empresa_id do usuário logado
   - `get_empresa_id_from_user()`: Obtém empresa_id de um user_id específico

### Mudanças no Código

1. **Nova biblioteca**: `/lib/empresa.ts`
   - Função `getUserEmpresaId()` que obtém o empresa_id do funcionário logado
   - Usada em todos os componentes ao criar novos registros

2. **Componentes atualizados**:
   - `clientes-client.tsx`: Adiciona empresa_id ao criar clientes
   - `produtos-client.tsx`: Adiciona empresa_id ao criar produtos
   - `fornecedores-client.tsx`: Adiciona empresa_id ao criar fornecedores
   - `facturas-client.tsx`: Adiciona empresa_id ao criar facturas
   - `cotacoes-client.tsx`: Adiciona empresa_id ao criar cotações

## Como Funciona Agora

### Fluxo de Dados

1. **Proprietário cria empresa**
   - Quando um usuário se registra, cria-se um registro na tabela `empresas` com seu `user_id`
   - Este usuário torna-se o administrador da empresa

2. **Administrador adiciona funcionários**
   - Funcionários são criados na tabela `funcionarios`
   - Cada funcionário tem:
     - `user_id`: Referência ao auth.users (conta de login)
     - `empresa_id`: Referência à empresa à qual pertencem
     - `nivel_acesso`: 'admin' ou 'funcionario'
     - `estado`: 'ativo', 'inativo' ou 'pendente'

3. **Funcionários criam dados**
   - Ao criar qualquer registro (cliente, produto, factura, etc.), o sistema:
     - Obtém o `empresa_id` do funcionário logado
     - Salva o registro com esse `empresa_id`
   - As políticas RLS garantem que:
     - Apenas funcionários ativos da mesma empresa podem ver esses dados
     - Funcionários inativos ou de outras empresas não têm acesso

### Exemplo Prático

**Antes da migração:**
- Usuário A (dono) cria Factura #001 → vinculada ao user_id_A
- Usuário B (funcionário) faz login → não vê a Factura #001
- Usuário B cria Factura #002 → vinculada ao user_id_B
- Usuário A não vê a Factura #002

**Depois da migração:**
- Usuário A (dono) cria Factura #001 → vinculada ao empresa_id_X
- Usuário B (funcionário da empresa X) faz login → vê a Factura #001
- Usuário B cria Factura #002 → vinculada ao empresa_id_X
- Usuário A vê ambas as Facturas #001 e #002

## Executar a Migração

Para aplicar as mudanças na base de dados existente:

\`\`\`bash
# 1. Adicionar empresa_id às tabelas
Execute: scripts/017_add_empresa_id_to_tables.sql

# 2. Atualizar políticas RLS
Execute: scripts/018_update_rls_policies_empresa.sql

# 3. Criar funções auxiliares
Execute: scripts/019_create_helper_functions.sql
\`\`\`

## Importante

- Dados existentes serão automaticamente associados à empresa do proprietário
- Funcionários existentes precisam ter seu `empresa_id` preenchido
- Novos registros sempre incluem `empresa_id` automaticamente
- Apenas funcionários com `estado = 'ativo'` podem acessar os dados

## Segurança

As políticas RLS garantem que:
- Usuários só veem dados da sua empresa
- Funcionários inativos perdem acesso automaticamente
- Admins podem gerenciar funcionários
- Todos os funcionários ativos compartilham os mesmos dados da empresa
