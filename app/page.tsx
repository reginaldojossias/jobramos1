import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()

    if (data?.user) {
      redirect("/dashboard")
    } else {
      redirect("/login")
    }
  } catch (error) {
    redirect("/login")
  }
}
