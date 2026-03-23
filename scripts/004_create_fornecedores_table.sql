-- Tabela de fornecedores
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nuit TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornecedores_select_own" ON public.fornecedores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fornecedores_insert_own" ON public.fornecedores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fornecedores_update_own" ON public.fornecedores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fornecedores_delete_own" ON public.fornecedores FOR DELETE USING (auth.uid() = user_id);
