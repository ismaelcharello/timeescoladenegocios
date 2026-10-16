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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_roles: {
        Row: {
          created_at: string
          role: "member" | "support" | "coordinator" | "admin" | "super_admin" | "superadmin"
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: "member" | "support" | "coordinator" | "admin" | "super_admin" | "superadmin"
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: "member" | "support" | "coordinator" | "admin" | "super_admin" | "superadmin"
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_profiles: {
        Row: {
          avatar_path: string | null
          city: string | null
          company_description: string | null
          company_name: string | null
          company_problems: string | null
          completed_at: string | null
          created_at: string
          desired_partnerships: string | null
          desired_professionals: string | null
          desired_referrals: string | null
          differentiators: string | null
          directory_visible: boolean
          full_name: string | null
          how_can_help: string | null
          instagram_url: string | null
          is_active: boolean
          job_title: string | null
          linkedin_url: string | null
          looking_for: string | null
          offers: string | null
          onboarding_step: number
          products: string | null
          profile_completeness: number
          regions_served: string | null
          segment: string | null
          service_area: string | null
          services: string | null
          state: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          whatsapp: string | null
        }
        Insert: {
          avatar_path?: string | null
          city?: string | null
          company_description?: string | null
          company_name?: string | null
          company_problems?: string | null
          completed_at?: string | null
          created_at?: string
          desired_partnerships?: string | null
          desired_professionals?: string | null
          desired_referrals?: string | null
          differentiators?: string | null
          directory_visible?: boolean
          full_name?: string | null
          how_can_help?: string | null
          instagram_url?: string | null
          is_active?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          looking_for?: string | null
          offers?: string | null
          onboarding_step?: number
          products?: string | null
          profile_completeness?: number
          regions_served?: string | null
          segment?: string | null
          service_area?: string | null
          services?: string | null
          state?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          avatar_path?: string | null
          city?: string | null
          company_description?: string | null
          company_name?: string | null
          company_problems?: string | null
          completed_at?: string | null
          created_at?: string
          desired_partnerships?: string | null
          desired_professionals?: string | null
          desired_referrals?: string | null
          differentiators?: string | null
          directory_visible?: boolean
          full_name?: string | null
          how_can_help?: string | null
          instagram_url?: string | null
          is_active?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          looking_for?: string | null
          offers?: string | null
          onboarding_step?: number
          products?: string | null
          profile_completeness?: number
          regions_served?: string | null
          segment?: string | null
          service_area?: string | null
          services?: string | null
          state?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_member_directory_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_path: string
          city: string
          company_description: string
          company_name: string
          desired_partnerships: string
          desired_professionals: string
          desired_referrals: string
          differentiators: string
          full_name: string
          how_can_help: string
          instagram_url: string
          job_title: string
          linkedin_url: string
          looking_for: string
          offers: string
          products: string
          regions_served: string
          segment: string
          service_area: string
          services: string
          state: string
          target_audience: string
          user_id: string
          website_url: string
        }[]
      }
      get_member_whatsapp: { Args: { target_user_id: string }; Returns: string }
      search_member_directory: {
        Args: {
          city_filter?: string
          search_term?: string
          segment_filter?: string
          service_filter?: string
        }
        Returns: {
          avatar_path: string
          city: string
          company_description: string
          company_name: string
          full_name: string
          job_title: string
          offers: string
          segment: string
          service_area: string
          services: string
          state: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
