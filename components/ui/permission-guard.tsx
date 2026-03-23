"use client"

import { usePermissions } from "@/components/dashboard/sidebar"
import type { Permissoes } from "@/components/funcionarios/permissions-editor"

interface PermissionGuardProps {
  module: keyof Permissoes
  action: "view" | "edit"
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Component that conditionally renders children based on user permissions.
 * Use this to hide/show buttons, forms, and other UI elements based on access level.
 * 
 * @example
 * // Hide the "New" button if user can't edit
 * <PermissionGuard module="facturas" action="edit">
 *   <Button>Nova Factura</Button>
 * </PermissionGuard>
 * 
 * // Show a message if user can't view
 * <PermissionGuard module="relatorios" action="view" fallback={<p>Sem acesso</p>}>
 *   <ReportsContent />
 * </PermissionGuard>
 */
export function PermissionGuard({ module, action, children, fallback = null }: PermissionGuardProps) {
  const { canView, canEdit, isLoading } = usePermissions()

  if (isLoading) {
    return null // Or a loading skeleton
  }

  if (action === "view" && !canView(module)) {
    return fallback
  }

  if (action === "edit" && !canEdit(module)) {
    return fallback
  }

  return <>{children}</>
}

/**
 * Hook to check permissions in component logic
 * 
 * @example
 * const { canEdit } = usePermissionCheck("facturas")
 * if (!canEdit) {
 *   // Disable button or hide form
 * }
 */
export function usePermissionCheck(module: keyof Permissoes) {
  const { canView, canEdit, isAdmin, isLoading } = usePermissions()
  
  return {
    canView: canView(module),
    canEdit: canEdit(module),
    isAdmin,
    isLoading,
  }
}
