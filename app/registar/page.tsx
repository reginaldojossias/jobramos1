"use client"

import type React from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export default function RegistarPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [nome, setNome] = useState("")
  const [cargo, setCargo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem")
      setIsLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            nome: nome,
            empresa: "Magic Pro Services",
            role: "funcionario",
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Check if funcionário already exists with this email
        const { data: existingFuncionario } = await supabase
          .from("funcionarios")
          .select("email")
          .eq("email", email)
          .single()

        if (!existingFuncionario) {
          // ID fixo da empresa Magic Pro Services
          const empresaId = "bd7a45c9-63f5-423e-91e5-37f48175dba5"

          // Criar o funcionário associado a empresa Magic Pro Services existente
          const { error: funcionarioError } = await supabase.from("funcionarios").insert({
            user_id: authData.user.id,
            empresa_id: empresaId,
            nome: nome,
            email: email,
            cargo: cargo || "Funcionário",
            nivel_acesso: "funcionario",
            estado: "pendente",
          })

          if (funcionarioError) {
            // Handle duplicate email error specifically
            if (funcionarioError.code === "23505") {
              setError("Este email já está registado. Por favor, utilize outro email.")
              setIsLoading(false)
              return
            }
            console.error("[v0] Erro ao criar funcionário:", funcionarioError.message)
            setError("Erro ao criar conta de funcionário. Por favor, tente novamente.")
            setIsLoading(false)
            return
          }
        }
      }

      router.push("/registar/sucesso")
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
            <Image src="/images/logo.png" alt="Magic Pro Services" width={48} height={48} className="h-12 w-12" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Magic Pro</h1>
              <p className="text-xs text-muted-foreground">Services</p>
            </div>
          </div>

          {/* Card */}
          <div className="w-full rounded-lg border bg-card p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Criar Conta</h2>
              <p className="text-sm text-muted-foreground">Registe-se como funcionário da Magic Pro Services</p>
            </div>

            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="O seu nome completo"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
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
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  type="text"
                  placeholder="Ex: Técnico, Vendedor, etc."
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
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
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar Palavra-passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />A criar conta...
                  </>
                ) : (
                  "Criar Conta"
                )}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/login" className="text-primary underline underline-offset-4">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
