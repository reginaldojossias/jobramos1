import { type Permissoes, ADMIN_PERMISSOES } from "@/components/funcionarios/permissions-editor"

type ModuloKey = keyof Permissoes

/**
 * Verifica se um funcionario tem acesso a um modulo especifico
 * @param funcionario - Dados do funcionario (nivel_acesso e permissoes)
 * @param modulo - Nome do modulo a verificar
 * @param requireEdit - Se true, verifica se tem permissao de edicao; se false, verifica apenas visualizacao
 * @returns boolean indicando se tem acesso
 */
export function hasModuleAccess(
  funcionario: { nivel_acesso: string; permissoes?: Permissoes | null } | null,
  isEmpresaOwner: boolean,
  modulo: ModuloKey,
  requireEdit: boolean = false
): boolean {
  // Donos de empresa tem acesso total
  if (isEmpresaOwner) {
    return true
  }

  // Se nao ha funcionario, sem acesso
  if (!funcionario) {
    return false
  }

  // Admins tem acesso total
  if (funcionario.nivel_acesso === "admin") {
    return true
  }

  // Verificar permissoes granulares
  const permissoes = funcionario.permissoes || null
  if (!permissoes) {
    return false
  }

  const moduloPermissao = permissoes[modulo]
  if (!moduloPermissao) {
    return false
  }

  if (requireEdit) {
    return moduloPermissao === "editar"
  }

  return moduloPermissao === "ver" || moduloPermissao === "editar"
}
