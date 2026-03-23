-- Tabela de facturas
CREATE TABLE IF NOT EXISTS public.facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  iva DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado TEXT DEFAULT 'Pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facturas_select_own" ON public.facturas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "facturas_insert_own" ON public.facturas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "facturas_update_own" ON public.facturas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "facturas_delete_own" ON public.facturas FOR DELETE USING (auth.uid() = user_id);

-- Tabela de itens da factura
CREATE TABLE IF NOT EXISTS public.factura_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.factura_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factura_itens_select" ON public.factura_itens FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.facturas WHERE id = factura_itens.factura_id AND user_id = auth.uid())
);
CREATE POLICY "factura_itens_insert" ON public.factura_itens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.facturas WHERE id = factura_itens.factura_id AND user_id = auth.uid())
);
CREATE POLICY "factura_itens_update" ON public.factura_itens FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.facturas WHERE id = factura_itens.factura_id AND user_id = auth.uid())
);
CREATE POLICY "factura_itens_delete" ON public.factura_itens FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.facturas WHERE id = factura_itens.factura_id AND user_id = auth.uid())
);
