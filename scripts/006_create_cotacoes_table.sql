-- Tabela de cotações
CREATE TABLE IF NOT EXISTS public.cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  validade DATE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  iva DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado TEXT DEFAULT 'Pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cotacoes_select_own" ON public.cotacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cotacoes_insert_own" ON public.cotacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cotacoes_update_own" ON public.cotacoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cotacoes_delete_own" ON public.cotacoes FOR DELETE USING (auth.uid() = user_id);

-- Tabela de itens da cotação
CREATE TABLE IF NOT EXISTS public.cotacao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id UUID NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.cotacao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cotacao_itens_select" ON public.cotacao_itens FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.cotacoes WHERE id = cotacao_itens.cotacao_id AND user_id = auth.uid())
);
CREATE POLICY "cotacao_itens_insert" ON public.cotacao_itens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.cotacoes WHERE id = cotacao_itens.cotacao_id AND user_id = auth.uid())
);
CREATE POLICY "cotacao_itens_update" ON public.cotacao_itens FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.cotacoes WHERE id = cotacao_itens.cotacao_id AND user_id = auth.uid())
);
CREATE POLICY "cotacao_itens_delete" ON public.cotacao_itens FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.cotacoes WHERE id = cotacao_itens.cotacao_id AND user_id = auth.uid())
);
