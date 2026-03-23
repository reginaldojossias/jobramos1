-- Tabela da empresa (configurações)
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nuit TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresas_select_own" ON public.empresas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "empresas_insert_own" ON public.empresas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "empresas_update_own" ON public.empresas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "empresas_delete_own" ON public.empresas FOR DELETE USING (auth.uid() = user_id);
