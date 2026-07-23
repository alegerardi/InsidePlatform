export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_action_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          metadata: Json
          result: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          result: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          result?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          checked_at: string
          checked_by: string | null
          created_at: string
          event_id: string | null
          id: string
          message: string | null
          result: Database["public"]["Enums"]["check_in_result"]
          staff_user_id: string | null
          ticket_id: string | null
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string | null
          result: Database["public"]["Enums"]["check_in_result"]
          staff_user_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string | null
          result?: Database["public"]["Enums"]["check_in_result"]
          staff_user_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_page_view_stats: {
        Row: {
          created_at: string
          event_id: string
          raw_views: number
          updated_at: string
          view_date: string
        }
        Insert: {
          created_at?: string
          event_id: string
          raw_views?: number
          updated_at?: string
          view_date?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          raw_views?: number
          updated_at?: string
          view_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_page_view_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          event_id: string
          id: string
          staff_user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          staff_user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          max_guest_list: number
          max_tickets: number
          organizer_id: string
          slug: string | null
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          max_guest_list?: number
          max_tickets?: number
          organizer_id: string
          slug?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          max_guest_list?: number
          max_tickets?: number
          organizer_id?: string
          slug?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      ticket_types: {
        Row: {
          capacity_pool: Database["public"]["Enums"]["ticket_capacity_pool"]
          created_at: string
          currency: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          max_quantity: number | null
          price_cents: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          capacity_pool?: Database["public"]["Enums"]["ticket_capacity_pool"]
          created_at?: string
          currency?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          max_quantity?: number | null
          price_cents?: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          capacity_pool?: Database["public"]["Enums"]["ticket_capacity_pool"]
          created_at?: string
          currency?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          max_quantity?: number | null
          price_cents?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          event_id: string
          id: string
          qr_token: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_capacity_pool_snapshot: Database["public"]["Enums"]["ticket_capacity_pool"]
          ticket_code: string
          ticket_currency_snapshot: string
          ticket_price_cents_snapshot: number
          ticket_type_id: string | null
          ticket_type_title_snapshot: string | null
          used_at: string | null
          used_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          qr_token: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_capacity_pool_snapshot?: Database["public"]["Enums"]["ticket_capacity_pool"]
          ticket_code: string
          ticket_currency_snapshot?: string
          ticket_price_cents_snapshot?: number
          ticket_type_id?: string | null
          ticket_type_title_snapshot?: string | null
          used_at?: string | null
          used_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          qr_token?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_capacity_pool_snapshot?: Database["public"]["Enums"]["ticket_capacity_pool"]
          ticket_code?: string
          ticket_currency_snapshot?: string
          ticket_price_cents_snapshot?: number
          ticket_type_id?: string | null
          ticket_type_title_snapshot?: string | null
          used_at?: string | null
          used_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_event_staff_by_email: {
        Args: { target_event_id: string; target_staff_email: string }
        Returns: Json
      }
      cancel_event_if_no_revenue: {
        Args: { target_event_id: string }
        Returns: Json
      }
      claim_ticket: { Args: { target_event_id: string }; Returns: Json }
      claim_ticket_for_type: {
        Args: { target_event_id: string; target_ticket_type_id?: string }
        Returns: Json
      }
      create_event_with_ticket_types: {
        Args: {
          new_description: string
          new_ends_at: string
          new_location: string
          new_max_guest_list: number
          new_max_tickets: number
          new_slug_base: string
          new_starts_at: string
          new_title: string
          ticket_types_json: Json
        }
        Returns: Json
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_my_event_staff_assignments: {
        Args: never
        Returns: {
          event_id: string
          staff_email: string
          staff_user_id: string
        }[]
      }
      get_my_organizer_entrance_time_stats: {
        Args: never
        Returns: {
          bucket_start: string
          event_id: string
          guest_list_successful_entrances: number
          paid_successful_entrances: number
          successful_entrances: number
        }[]
      }
      get_my_organizer_event_stats: {
        Args: never
        Returns: {
          active_tickets: number
          cancelled_tickets: number
          duplicate_scan_attempts: number
          event_id: string
          event_remaining_capacity: number
          gross_revenue_cents: number
          guest_list_remaining_capacity: number
          guest_list_successful_entrances: number
          guest_list_tickets_claimed: number
          invalid_scan_attempts: number
          page_views: number
          paid_remaining_capacity: number
          paid_successful_entrances: number
          paid_tickets_sold: number
          successful_entrances: number
          tickets_sold: number
          used_tickets: number
        }[]
      }
      get_my_organizer_ticket_type_stats: {
        Args: never
        Returns: {
          active_count: number
          capacity_pool: Database["public"]["Enums"]["ticket_capacity_pool"]
          currency: string
          event_id: string
          gross_revenue_cents: number
          is_active: boolean
          max_quantity: number
          price_cents: number
          remaining_quantity: number
          sold_count: number
          sort_order: number
          successful_entrances: number
          ticket_type_id: string
          ticket_type_title: string
          used_count: number
        }[]
      }
      get_my_staff_events: {
        Args: never
        Returns: {
          description: string
          ends_at: string
          id: string
          location: string
          organizer_id: string
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
        }[]
      }
      get_public_ticket_types_for_event: {
        Args: { target_event_id: string }
        Returns: {
          capacity_pool: Database["public"]["Enums"]["ticket_capacity_pool"]
          currency: string
          description: string
          event_id: string
          id: string
          is_sold_out: boolean
          price_cents: number
          sort_order: number
          title: string
        }[]
      }
      has_role: {
        Args: {
          required_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_event_owner: { Args: { target_event_id: string }; Returns: boolean }
      is_staff_for_event: {
        Args: { target_event_id: string }
        Returns: boolean
      }
      record_event_page_view: {
        Args: { target_event_id: string }
        Returns: undefined
      }
      remove_event_staff_assignment: {
        Args: { target_event_id: string; target_staff_user_id: string }
        Returns: Json
      }
      update_upcoming_event_with_ticket_types: {
        Args: {
          new_description: string
          new_ends_at: string
          new_location: string
          new_max_guest_list: number
          new_max_tickets: number
          new_starts_at: string
          new_title: string
          target_event_id: string
          ticket_types_json: Json
        }
        Returns: Json
      }
      validate_ticket_by_code: {
        Args: { target_event_id: string; target_ticket_code: string }
        Returns: Json
      }
      validate_ticket_by_qr: {
        Args: { target_qr_token: string }
        Returns: Json
      }
      validate_ticket_qr_for_event: {
        Args: { target_event_id: string; target_qr_token: string }
        Returns: Json
      }
    }
    Enums: {
      check_in_result:
        | "success"
        | "already_used"
        | "invalid_ticket"
        | "wrong_event"
        | "unauthorized"
        | "error"
      event_status: "draft" | "published" | "active" | "completed" | "cancelled"
      ticket_capacity_pool: "paid" | "guest_list"
      ticket_status: "active" | "used" | "cancelled" | "expired" | "invalid"
      user_role: "client" | "event_organizer" | "event_staff" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      check_in_result: [
        "success",
        "already_used",
        "invalid_ticket",
        "wrong_event",
        "unauthorized",
        "error",
      ],
      event_status: ["draft", "published", "active", "completed", "cancelled"],
      ticket_capacity_pool: ["paid", "guest_list"],
      ticket_status: ["active", "used", "cancelled", "expired", "invalid"],
      user_role: ["client", "event_organizer", "event_staff", "admin"],
    },
  },
} as const
