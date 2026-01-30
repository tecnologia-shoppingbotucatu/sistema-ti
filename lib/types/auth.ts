// Auth & Permission Types

export interface Entity {
  id: string
  name: string
  completename: string
  parent_id: string | null
  level: number
  is_recursive: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  username: string
  realname: string | null
  firstname: string | null
  email: string | null
  phone: string | null
  language: string
  default_entity_id: string | null
  is_active: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  interface: 'central' | 'helpdesk'
  permissions: Record<string, number>
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  entity_id: string
  is_recursive: boolean
  role?: Role
  entity?: Entity
}

// Permission Rights (bitwise - same as GLPI)
export const Rights = {
  READ: 1,
  UPDATE: 2,
  CREATE: 4,
  DELETE: 8,
  PURGE: 16,
  READNOTE: 32,
  UPDATENOTE: 64,
  UNLOCK: 128,

  // ITIL specific
  READMY: 1,
  READALL: 1024,
  READGROUP: 2048,
  ASSIGN: 8192,
  SURVEY: 16384,
  VALIDATE_REQUEST: 32768,
  VALIDATE_INCIDENT: 65536,
  VALIDATE: 131072,

  // Compound rights
  ALL_STANDARD: 119, // READ|UPDATE|CREATE|DELETE|READNOTE|UPDATENOTE|UNLOCK
} as const

export type RightValue = (typeof Rights)[keyof typeof Rights]

// Resources that can have permissions
export type PermissionResource =
  | 'ticket'
  | 'change'
  | 'problem'
  | 'computer'
  | 'monitor'
  | 'printer'
  | 'peripheral'
  | 'phone'
  | 'networkequipment'
  | 'software'
  | 'document'
  | 'user'
  | 'group'
  | 'entity'
  | 'profile'
  | 'config'
  | 'logs'
  | 'backup'

// User session with computed permissions
export interface UserSession {
  user_id: string
  profile: Profile
  entities: string[]
  active_entity: string | null
  permissions: Record<PermissionResource, number>
  interface: 'central' | 'helpdesk'
}

// Helper functions types
export interface PermissionCheck {
  resource: PermissionResource
  right: RightValue
}
