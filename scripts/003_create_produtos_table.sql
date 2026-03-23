-- Tabela de produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INTEGER DEFAULT 0,
  unidade TEXT DEFAULT 'un',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_select_own" ON public.produtos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "produtos_insert_own" ON public.produtos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "produtos_update_own" ON public.produtos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "produtos_delete_own" ON public.produtos FOR DELETE USING (auth.uid() = user_id);
