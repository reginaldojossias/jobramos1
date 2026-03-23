import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/dashboard/header"
import { ClientesClient } from "@/components/clientes/clientes-client"

export default async function ClientesPage() {
  const supabase = await createClient()

  const { data: clientes } = await supabase.from("clientes").select("*").order("created_at", { ascending: false })

  return (
    <div>
      <Header title="Clientes" subtitle="Gestão de clientes" />
      <ClientesClient clientes={clientes || []} />
    </div>
  )
}
