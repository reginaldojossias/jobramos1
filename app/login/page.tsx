"use client"

import type React from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { logLogin } from "@/lib/audit-log"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam === "conta_inativa") {
      setError("A sua conta foi desativada. Contacte um administrador.")
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw authError

      if (authData.user) {
        const { data: funcionario } = await supabase
          .from("funcionarios")
          .select("id, estado")
          .eq("user_id", authData.user.id)
          .maybeSingle()

        if (!funcionario) {
          await supabase.auth.signOut()
          throw new Error("Funcionário não encontrado no sistema.")
        }

        if (funcionario.estado === "inativo") {
          await supabase.auth.signOut()
          throw new Error("A sua conta foi desativada. Contacte um administrador.")
        }

        if (funcionario.estado === "pendente") {
          router.push("/pendente")
          return
        }

        // Atualizar último login
        await supabase
          .from("funcionarios")
          .update({ ultimo_login: new Date().toISOString() })
          .eq("id", funcionario.id)

        // Registar log de login
        await logLogin()
      }

      router.push("/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocorreu um erro")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="Magic Pro Services" width={48} height={48} className="h-12 w-12 object-contain" loading="eager" priority />
            <div>
              <h1 className="text-xl font-bold text-foreground">Magic Pro</h1>
              <p className="text-xs text-muted-foreground">Services</p>
            </div>
          </div>

          <div className="w-full rounded-lg border bg-card p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Entrar</h2>
              <p className="text-sm text-muted-foreground">Aceda à sua conta para gerir a sua empresa</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Palavra-passe</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />A entrar...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link href="/registar" className="text-primary underline underline-offset-4">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
