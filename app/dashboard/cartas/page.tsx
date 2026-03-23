import { createClient } from "@/lib/supabase/server"
import { CartasClient } from "@/components/cartas/cartas-client"

export default async function CartasPage() {
  const supabase = await createClient()
  
  const { data: cartas } = await supabase
    .from("cartas")
    .select("*")
    .order("created_at", { ascending: false })

  return <CartasClient initialCartas={cartas || []} />
}
