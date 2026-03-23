-- Adicionar coluna conta_bancaria_id às tabelas para rastreio financeiro

-- Recibos: rastrear para qual conta o valor foi depositado
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recibos' AND column_name = 'conta_bancaria_id') THEN
    ALTER TABLE recibos ADD COLUMN conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Despesas: rastrear de qual conta o valor foi retirado  
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'despesas' AND column_name = 'conta_bancaria_id') THEN
    ALTER TABLE despesas ADD COLUMN conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;
  END IF;
END $$;
