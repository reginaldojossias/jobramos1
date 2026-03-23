-- Add new columns to empresas table
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS provincia text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS sector_actividade text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ramo_actividade text;
