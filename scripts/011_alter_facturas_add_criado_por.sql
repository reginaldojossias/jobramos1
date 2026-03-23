-- Adicionar coluna criado_por_funcionario_id para rastrear quem criou a fatura
ALTER TABLE public.facturas 
ADD COLUMN IF NOT EXISTS criado_por_funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL;

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_facturas_criado_por ON public.facturas(criado_por_funcionario_id);

-- Atualizar facturas existentes para associar ao funcionário baseado no user_id
UPDATE public.facturas f
SET criado_por_funcionario_id = func.id
FROM public.funcionarios func
WHERE f.user_id = func.user_id AND f.criado_por_funcionario_id IS NULL;
