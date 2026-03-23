import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('Starting migration...')
  
  // Add conta_bancaria_id to recibos if not exists
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recibos' AND column_name = 'conta_bancaria_id') THEN
          ALTER TABLE recibos ADD COLUMN conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `
  })
  
  if (error1) {
    console.log('Note: RPC exec_sql not available, columns may already exist or need manual creation')
    console.log('Error details:', error1.message)
  } else {
    console.log('Added conta_bancaria_id to recibos')
  }
  
  // Add conta_bancaria_id to despesas if not exists
  const { error: error2 } = await supabase.rpc('exec_sql', {
    sql: `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'despesas' AND column_name = 'conta_bancaria_id') THEN
          ALTER TABLE despesas ADD COLUMN conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `
  })
  
  if (error2) {
    console.log('Note: Column may already exist')
  } else {
    console.log('Added conta_bancaria_id to despesas')
  }
  
  console.log('Migration complete!')
  console.log('')
  console.log('If you see errors above, the columns may already exist or you need to run the SQL manually:')
  console.log('1. Go to your Supabase Dashboard > SQL Editor')
  console.log('2. Run the following SQL:')
  console.log(`
    ALTER TABLE recibos ADD COLUMN IF NOT EXISTS conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;
    ALTER TABLE despesas ADD COLUMN IF NOT EXISTS conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;
  `)
}

runMigration().catch(console.error)
