-- Script para eliminar produtos duplicados mantendo apenas o mais antigo de cada nome
-- Usa ROW_NUMBER() porque MIN() não funciona com UUID

-- Eliminar duplicados usando ROW_NUMBER (mantém o mais antigo por created_at)
WITH ranked_produtos AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY empresa_id, LOWER(nome) ORDER BY created_at ASC) as rn
  FROM produtos
)
DELETE FROM produtos
WHERE id IN (
  SELECT id FROM ranked_produtos WHERE rn > 1
);
