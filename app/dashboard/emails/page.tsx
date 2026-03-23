import { createClient } from "@/lib/supabase/server"
import { EmailsClient } from "@/components/emails/emails-client"

export default async function EmailsPage() {
  const supabase = await createClient()

  // Buscar emails enviados
  const { data: emails, error } = await supabase
    .from("emails_enviados")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Erro ao buscar emails:", error)
  }

  return <EmailsClient emails={emails || []} />
}
