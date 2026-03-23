-- Add permissoes column to funcionarios table
-- This column stores granular permissions per module

ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS permissoes jsonb DEFAULT '{
  "facturas": "editar",
  "recibos": "editar",
  "despesas": "editar",
  "cotacoes": "editar",
  "clientes": "editar",
  "produtos": "editar",
  "fornecedores": "editar",
  "cartas": "editar",
  "funcionarios": "sem_acesso",
  "salarios": "sem_acesso",
  "conciliacao": "sem_acesso",
  "relatorios": "visualizar",
  "logs": "sem_acesso",
  "configuracoes": "sem_acesso"
}'::jsonb;

-- Update existing admin funcionarios to have full access
UPDATE funcionarios 
SET permissoes = '{
  "facturas": "editar",
  "recibos": "editar",
  "despesas": "editar",
  "cotacoes": "editar",
  "clientes": "editar",
  "produtos": "editar",
  "fornecedores": "editar",
  "cartas": "editar",
  "funcionarios": "editar",
  "salarios": "editar",
  "conciliacao": "editar",
  "relatorios": "editar",
  "logs": "editar",
  "configuracoes": "editar"
}'::jsonb
WHERE nivel_acesso = 'admin';
