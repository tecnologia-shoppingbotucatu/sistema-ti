'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import { Rights, type PermissionResource, type UserSession } from '@/lib/types'

interface UsePermissionsReturn {
  session: UserSession | null
  isLoading: boolean
  error: string | null
  hasRight: (resource: PermissionResource, right: number) => boolean
  hasAnyRight: (resource: PermissionResource, rights: number[]) => boolean
  hasAllRights: (resource: PermissionResource, rights: number[]) => boolean
  canRead: (resource: PermissionResource) => boolean
  canUpdate: (resource: PermissionResource) => boolean
  canCreate: (resource: PermissionResource) => boolean
  canDelete: (resource: PermissionResource) => boolean
  isInEntity: (entityId: string) => boolean
  refresh: () => Promise<void>
}

export function usePermissions(): UsePermissionsReturn {
  const [session, setSession] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPermissions = useCallback(async () => {
    const supabase = createClient()

    try {
      setIsLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setSession(null)
        return
      }

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error(`Erro ao carregar perfil: ${profileError.message}`)
      }

      // Get user roles with role and entity details
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(
          `
          id,
          user_id,
          role_id,
          entity_id,
          is_recursive,
          roles (
            id,
            name,
            interface,
            permissions
          )
        `
        )
        .eq('user_id', user.id)

      if (rolesError) {
        throw new Error(`Erro ao carregar permissões: ${rolesError.message}`)
      }

      // Aggregate permissions using bitwise OR
      const aggregatedPermissions: Record<string, number> = {}
      const entities: string[] = []
      let selectedInterface: 'central' | 'helpdesk' = 'helpdesk'

      userRoles?.forEach((ur) => {
        // Collect entities
        if (ur.entity_id && !entities.includes(ur.entity_id)) {
          entities.push(ur.entity_id)
        }

        // Merge permissions
        const rolePermissions = (ur.roles as { permissions?: Record<string, number> })?.permissions || {}
        Object.entries(rolePermissions).forEach(([key, value]) => {
          aggregatedPermissions[key] = (aggregatedPermissions[key] || 0) | value
        })

        // Upgrade interface if any role has 'central'
        if ((ur.roles as { interface?: string })?.interface === 'central') {
          selectedInterface = 'central'
        }
      })

      setSession({
        user_id: user.id,
        profile,
        entities,
        active_entity: profile.default_entity_id || entities[0] || null,
        permissions: aggregatedPermissions as Record<PermissionResource, number>,
        interface: selectedInterface,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPermissions()

    // Listen for auth changes
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (authSession) {
        loadPermissions()
      } else {
        setSession(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadPermissions])

  // Check if user has a specific right (bitwise)
  const hasRight = useCallback(
    (resource: PermissionResource, right: number): boolean => {
      if (!session) return false
      const permission = session.permissions[resource] || 0
      return (permission & right) > 0
    },
    [session]
  )

  // Check if user has any of the given rights
  const hasAnyRight = useCallback(
    (resource: PermissionResource, rights: number[]): boolean => {
      return rights.some((right) => hasRight(resource, right))
    },
    [hasRight]
  )

  // Check if user has all of the given rights
  const hasAllRights = useCallback(
    (resource: PermissionResource, rights: number[]): boolean => {
      return rights.every((right) => hasRight(resource, right))
    },
    [hasRight]
  )

  // Convenience methods
  const canRead = useCallback(
    (resource: PermissionResource) => hasRight(resource, Rights.READ),
    [hasRight]
  )

  const canUpdate = useCallback(
    (resource: PermissionResource) => hasRight(resource, Rights.UPDATE),
    [hasRight]
  )

  const canCreate = useCallback(
    (resource: PermissionResource) => hasRight(resource, Rights.CREATE),
    [hasRight]
  )

  const canDelete = useCallback(
    (resource: PermissionResource) => hasRight(resource, Rights.DELETE),
    [hasRight]
  )

  // Check if user has access to an entity
  const isInEntity = useCallback(
    (entityId: string): boolean => {
      if (!session) return false
      return session.entities.includes(entityId)
    },
    [session]
  )

  return {
    session,
    isLoading,
    error,
    hasRight,
    hasAnyRight,
    hasAllRights,
    canRead,
    canUpdate,
    canCreate,
    canDelete,
    isInEntity,
    refresh: loadPermissions,
  }
}

// Export Rights constant for convenience
export { Rights }
