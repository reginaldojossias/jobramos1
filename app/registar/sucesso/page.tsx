import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle, Mail } from "lucide-react"

export default function RegistarSucessoPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-orange-400">
              <span className="text-xl font-bold text-white">MP</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Magic Pro</h1>
              <p className="text-xs text-muted-foreground">Services</p>
            </div>
          </div>

          {/* Card */}
          <div className="w-full rounded-lg border bg-card p-6 shadow-sm text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Conta Criada!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Verifique o seu email para confirmar a sua conta antes de entrar.
            </p>
            <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg mb-4">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Email de confirmação enviado</span>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Ir para Login</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
