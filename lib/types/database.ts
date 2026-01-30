/**
 * Tipos TypeScript gerados para o banco de dados Supabase GLPI-Next
 *
 * Este arquivo contém as definições de tipos para todas as tabelas do sistema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      entities: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          level: number
          completename: string | null
          is_recursive: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          level?: number
          completename?: string | null
          is_recursive?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          level?: number
          completename?: string | null
          is_recursive?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string
          realname: string | null
          firstname: string | null
          email: string | null
          phone: string | null
          language: string
          default_entity_id: string | null
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          realname?: string | null
          firstname?: string | null
          email?: string | null
          phone?: string | null
          language?: string
          default_entity_id?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          realname?: string | null
          firstname?: string | null
          email?: string | null
          phone?: string | null
          language?: string
          default_entity_id?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          interface: string
          permissions: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          interface?: string
          permissions?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          interface?: string
          permissions?: Json
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          entity_id: string | null
          is_recursive: boolean
          department: string | null
          assigned_at: string
          assigned_by: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          entity_id?: string | null
          is_recursive?: boolean
          department?: string | null
          assigned_at?: string
          assigned_by?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          entity_id?: string | null
          is_recursive?: boolean
          department?: string | null
          assigned_at?: string
          assigned_by?: string | null
          expires_at?: string | null
        }
      }
      groups: {
        Row: {
          id: string
          entity_id: string | null
          name: string
          comment: string | null
          completename: string | null
          parent_id: string | null
          level: number
          is_recursive: boolean
          is_requester: boolean
          is_watcher: boolean
          is_assign: boolean
          is_task: boolean
          is_notify: boolean
          is_itemgroup: boolean
          is_usergroup: boolean
          is_manager: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_id?: string | null
          name: string
          comment?: string | null
          completename?: string | null
          parent_id?: string | null
          level?: number
          is_recursive?: boolean
          is_requester?: boolean
          is_watcher?: boolean
          is_assign?: boolean
          is_task?: boolean
          is_notify?: boolean
          is_itemgroup?: boolean
          is_usergroup?: boolean
          is_manager?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_id?: string | null
          name?: string
          comment?: string | null
          completename?: string | null
          parent_id?: string | null
          level?: number
          is_recursive?: boolean
          is_requester?: boolean
          is_watcher?: boolean
          is_assign?: boolean
          is_task?: boolean
          is_notify?: boolean
          is_itemgroup?: boolean
          is_usergroup?: boolean
          is_manager?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          entity_id: string
          name: string
          content: string | null
          status: number
          type: number
          urgency: number
          impact: number
          priority: number
          category_id: string | null
          location_id: string | null
          requester_id: string | null
          assigned_to: string | null
          assigned_group: string | null
          sla_id: string | null
          date_creation: string
          date_mod: string
          solvedate: string | null
          closedate: string | null
          is_deleted: boolean
        }
        Insert: {
          id?: string
          entity_id: string
          name: string
          content?: string | null
          status?: number
          type?: number
          urgency?: number
          impact?: number
          category_id?: string | null
          location_id?: string | null
          requester_id?: string | null
          assigned_to?: string | null
          assigned_group?: string | null
          sla_id?: string | null
          date_creation?: string
          date_mod?: string
          solvedate?: string | null
          closedate?: string | null
          is_deleted?: boolean
        }
        Update: {
          id?: string
          entity_id?: string
          name?: string
          content?: string | null
          status?: number
          type?: number
          urgency?: number
          impact?: number
          category_id?: string | null
          location_id?: string | null
          requester_id?: string | null
          assigned_to?: string | null
          assigned_group?: string | null
          sla_id?: string | null
          date_creation?: string
          date_mod?: string
          solvedate?: string | null
          closedate?: string | null
          is_deleted?: boolean
        }
      }
      changes: {
        Row: {
          id: string
          entity_id: string
          name: string
          content: string | null
          status: number
          urgency: number
          impact: number
          priority: number
          category_id: string | null
          requester_id: string | null
          assigned_user_id: string | null
          assigned_group_id: string | null
          date_creation: string
          date_mod: string
          solvedate: string | null
          closedate: string | null
          is_deleted: boolean
        }
        Insert: {
          id?: string
          entity_id: string
          name: string
          content?: string | null
          status?: number
          urgency?: number
          impact?: number
          category_id?: string | null
          requester_id?: string | null
          assigned_user_id?: string | null
          assigned_group_id?: string | null
          date_creation?: string
          date_mod?: string
          solvedate?: string | null
          closedate?: string | null
          is_deleted?: boolean
        }
        Update: {
          id?: string
          entity_id?: string
          name?: string
          content?: string | null
          status?: number
          urgency?: number
          impact?: number
          category_id?: string | null
          requester_id?: string | null
          assigned_user_id?: string | null
          assigned_group_id?: string | null
          date_creation?: string
          date_mod?: string
          solvedate?: string | null
          closedate?: string | null
          is_deleted?: boolean
        }
      }
      problems: {
        Row: {
          id: string
          entity_id: string
          name: string
          content: string | null
          status: number
          urgency: number
          impact: number
          priority: number
          category_id: string | null
          requester_id: string | null
          assigned_user_id: string | null
          assigned_group_id: string | null
          date_creation: string
          date_mod: string
          solvedate: string | null
          closedate: string | null
          is_deleted: boolean
        }
        Insert: {
          id?: string
          entity_id: string
          name: string
          content?: string | null
          status?: number
          urgency?: number
          impact?: number
          category_id?: string | null
          requester_id?: string | null
          assigned_user_id?: string | null
          assigned_group_id?: string | null
          date_creation?: string
          date_mod?: string
          solvedate?: string | null
          closedate?: string | null
          is_deleted?: boolean
        }
        Update: {
          id?: string
          entity_id?: string
          name?: string
          content?: string | null
          status?: number
          urgency?: number
          impact?: number
          category_id?: string | null
          requester_id?: string | null
          assigned_user_id?: string | null
          assigned_group_id?: string | null
          date_creation?: string
          date_mod?: string
          solvedate?: string | null
          closedate?: string | null
          is_deleted?: boolean
        }
      }
      assets: {
        Row: {
          id: string
          entity_id: string
          name: string
          asset_type: string
          serial: string | null
          otherserial: string | null
          contact: string | null
          contact_num: string | null
          manufacturer_id: string | null
          model_id: string | null
          location_id: string | null
          user_id: string | null
          group_id: string | null
          state_id: string | null
          comment: string | null
          is_deleted: boolean
          is_template: boolean
          template_name: string | null
          uuid: string | null
          autoupdatesystems_id: string | null
          ip: string | null
          mac: string | null
          specifications: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_id: string
          name: string
          asset_type: string
          serial?: string | null
          otherserial?: string | null
          contact?: string | null
          contact_num?: string | null
          manufacturer_id?: string | null
          model_id?: string | null
          location_id?: string | null
          user_id?: string | null
          group_id?: string | null
          state_id?: string | null
          comment?: string | null
          is_deleted?: boolean
          is_template?: boolean
          template_name?: string | null
          uuid?: string | null
          autoupdatesystems_id?: string | null
          ip?: string | null
          mac?: string | null
          specifications?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_id?: string
          name?: string
          asset_type?: string
          serial?: string | null
          otherserial?: string | null
          contact?: string | null
          contact_num?: string | null
          manufacturer_id?: string | null
          model_id?: string | null
          location_id?: string | null
          user_id?: string | null
          group_id?: string | null
          state_id?: string | null
          comment?: string | null
          is_deleted?: boolean
          is_template?: boolean
          template_name?: string | null
          uuid?: string | null
          autoupdatesystems_id?: string | null
          ip?: string | null
          mac?: string | null
          specifications?: Json
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          entity_id: string | null
          name: string
          filename: string
          filepath: string
          sha1sum: string | null
          mime: string | null
          filesize: number | null
          tag: string | null
          comment: string | null
          is_deleted: boolean
          is_recursive: boolean
          documentcategory_id: string | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_id?: string | null
          name: string
          filename: string
          filepath: string
          sha1sum?: string | null
          mime?: string | null
          filesize?: number | null
          tag?: string | null
          comment?: string | null
          is_deleted?: boolean
          is_recursive?: boolean
          documentcategory_id?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_id?: string | null
          name?: string
          filename?: string
          filepath?: string
          sha1sum?: string | null
          mime?: string | null
          filesize?: number | null
          tag?: string | null
          comment?: string | null
          is_deleted?: boolean
          is_recursive?: boolean
          documentcategory_id?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ticket_followups: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          content: string
          is_private: boolean
          requesttype_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          content: string
          is_private?: boolean
          requesttype_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          content?: string
          is_private?: boolean
          requesttype_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      ticket_tasks: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          assigned_user_id: string | null
          assigned_group_id: string | null
          content: string
          is_private: boolean
          state: number
          actiontime: number
          begin_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          assigned_user_id?: string | null
          assigned_group_id?: string | null
          content: string
          is_private?: boolean
          state?: number
          actiontime?: number
          begin_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          assigned_user_id?: string | null
          assigned_group_id?: string | null
          content?: string
          is_private?: boolean
          state?: number
          actiontime?: number
          begin_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      queued_notifications: {
        Row: {
          id: string
          entity_id: string | null
          notification_type: string
          item_id: string | null
          item_type: string | null
          recipient_id: string | null
          recipient_email: string | null
          subject: string | null
          body: string | null
          status: string
          error_message: string | null
          send_at: string
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_id?: string | null
          notification_type: string
          item_id?: string | null
          item_type?: string | null
          recipient_id?: string | null
          recipient_email?: string | null
          subject?: string | null
          body?: string | null
          status?: string
          error_message?: string | null
          send_at?: string
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_id?: string | null
          notification_type?: string
          item_id?: string | null
          item_type?: string | null
          recipient_id?: string | null
          recipient_email?: string | null
          subject?: string | null
          body?: string | null
          status?: string
          error_message?: string | null
          send_at?: string
          sent_at?: string | null
          created_at?: string
        }
      }
      logs: {
        Row: {
          id: string
          entity_id: string | null
          item_id: string | null
          item_type: string | null
          user_id: string | null
          user_name: string | null
          action: string
          old_value: string | null
          new_value: string | null
          field_name: string | null
          date_creation: string
        }
        Insert: {
          id?: string
          entity_id?: string | null
          item_id?: string | null
          item_type?: string | null
          user_id?: string | null
          user_name?: string | null
          action: string
          old_value?: string | null
          new_value?: string | null
          field_name?: string | null
          date_creation?: string
        }
        Update: {
          id?: string
          entity_id?: string | null
          item_id?: string | null
          item_type?: string | null
          user_id?: string | null
          user_name?: string | null
          action?: string
          old_value?: string | null
          new_value?: string | null
          field_name?: string | null
          date_creation?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_entities: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      user_has_entity_access: {
        Args: { user_uuid: string; check_entity_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Tipos auxiliares para facilitar o uso
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Aliases para os tipos mais usados
export type Entity = Tables<'entities'>
export type Profile = Tables<'profiles'>
export type Role = Tables<'roles'>
export type UserRole = Tables<'user_roles'>
export type Group = Tables<'groups'>
export type Ticket = Tables<'tickets'>
export type Change = Tables<'changes'>
export type Problem = Tables<'problems'>
export type Asset = Tables<'assets'>
export type Document = Tables<'documents'>
export type TicketFollowup = Tables<'ticket_followups'>
export type TicketTask = Tables<'ticket_tasks'>
export type QueuedNotification = Tables<'queued_notifications'>
export type Log = Tables<'logs'>
