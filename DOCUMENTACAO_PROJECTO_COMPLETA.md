# Magic Pro Services - Documentacao Tecnica Completa

## Sistema ERP de Gestao Empresarial

**Versao:** 1.0
**Data:** Fevereiro 2026
**Contexto:** Sistema de gestao empresarial desenvolvido para o mercado mocambicano

---

## INDICE

1. [Visao Geral](#1-visao-geral)
2. [Stack Tecnologica](#2-stack-tecnologica)
3. [Variaveis de Ambiente](#3-variaveis-de-ambiente)
4. [Estrutura de Ficheiros](#4-estrutura-de-ficheiros)
5. [Base de Dados - Schema Completo](#5-base-de-dados---schema-completo)
6. [Funcoes PostgreSQL (RPC)](#6-funcoes-postgresql-rpc)
7. [Triggers Automaticos](#7-triggers-automaticos)
8. [Politicas RLS (Row Level Security)](#8-politicas-rls-row-level-security)
9. [Sistema de Autenticacao](#9-sistema-de-autenticacao)
10. [Modulos do Sistema](#10-modulos-do-sistema)
11. [API Routes](#11-api-routes)
12. [Componentes Principais](#12-componentes-principais)
13. [Seguranca e Auditoria](#13-seguranca-e-auditoria)
14. [Como Reproduzir Este Projecto](#14-como-reproduzir-este-projecto)

---

## 1. Visao Geral

O **Magic Pro Services** e um sistema ERP (Enterprise Resource Planning) completo construido para gestao empresarial. Foi desenhado especificamente para o mercado mocambicano, com suporte para:

- NUIT (Numero Unico de Identificacao Tributaria)
- Moeda MZN (Metical mocambicano)
- IVA (Imposto sobre Valor Acrescentado)
- Terminologia e interface em portugues (PT-MZ)

### Funcionalidades principais:
- Dashboard com estatisticas em tempo real
- Gestao de clientes, produtos e fornecedores
- Facturacao com numeracao automatica e calculo de IVA
- Cotacoes/orcamentos com aprovacao de diretor geral
- Cartas de interpelacao/cobranca com geracao de PDF
- Gestao de funcionarios com niveis de acesso
- Upload e gestao de documentos digitalizados
- Envio de emails com historico
- Relatorios e estatisticas
- Logs de auditoria imutaveis
- Configuracoes da empresa

### Modelo Multi-Utilizador:
- Todos os funcionarios pertencem a mesma empresa (Magic Pro Services)
- Isolamento total de dados por empresa via RLS
- Niveis de acesso: "admin" e "funcionario"
- Estados de funcionario: "ativo", "inativo", "pendente"

---

## 2. Stack Tecnologica

### Frontend
| Tecnologia | Versao | Uso |
|---|---|---|
| Next.js | 16 | Framework React com App Router |
| React | 19.2 | Biblioteca de UI |
| TypeScript | 5.x | Tipagem estatica |
| Tailwind CSS | 4.x | Estilos utilitarios |
| shadcn/ui | Ultimo | Componentes de UI (50+ componentes) |
| Lucide React | Ultimo | Icones |
| next-themes | Ultimo | Tema claro/escuro |

### Backend
| Tecnologia | Uso |
|---|---|
| Supabase | Base de dados PostgreSQL + Auth + Storage |
| Backblaze B2 | Armazenamento de ficheiros (documentos) |
| Nodemailer | Envio de emails via SMTP |
| jsPDF | Geracao de documentos PDF |

### Bibliotecas Adicionais
| Biblioteca | Uso |
|---|---|
| react-hook-form | Gestao de formularios |
| zod | Validacao de dados |
| swr | Data fetching e cache |
| date-fns | Manipulacao de datas |
| recharts | Graficos e visualizacoes |
| @aws-sdk/client-s3 | Interaccao com Backblaze B2 (compativel S3) |

### Instalacao de dependencias (package.json)
```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.x",
    "@aws-sdk/s3-request-presigner": "^3.x",
    "@hookform/resolvers": "^3.x",
    "@supabase/ssr": "^0.5.x",
    "@supabase/supabase-js": "^2.x",
    "date-fns": "^4.x",
    "jspdf": "^2.x",
    "jspdf-autotable": "^3.x",
    "lucide-react": "^0.473.x",
    "next": "16.x",
    "next-themes": "^0.4.x",
    "nodemailer": "^6.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "react-hook-form": "^7.x",
    "recharts": "^2.x",
    "sonner": "^1.x",
    "swr": "^2.x",
    "zod": "^3.x"
  }
}
```

---

## 3. Variaveis de Ambiente

As seguintes variaveis de ambiente sao necessarias:

### Supabase (obrigatorio)
```env
NEXT_PUBLIC_SUPABASE_URL=https://seuprojectosupabase.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backblaze B2 - Armazenamento de Documentos (obrigatorio para upload de ficheiros)
```env
B2_KEY_ID=seuKeyId
B2_APPLICATION_KEY=seuApplicationKey
B2_BUCKET_NAME=seuBucketName
B2_BUCKET_ID=seuBucketId
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_REGION=us-west-004
```

### SMTP - Envio de Emails (obrigatorio para funcionalidade de email)
```env
SMTP_HOST=smtp.seuservidor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seuemail@dominio.com
SMTP_PASS=suapassword
SMTP_FROM=seuemail@dominio.com
```

---

## 4. Estrutura de Ficheiros

```
magic-pro-services/
|
|-- app/                              # Next.js App Router
|   |-- globals.css                   # Estilos globais (Tailwind v4 + tema)
|   |-- layout.tsx                    # Layout raiz (fontes, metadata, providers)
|   |-- page.tsx                      # Pagina inicial (redirect para /login)
|   |
|   |-- login/
|   |   |-- page.tsx                  # Pagina de login
|   |   |-- loading.tsx               # Loading state
|   |
|   |-- registar/
|   |   |-- page.tsx                  # Registo de novos funcionarios
|   |   |-- sucesso/page.tsx          # Confirmacao de registo
|   |
|   |-- pendente/
|   |   |-- page.tsx                  # Pagina de aprovacao pendente
|   |
|   |-- dashboard/
|   |   |-- layout.tsx                # Layout com sidebar + header
|   |   |-- page.tsx                  # Dashboard principal (estatisticas)
|   |   |-- clientes/page.tsx         # Pagina de clientes
|   |   |-- produtos/page.tsx         # Pagina de produtos
|   |   |-- fornecedores/page.tsx     # Pagina de fornecedores
|   |   |-- facturas/page.tsx         # Pagina de facturas
|   |   |-- cotacoes/page.tsx         # Pagina de cotacoes
|   |   |-- cartas/page.tsx           # Pagina de cartas
|   |   |-- funcionarios/page.tsx     # Pagina de funcionarios (admin)
|   |   |-- emails/page.tsx           # Historico de emails enviados
|   |   |-- relatorios/page.tsx       # Relatorios + Auditoria
|   |   |-- configuracoes/page.tsx    # Configuracoes da empresa
|   |
|   |-- api/
|       |-- auth/logout/route.ts      # API de logout
|       |-- send-email/route.ts       # API de envio de emails
|       |-- cartas/generate-pdf/route.ts  # Geracao de PDF de cartas
|       |-- documentos/
|           |-- upload/route.ts       # Upload de documentos
|           |-- download/[id]/route.ts # Download de documentos
|           |-- delete/[id]/route.ts  # Eliminacao de documentos
|           |-- confirm/route.ts      # Confirmacao de upload
|           |-- presign/route.ts      # URLs pre-assinadas
|           |-- get-upload-url/route.ts # Obter URL de upload
|
|-- components/
|   |-- dashboard/
|   |   |-- sidebar.tsx               # Menu lateral de navegacao
|   |   |-- header.tsx                # Cabecalho de cada pagina
|   |
|   |-- clientes/
|   |   |-- clientes-client.tsx       # CRUD completo de clientes
|   |
|   |-- produtos/
|   |   |-- produtos-client.tsx       # CRUD completo de produtos
|   |
|   |-- fornecedores/
|   |   |-- fornecedores-client.tsx   # CRUD completo de fornecedores
|   |
|   |-- facturas/
|   |   |-- facturas-client.tsx       # Facturacao (criar, editar, imprimir)
|   |
|   |-- cotacoes/
|   |   |-- cotacoes-client.tsx       # Cotacoes (criar, editar, imprimir)
|   |   |-- cotacao-print.tsx         # Template de impressao de cotacao
|   |
|   |-- cartas/
|   |   |-- cartas-client.tsx         # Gestao de cartas
|   |   |-- carta-template.tsx        # Template de carta
|   |   |-- carta-print.tsx           # Template de impressao
|   |
|   |-- funcionarios/
|   |   |-- funcionarios-client.tsx   # Gestao de funcionarios (admin)
|   |
|   |-- emails/
|   |   |-- emails-client.tsx         # Historico de emails
|   |
|   |-- relatorios/
|   |   |-- relatorios-client.tsx     # Relatorios + Auditoria
|   |
|   |-- configuracoes/
|   |   |-- configuracoes-client.tsx  # Configuracoes da empresa
|   |
|   |-- shared/
|   |   |-- documento-upload.tsx      # Componente reutilizavel de upload
|   |   |-- email-dialog.tsx          # Dialogo de envio de email
|   |
|   |-- theme-provider.tsx            # Provider de tema claro/escuro
|   |-- ui/                           # 50+ componentes shadcn/ui
|
|-- lib/
|   |-- supabase/
|   |   |-- client.ts                 # Cliente Supabase (browser)
|   |   |-- server.ts                 # Cliente Supabase (server-side)
|   |   |-- proxy.ts                  # Middleware de proxy Supabase
|   |
|   |-- backblaze-b2.ts              # Configuracao Backblaze B2/S3
|   |-- empresa.ts                    # Utilitario para obter empresa_id
|   |-- types.ts                      # Tipos TypeScript
|   |-- utils.ts                      # Utilitarios gerais (cn, etc.)
|
|-- proxy.ts                          # Middleware Next.js (proteccao de rotas)
|
|-- scripts/                          # Scripts SQL de migracao
|   |-- 001 a 023                     # 23 scripts de migracao sequenciais
|
|-- public/
    |-- images/                       # Logos e imagens da marca
    |-- icon.svg, apple-icon.png      # Favicons
```

---

## 5. Base de Dados - Schema Completo

### 5.1 Tabela: empresas
Armazena os dados da empresa.
```sql
CREATE TABLE empresas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,                -- ID do dono da empresa (Supabase Auth)
  nome text NOT NULL,                    -- Nome da empresa
  nuit text,                             -- NUIT (Numero Unico de Identificacao Tributaria)
  endereco text,                         -- Endereco completo
  telefone text,                         -- Telefone principal
  email text,                            -- Email da empresa
  website text,                          -- Website
  cidade text,                           -- Cidade
  provincia text,                        -- Provincia
  sector_actividade text,                -- Sector de actividade
  ramo_actividade text,                  -- Ramo de actividade
  created_at timestamptz DEFAULT now()
);
```

### 5.2 Tabela: funcionarios
Utilizadores do sistema associados a uma empresa.
```sql
CREATE TABLE funcionarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,                          -- ID do Supabase Auth
  empresa_id uuid,                       -- FK para empresas
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  telefone text,
  telefone_alternativo text,
  cargo text,                            -- Ex: "Director", "Contabilista"
  data_nascimento date,
  data_admissao date,
  bi text,                               -- Bilhete de Identidade
  nuit text,                             -- NUIT pessoal
  salario_base numeric,
  inss text,                             -- Numero do INSS
  endereco text,
  nivel_academico text,                  -- Ex: "Licenciatura", "Mestrado"
  instituicao_ensino text,
  doenca_cronica boolean DEFAULT false,
  descricao text,
  nivel_acesso text DEFAULT 'funcionario', -- 'admin' ou 'funcionario'
  estado text DEFAULT 'pendente',        -- 'ativo', 'inativo', 'pendente'
  ultimo_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 5.3 Tabela: clientes
```sql
CREATE TABLE clientes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  empresa_id uuid,
  nome text NOT NULL,
  nuit text,                             -- NUIT do cliente
  endereco text,
  telefone text,
  email text,
  created_at timestamptz DEFAULT now()
);
```

### 5.4 Tabela: produtos
```sql
CREATE TABLE produtos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  empresa_id uuid,
  nome text NOT NULL,
  descricao text,
  preco numeric NOT NULL,                -- Preco em MZN
  stock integer DEFAULT 0,
  unidade text,                          -- Ex: "un", "kg", "m"
  created_at timestamptz DEFAULT now()
);
```

### 5.5 Tabela: fornecedores
```sql
CREATE TABLE fornecedores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  empresa_id uuid,
  nome text NOT NULL,
  nuit text,
  endereco text,
  telefone text,
  email text,
  created_at timestamptz DEFAULT now()
);
```

### 5.6 Tabela: facturas
```sql
CREATE TABLE facturas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  empresa_id uuid,
  numero text NOT NULL,                  -- Numero da factura (ex: "FT-001")
  cliente_id uuid,                       -- FK para clientes
  data date NOT NULL,
  subtotal numeric NOT NULL,
  iva numeric NOT NULL,                  -- Valor do IVA
  total numeric NOT NULL,
  estado text DEFAULT 'rascunho',        -- 'rascunho', 'emitida', 'paga', 'cancelada'
  criado_por uuid,                       -- FK para funcionarios.user_id
  criado_por_funcionario_id uuid,        -- FK para funcionarios.id
  created_at timestamptz DEFAULT now()
);
```

### 5.7 Tabela: factura_itens
```sql
CREATE TABLE factura_itens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id uuid NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  produto_id uuid,                       -- FK para produtos
  descricao text NOT NULL,
  quantidade integer NOT NULL,
  preco_unitario numeric NOT NULL,
  total numeric NOT NULL                 -- quantidade * preco_unitario
);
```

### 5.8 Tabela: cotacoes
```sql
CREATE TABLE cotacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  empresa_id uuid,
  numero text NOT NULL,                  -- Numero da cotacao (ex: "CT-001")
  cliente_id uuid,
  data date NOT NULL,
  validade date,                         -- Data de validade da cotacao
  subtotal numeric NOT NULL,
  iva numeric NOT NULL,
  total numeric NOT NULL,
  estado text DEFAULT 'rascunho',        -- 'rascunho', 'enviada', 'aprovada', 'rejeitada'
  notas text,                            -- Observacoes
  diretor_geral uuid,                   -- FK para funcionarios (quem aprova)
  criado_por uuid,
  criado_por_funcionario_id uuid,
  created_at timestamptz DEFAULT now()
);
```

### 5.9 Tabela: cotacao_itens
```sql
CREATE TABLE cotacao_itens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id uuid NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
  produto_id uuid,
  descricao text NOT NULL,
  quantidade integer NOT NULL,
  preco_unitario numeric NOT NULL,
  total numeric NOT NULL
);
```

### 5.10 Tabela: cartas
Cartas de interpelacao/cobranca.
```sql
CREATE TABLE cartas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  empresa_id uuid,
  entidade_destinataria text NOT NULL,   -- Quem recebe a carta
  numero_contrato text NOT NULL,
  data_contrato date,
  valor_total numeric,                   -- Valor em divida
  prazo_dias integer,                    -- Prazo para pagamento
  local text,                            -- Local da carta
  data_carta date NOT NULL,
  nome_advogado text,
  cp_advogado text,                      -- Cedula profissional
  titulo text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 5.11 Tabela: emails_enviados
Historico de todos os emails enviados pelo sistema.
```sql
CREATE TABLE emails_enviados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid,
  destinatario text NOT NULL,
  cc text,
  assunto text NOT NULL,
  corpo text,
  tipo_documento text,                   -- 'factura', 'cotacao', 'carta'
  documento_id uuid,
  documento_numero text,
  enviado_por uuid,                      -- user_id de quem enviou
  enviado_por_nome text,
  enviado_por_email text,
  status text DEFAULT 'enviado',         -- 'enviado', 'erro'
  erro_mensagem text,
  created_at timestamptz DEFAULT now()
);
```

### 5.12 Tabela: documentos_digitalizados
Ficheiros carregados no sistema.
```sql
CREATE TABLE documentos_digitalizados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  empresa_id uuid,
  tipo_documento varchar NOT NULL,       -- 'factura', 'cotacao', 'carta', etc.
  documento_id uuid NOT NULL,            -- ID do documento associado
  file_key text NOT NULL,                -- Chave no Backblaze B2
  file_name text NOT NULL,               -- Nome original do ficheiro
  file_size integer NOT NULL,            -- Tamanho em bytes
  content_type varchar NOT NULL,         -- MIME type
  descricao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 5.13 Tabela: audit_logs (IMUTAVEL)
Registos de auditoria automaticos. Nao pode ser editada nem eliminada.
```sql
CREATE TABLE audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela text NOT NULL,                  -- Nome da tabela afectada
  acao text NOT NULL,                    -- 'INSERT', 'UPDATE', 'DELETE'
  registro_id uuid,                      -- ID do registo afectado
  user_id uuid,                          -- Quem fez a accao
  user_email text,                       -- Email de quem fez
  user_nome text,                        -- Nome de quem fez
  empresa_id uuid,                       -- Empresa do utilizador
  dados_anteriores jsonb,                -- Dados ANTES da alteracao
  dados_novos jsonb,                     -- Dados DEPOIS da alteracao
  campos_alterados text[],               -- Lista de campos que mudaram
  ip_address text,
  descricao text,                        -- Descricao legivel da accao
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indices para performance
CREATE INDEX idx_audit_logs_empresa ON audit_logs(empresa_id);
CREATE INDEX idx_audit_logs_tabela ON audit_logs(tabela);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_acao ON audit_logs(acao);
```

---

## 6. Funcoes PostgreSQL (RPC)

### 6.1 get_user_empresa_id()
Retorna o empresa_id do utilizador autenticado. Usada nas RLS policies.
```sql
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
DECLARE v_empresa_id UUID;
BEGIN
  -- Primeiro: dono da empresa
  SELECT id INTO v_empresa_id FROM empresas WHERE user_id = auth.uid() LIMIT 1;
  -- Fallback: funcionario activo
  IF v_empresa_id IS NULL THEN
    SELECT empresa_id INTO v_empresa_id FROM funcionarios
    WHERE user_id = auth.uid() AND estado = 'ativo' LIMIT 1;
  END IF;
  RETURN v_empresa_id;
END;
$$;
```

### 6.2 get_magic_pro_empresa_id()
Retorna o ID da empresa Magic Pro Services. Usada durante o registo de novos funcionarios (contorna RLS).
```sql
CREATE OR REPLACE FUNCTION get_magic_pro_empresa_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER STABLE
AS $$
  SELECT id FROM empresas WHERE nome = 'Magic Pro Services'
  ORDER BY created_at ASC LIMIT 1;
$$;
```

### 6.3 get_empresa_id_from_user(p_user_id UUID)
Versao parametrizada da funcao anterior.
```sql
CREATE OR REPLACE FUNCTION get_empresa_id_from_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_empresa_id UUID;
BEGIN
  SELECT id INTO v_empresa_id FROM empresas WHERE user_id = p_user_id LIMIT 1;
  IF v_empresa_id IS NULL THEN
    SELECT empresa_id INTO v_empresa_id FROM funcionarios
    WHERE user_id = p_user_id AND estado = 'ativo' LIMIT 1;
  END IF;
  RETURN v_empresa_id;
END;
$$;
```

### 6.4 fn_audit_trigger()
Funcao de trigger que regista automaticamente todas as accoes (INSERT/UPDATE/DELETE) na tabela audit_logs.
```sql
-- Captura: quem fez (user_id, nome, email), o que fez (INSERT/UPDATE/DELETE),
-- dados anteriores, dados novos, campos alterados, e descricao legivel.
-- Ver seccao 7 para detalhes completos.
```

### 6.5 set_documento_empresa_id()
Trigger que define automaticamente o empresa_id ao inserir documentos digitalizados.

### 6.6 update_documentos_digitalizados_updated_at()
Trigger que actualiza o campo updated_at ao editar documentos.

---

## 7. Triggers Automaticos

### 7.1 Trigger de Auditoria
Aplicado em TODAS as 12 tabelas criticas. Regista INSERT, UPDATE e DELETE.

| Tabela | Trigger |
|---|---|
| facturas | trg_audit_facturas |
| factura_itens | trg_audit_factura_itens |
| cotacoes | trg_audit_cotacoes |
| cotacao_itens | trg_audit_cotacao_itens |
| clientes | trg_audit_clientes |
| produtos | trg_audit_produtos |
| fornecedores | trg_audit_fornecedores |
| funcionarios | trg_audit_funcionarios |
| cartas | trg_audit_cartas |
| empresas | trg_audit_empresas |
| documentos_digitalizados | trg_audit_documentos |
| emails_enviados | trg_audit_emails |

### 7.2 Trigger de Documentos
| Trigger | Tabela | Evento | Funcao |
|---|---|---|---|
| trigger_set_documento_empresa_id | documentos_digitalizados | INSERT | set_documento_empresa_id() |
| trigger_documentos_digitalizados_updated_at | documentos_digitalizados | UPDATE | update_documentos_digitalizados_updated_at() |

---

## 8. Politicas RLS (Row Level Security)

RLS esta activado em TODAS as tabelas. Cada tabela tem politicas que garantem isolamento por empresa.

### Principio geral:
- **SELECT**: Funcionarios activos da mesma empresa podem ver todos os registos da empresa
- **INSERT**: Utilizadores autenticados podem criar registos
- **UPDATE**: Funcionarios da mesma empresa podem editar
- **DELETE**: Apenas admins/donos da empresa podem eliminar

### Politicas por tabela:

| Tabela | Politicas |
|---|---|
| empresas | SELECT/INSERT/UPDATE/DELETE proprio |
| funcionarios | SELECT (mesma empresa), INSERT (autenticado), UPDATE (mesma empresa), DELETE (admin) |
| clientes | ALL (mesma empresa) |
| produtos | ALL (mesma empresa) |
| fornecedores | ALL (mesma empresa) |
| facturas | ALL (mesma empresa) |
| factura_itens | SELECT/INSERT/UPDATE/DELETE (via factura da mesma empresa) |
| cotacoes | ALL (mesma empresa) |
| cotacao_itens | SELECT/INSERT/UPDATE/DELETE (via cotacao da mesma empresa) |
| cartas | SELECT/INSERT/UPDATE/DELETE (mesma empresa) |
| emails_enviados | SELECT/INSERT (mesma empresa) |
| documentos_digitalizados | ALL (mesma empresa) |
| audit_logs | SELECT apenas (IMUTAVEL - sem UPDATE/DELETE) |

---

## 9. Sistema de Autenticacao

### Fluxo de Login:
1. Utilizador insere email e password em `/login`
2. Supabase Auth valida as credenciais (`signInWithPassword`)
3. Sistema busca o funcionario na tabela `funcionarios` pelo `user_id`
4. Se `estado = 'ativo'` -> redireciona para `/dashboard`
5. Se `estado = 'pendente'` -> redireciona para `/pendente`
6. Actualiza `ultimo_login` do funcionario

### Fluxo de Registo:
1. Novo utilizador preenche nome, email, password e cargo em `/registar`
2. Cria conta no Supabase Auth (`signUp`)
3. Busca o empresa_id via RPC `get_magic_pro_empresa_id()` (contorna RLS)
4. Cria registo na tabela `funcionarios` com `estado = 'pendente'`
5. Redireciona para `/registar/sucesso`
6. Admin deve activar o funcionario (`estado = 'ativo'`) na pagina de funcionarios

### Proteccao de Rotas (proxy.ts / middleware):
- Rotas `/dashboard/*` exigem autenticacao
- Utilizadores nao autenticados sao redirecionados para `/login`
- Utiliza `@supabase/ssr` para gestao de cookies de sessao

### Niveis de Acesso:
- **admin**: Acesso total, pode gerir funcionarios, eliminar registos
- **funcionario**: Acesso a todas as funcionalidades excepto gestao de funcionarios

---

## 10. Modulos do Sistema

### 10.1 Dashboard (/)
- Saudacao com nome da empresa
- Data actual em portugues
- 4 cards de resumo: Facturas do Mes, Clientes Activos, Produtos em Stock, Receita do Mes
- Actividade Recente: ultimas 5 facturas e cotacoes combinadas por data
- Card "A Sua Empresa" com dados resumidos

### 10.2 Clientes (/dashboard/clientes)
- Listagem com pesquisa por nome/email/NUIT
- Criar, editar e eliminar clientes
- Campos: nome, NUIT, endereco, telefone, email

### 10.3 Produtos (/dashboard/produtos)
- Listagem com pesquisa por nome
- Criar, editar e eliminar produtos
- Campos: nome, descricao, preco (MZN), stock, unidade

### 10.4 Fornecedores (/dashboard/fornecedores)
- Listagem com pesquisa
- Criar, editar e eliminar fornecedores
- Campos: nome, NUIT, endereco, telefone, email

### 10.5 Facturas (/dashboard/facturas)
- Listagem com filtro por estado
- Criar factura com multiplos itens (seleccionar produtos ou inserir manualmente)
- Calculo automatico de subtotal, IVA e total
- Estados: rascunho, emitida, paga, cancelada
- Impressao e envio por email
- Upload de documentos associados

### 10.6 Cotacoes (/dashboard/cotacoes)
- Listagem com filtro por estado
- Criar cotacao com multiplos itens
- Definir validade e notas
- Seleccionar diretor geral para aprovacao
- Estados: rascunho, enviada, aprovada, rejeitada
- Impressao e envio por email

### 10.7 Cartas (/dashboard/cartas)
- Cartas de interpelacao e cobranca
- Template profissional com dados da empresa
- Geracao de PDF via API
- Impressao com template formatado
- Campos: entidade, contrato, valores, prazos, advogado

### 10.8 Funcionarios (/dashboard/funcionarios) - ADMIN
- Apenas acessivel por admins
- Criar novos funcionarios (com empresa_id automatico)
- Editar dados pessoais e profissionais
- Activar/Desactivar funcionarios
- Alterar nivel de acesso
- Campos completos: dados pessoais, BI, NUIT, INSS, salario, formacao, saude

### 10.9 Emails Enviados (/dashboard/emails)
- Historico de todos os emails enviados pelo sistema
- Mostra: destinatario, assunto, tipo de documento, quem enviou, status, data

### 10.10 Relatorios (/dashboard/relatorios)
Duas abas:

**Aba Relatorios:**
- Cards de resumo (funcionarios, clientes, fornecedores, produtos, facturas, cotacoes)
- Receita total e analise de facturas por estado
- Tabelas de dados detalhados

**Aba Auditoria:**
- Cards: total de logs, criacoes, alteracoes, eliminacoes
- Filtros: pesquisa textual, filtro por tabela, filtro por tipo de accao
- Tabela detalhada: data/hora, utilizador, accao, tabela, descricao, campos alterados
- Logs imutaveis (nao podem ser editados ou eliminados)

### 10.11 Configuracoes (/dashboard/configuracoes)
- Editar dados da empresa: nome, NUIT, endereco, telefone, email
- Website, cidade, provincia
- Sector e ramo de actividade

---

## 11. API Routes

### POST /api/auth/logout
Termina a sessao do utilizador.

### POST /api/send-email
Envia email via SMTP (Nodemailer).
- Body: `{ to, cc, subject, html, documentType, documentId, documentNumber }`
- Regista na tabela `emails_enviados`

### POST /api/cartas/generate-pdf
Gera PDF de uma carta de interpelacao usando jsPDF.
- Body: dados da carta
- Retorna: PDF em base64

### POST /api/documentos/upload
Upload de ficheiros para Backblaze B2.
- Multipart form data com ficheiro
- Regista na tabela `documentos_digitalizados`

### GET /api/documentos/download/[id]
Download de documento por ID.
- Gera URL pre-assinada do Backblaze B2

### DELETE /api/documentos/delete/[id]
Elimina documento do Backblaze B2 e da base de dados.

### POST /api/documentos/confirm
Confirma upload de documento.

### POST /api/documentos/presign
Gera URL pre-assinada para upload directo.

### POST /api/documentos/get-upload-url
Obtem URL de upload para Backblaze B2.

---

## 12. Componentes Principais

### Sidebar (components/dashboard/sidebar.tsx)
- Menu lateral fixo com navegacao
- Links: Inicio, Facturas, Cotacoes, Clientes, Produtos, Fornecedores, Cartas, Emails, Funcionarios (admin), Relatorios, Configuracoes
- Botao "Sair do Sistema"
- Logo Magic Pro Services
- Versao do sistema

### Header (components/dashboard/header.tsx)
- Titulo e subtitulo de cada pagina
- Reutilizavel via props

### Componentes Client (*-client.tsx)
Cada modulo tem um componente client que contem:
- Estado local (useState)
- Formularios com validacao
- Operacoes CRUD (Supabase client-side)
- Dialogos modais para criar/editar
- Tabelas com pesquisa e filtros
- Accoes: ver, editar, eliminar, imprimir, enviar email

---

## 13. Seguranca e Auditoria

### 13.1 Encriptacao
- **Em transito**: Todo o trafego e via HTTPS (Supabase + Vercel)
- **Em repouso**: Supabase encripta dados em repouso com AES-256
- **Passwords**: Geridas pelo Supabase Auth (bcrypt)
- **Tokens JWT**: Sessoes geridas via cookies HTTP-only

### 13.2 Row Level Security (RLS)
- Activado em TODAS as tabelas
- Isolamento total por empresa_id
- Funcoes SECURITY DEFINER para operacoes privilegiadas
- Sem acesso directo ao banco - tudo via Supabase client

### 13.3 Niveis de Acesso
- Admin: gestao completa
- Funcionario: operacoes do dia-a-dia
- Pendente: sem acesso ao dashboard

### 13.4 Auditoria
- Triggers automaticos em 12 tabelas
- Regista: quem, quando, o que mudou, dados antes/depois
- Logs IMUTAVEIS (sem UPDATE/DELETE policy)
- Interface visual na aba Auditoria dos Relatorios

### 13.5 Middleware de Proteccao
- proxy.ts verifica autenticacao em todas as rotas /dashboard
- Redireccionamento automatico para /login se nao autenticado
- Refresh automatico de tokens JWT

---

## 14. Como Reproduzir Este Projecto

### Passo 1: Criar projecto
```bash
npx create-next-app@latest magic-pro-services --typescript --tailwind --app
cd magic-pro-services
```

### Passo 2: Instalar dependencias
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install react-hook-form @hookform/resolvers zod
npm install date-fns jspdf jspdf-autotable
npm install nodemailer swr recharts sonner next-themes lucide-react
npm install -D @types/nodemailer
```

### Passo 3: Instalar shadcn/ui
```bash
npx shadcn@latest init
npx shadcn@latest add accordion alert alert-dialog avatar badge breadcrumb button calendar card carousel chart checkbox collapsible command context-menu dialog drawer dropdown-menu form hover-card input input-otp label menubar navigation-menu pagination popover progress radio-group resizable scroll-area select separator sheet sidebar skeleton slider sonner switch table tabs textarea toast toggle toggle-group tooltip
```

### Passo 4: Criar projecto Supabase
1. Ir a https://supabase.com e criar novo projecto
2. Copiar URL e Anon Key para variaveis de ambiente
3. Activar Email Auth nas configuracoes

### Passo 5: Executar scripts SQL
Executar os scripts na seguinte ordem no SQL Editor do Supabase:

```
001_create_empresa_table.sql
002_create_clientes_table.sql
003_create_produtos_table.sql
004_create_fornecedores_table.sql
005_create_facturas_table.sql
006_create_cotacoes_table.sql
007_create_funcionarios_table.sql
008_create_cartas_table.sql
009_alter_funcionarios_add_columns.sql
010_alter_cotacoes_add_criado_por.sql
011_alter_facturas_add_criado_por.sql
012_alter_funcionarios_add_ultimo_login.sql
013_alter_empresas_add_columns.sql
014_create_emails_enviados_table.sql
015_alter_cotacoes_add_diretor_geral.sql
016_alter_cotacoes_add_notas.sql
017_add_empresa_id_to_tables.sql
017b_populate_empresa_id.sql
018_update_rls_policies_empresa.sql
019_create_helper_functions.sql
020_fix_funcionarios_rls_recursion.sql
021_master_fix_all.sql
022_create_documentos_digitalizados_table.sql
023_fix_empresa_duplicates.sql
```

E depois executar manualmente:
- Criar funcao `get_magic_pro_empresa_id()` (ver seccao 6.2)
- Criar funcao `fn_audit_trigger()` (ver seccao 6.4)
- Criar tabela `audit_logs` (ver seccao 5.13)
- Aplicar triggers de auditoria em todas as tabelas (ver seccao 7.1)
- Actualizar RLS policies dos funcionarios (ver seccao 8)

### Passo 6: Configurar Backblaze B2
1. Criar conta em https://www.backblaze.com/b2
2. Criar bucket
3. Gerar Application Key
4. Configurar variaveis de ambiente B2_*

### Passo 7: Configurar SMTP
1. Obter credenciais SMTP do seu provedor de email
2. Configurar variaveis de ambiente SMTP_*

### Passo 8: Criar empresa inicial
No SQL Editor do Supabase:
```sql
INSERT INTO empresas (user_id, nome, email) 
VALUES ('UUID_DO_PRIMEIRO_ADMIN', 'Magic Pro Services', 'admin@magicpro.co.mz');
```

### Passo 9: Deploy
```bash
# Vercel
npm i -g vercel
vercel

# Adicionar variaveis de ambiente no Vercel Dashboard
```

### Passo 10: Primeiro utilizador
1. Registar-se em /registar
2. No Supabase, alterar o estado do funcionario para 'ativo' e nivel_acesso para 'admin'
3. Fazer login e comecar a usar

---

## Diagramas de Relacoes

```
empresas (1) -----> (N) funcionarios
empresas (1) -----> (N) clientes
empresas (1) -----> (N) produtos
empresas (1) -----> (N) fornecedores
empresas (1) -----> (N) facturas
empresas (1) -----> (N) cotacoes
empresas (1) -----> (N) cartas
empresas (1) -----> (N) emails_enviados
empresas (1) -----> (N) documentos_digitalizados
empresas (1) -----> (N) audit_logs

facturas (1) -----> (N) factura_itens
cotacoes (1) -----> (N) cotacao_itens

clientes (1) -----> (N) facturas
clientes (1) -----> (N) cotacoes

funcionarios.user_id = auth.users.id
```

---

**Fim da Documentacao**

*Documento gerado em Fevereiro de 2026 para o projecto Magic Pro Services v1.0*
