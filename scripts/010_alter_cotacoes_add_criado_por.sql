-- Adicionar coluna criado_por_funcionario_id para rastrear quem criou a cotação
ALTER TABLE public.cotacoes 
ADD COLUMN IF NOT EXISTS criado_por_funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL;

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_cotacoes_criado_por ON public.cotacoes(criado_por_funcionario_id);

-- Atualizar cotações existentes para associar ao funcionário baseado no user_id
UPDATE public.cotacoes c
SET criado_por_funcionario_id = f.id
FROM public.funcionarios f
WHERE c.user_id = f.user_id AND c.criado_por_funcionario_id IS NULL;
