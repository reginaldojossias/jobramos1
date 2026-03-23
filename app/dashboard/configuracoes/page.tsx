import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ConfiguracoesClient } from "@/components/configuracoes/configuracoes-client"
import { hasModuleAccess } from "@/lib/check-permission"

export default async function ConfiguracoesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: currentFuncionario } = await supabase
    .from("funcionarios")
    .select("nivel_acesso, permissoes")
    .eq("user_id", user.id)
    .maybeSingle()

  // Verificar se e dono da empresa
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  const isEmpresaOwner = !!empresa

  // Verificar permissao de acesso ao modulo configuracoes
  if (!hasModuleAccess(currentFuncionario, isEmpresaOwner, "configuracoes")) {
    redirect("/dashboard")
  }

  return <ConfiguracoesClient />
}
