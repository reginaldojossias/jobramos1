import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Image from "next/image"
import { Clock, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function PendentePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Verificar estado do funcionário
  const { data: funcionario } = await supabase
    .from("funcionarios")
    .select("estado, nome")
    .eq("user_id", user.id)
    .single()

  // Se já está ativo, redirecionar para dashboard
  if (funcionario?.estado === "ativo") {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Image src="/images/logo.png" alt="Magic Pro Services" width={80} height={80} className="object-contain" />
        </div>

        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10">
            <Clock className="h-10 w-10 text-yellow-500" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold">Conta Pendente</h1>
        <p className="mb-6 text-muted-foreground">
          Olá{funcionario?.nome ? `, ${funcionario.nome}` : ""}! A sua conta está a aguardar aprovação por um
          administrador.
        </p>

        <div className="rounded-lg border bg-card p-4 text-left">
          <p className="text-sm text-muted-foreground">
            Um administrador irá rever o seu registo em breve. Receberá uma notificação quando a sua conta for aprovada.
          </p>
        </div>

        <form action="/api/auth/logout" method="POST" className="mt-6">
          <Button variant="outline" type="submit" className="w-full bg-transparent">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </form>
      </div>
    </div>
  )
}
