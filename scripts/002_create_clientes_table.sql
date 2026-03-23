-- Tabela de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nuit TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select_own" ON public.clientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clientes_insert_own" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clientes_update_own" ON public.clientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clientes_delete_own" ON public.clientes FOR DELETE USING (auth.uid() = user_id);
