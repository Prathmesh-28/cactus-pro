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
      bank_accounts: {
        Row: {
          balance: number
          bank: string | null
          currency: string | null
          fund: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          balance?: number
          bank?: string | null
          currency?: string | null
          fund?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          balance?: number
          bank?: string | null
          currency?: string | null
          fund?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      branding: {
        Row: {
          id: boolean
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dynamic_tables: {
        Row: {
          columns: Json
          rows: Json
          table_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          columns?: Json
          rows?: Json
          table_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          columns?: Json
          rows?: Json
          table_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fund_expenses: {
        Row: {
          actual: number
          budget: number
          category: string
          fund: string
          fy23: number
          fy24: number
          fy25: number
          fy26: number
          fy27: number
          fy28: number
          fy29: number
          fy30: number
          fy31: number
          id: string
          notes: string | null
          period: string | null
          q1: number
          q2: number
          q3: number
          q4: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual?: number
          budget?: number
          category: string
          fund?: string
          fy23?: number
          fy24?: number
          fy25?: number
          fy26?: number
          fy27?: number
          fy28?: number
          fy29?: number
          fy30?: number
          fy31?: number
          id?: string
          notes?: string | null
          period?: string | null
          q1?: number
          q2?: number
          q3?: number
          q4?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual?: number
          budget?: number
          category?: string
          fund?: string
          fy23?: number
          fy24?: number
          fy25?: number
          fy26?: number
          fy27?: number
          fy28?: number
          fy29?: number
          fy30?: number
          fy31?: number
          id?: string
          notes?: string | null
          period?: string | null
          q1?: number
          q2?: number
          q3?: number
          q4?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fund_expenses_actual: {
        Row: {
          budgeted: number
          category: string
          fund: string
          id: string
          q1: number
          q2: number
          q3: number
          q4: number
          updated_at: string
          updated_by: string | null
          var_q1: number
          var_q2: number
          var_q3: number
          var_q4: number
        }
        Insert: {
          budgeted?: number
          category: string
          fund?: string
          id?: string
          q1?: number
          q2?: number
          q3?: number
          q4?: number
          updated_at?: string
          updated_by?: string | null
          var_q1?: number
          var_q2?: number
          var_q3?: number
          var_q4?: number
        }
        Update: {
          budgeted?: number
          category?: string
          fund?: string
          id?: string
          q1?: number
          q2?: number
          q3?: number
          q4?: number
          updated_at?: string
          updated_by?: string | null
          var_q1?: number
          var_q2?: number
          var_q3?: number
          var_q4?: number
        }
        Relationships: []
      }
      fund_metric_values: {
        Row: {
          fund: string
          id: string
          metric_key: string
          period: string
          row_type: string
          updated_at: string
          updated_by: string | null
          value: number | null
        }
        Insert: {
          fund?: string
          id?: string
          metric_key: string
          period?: string
          row_type: string
          updated_at?: string
          updated_by?: string | null
          value?: number | null
        }
        Update: {
          fund?: string
          id?: string
          metric_key?: string
          period?: string
          row_type?: string
          updated_at?: string
          updated_by?: string | null
          value?: number | null
        }
        Relationships: []
      }
      fund_overview: {
        Row: {
          absolute_carry: number | null
          bank_balance: number
          called_capital: number | null
          carry_pct: number | null
          committed_capital: number | null
          dpi: number | null
          fund: string
          fund_name: string
          fund_size: number | null
          id: string
          invested_capital: number | null
          irr: number | null
          moic: number | null
          nav: number | null
          notes: string | null
          pipeline_total: number
          tvpi: number | null
          updated_at: string
          updated_by: string | null
          vintage: number | null
        }
        Insert: {
          absolute_carry?: number | null
          bank_balance?: number
          called_capital?: number | null
          carry_pct?: number | null
          committed_capital?: number | null
          dpi?: number | null
          fund?: string
          fund_name?: string
          fund_size?: number | null
          id?: string
          invested_capital?: number | null
          irr?: number | null
          moic?: number | null
          nav?: number | null
          notes?: string | null
          pipeline_total?: number
          tvpi?: number | null
          updated_at?: string
          updated_by?: string | null
          vintage?: number | null
        }
        Update: {
          absolute_carry?: number | null
          bank_balance?: number
          called_capital?: number | null
          carry_pct?: number | null
          committed_capital?: number | null
          dpi?: number | null
          fund?: string
          fund_name?: string
          fund_size?: number | null
          id?: string
          invested_capital?: number | null
          irr?: number | null
          moic?: number | null
          nav?: number | null
          notes?: string | null
          pipeline_total?: number
          tvpi?: number | null
          updated_at?: string
          updated_by?: string | null
          vintage?: number | null
        }
        Relationships: []
      }
      fund_performance_metrics: {
        Row: {
          current_value: number | null
          expected_value: number | null
          fund: string
          id: string
          investor: string
          label: string
          notes: string | null
          sort_order: number
          unit: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          current_value?: number | null
          expected_value?: number | null
          fund?: string
          id?: string
          investor?: string
          label: string
          notes?: string | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          current_value?: number | null
          expected_value?: number | null
          fund?: string
          id?: string
          investor?: string
          label?: string
          notes?: string | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      im_expenses: {
        Row: {
          actual: number
          budget: number
          category: string
          fund: string
          fy23: number
          fy24: number
          fy25: number
          fy26: number
          fy27: number
          fy28: number
          fy29: number
          fy30: number
          fy31: number
          id: string
          notes: string | null
          period: string | null
          q1: number
          q2: number
          q3: number
          q4: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual?: number
          budget?: number
          category: string
          fund?: string
          fy23?: number
          fy24?: number
          fy25?: number
          fy26?: number
          fy27?: number
          fy28?: number
          fy29?: number
          fy30?: number
          fy31?: number
          id?: string
          notes?: string | null
          period?: string | null
          q1?: number
          q2?: number
          q3?: number
          q4?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual?: number
          budget?: number
          category?: string
          fund?: string
          fy23?: number
          fy24?: number
          fy25?: number
          fy26?: number
          fy27?: number
          fy28?: number
          fy29?: number
          fy30?: number
          fy31?: number
          id?: string
          notes?: string | null
          period?: string | null
          q1?: number
          q2?: number
          q3?: number
          q4?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      im_expenses_actual: {
        Row: {
          budgeted: number
          category: string
          fund: string
          id: string
          q1: number
          q2: number
          q3: number
          q4: number
          updated_at: string
          updated_by: string | null
          var_q1: number
          var_q2: number
          var_q3: number
          var_q4: number
        }
        Insert: {
          budgeted?: number
          category: string
          fund?: string
          id?: string
          q1?: number
          q2?: number
          q3?: number
          q4?: number
          updated_at?: string
          updated_by?: string | null
          var_q1?: number
          var_q2?: number
          var_q3?: number
          var_q4?: number
        }
        Update: {
          budgeted?: number
          category?: string
          fund?: string
          id?: string
          q1?: number
          q2?: number
          q3?: number
          q4?: number
          updated_at?: string
          updated_by?: string | null
          var_q1?: number
          var_q2?: number
          var_q3?: number
          var_q4?: number
        }
        Relationships: []
      }
      pipeline_investments: {
        Row: {
          amount: number
          fund: string
          id: string
          name: string
          notes: string | null
          stage: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          fund?: string
          id?: string
          name: string
          notes?: string | null
          stage?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          fund?: string
          id?: string
          name?: string
          notes?: string | null
          stage?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      req_cells: {
        Row: {
          fund: string
          id: string
          investor_id: string
          row_id: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          fund?: string
          id?: string
          investor_id: string
          row_id: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          fund?: string
          id?: string
          investor_id?: string
          row_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "req_cells_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "req_investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "req_cells_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "req_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      req_investors: {
        Row: {
          fund: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          fund?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          fund?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      req_rows: {
        Row: {
          fund: string
          id: string
          label: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          fund?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          fund?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      section_timestamps: {
        Row: {
          fund: string
          section: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          fund?: string
          section: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          fund?: string
          section?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      version_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          payload: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          payload: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          payload?: Json
        }
        Relationships: []
      }
      work_updates: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          fund: string
          id: string
          original_id: string | null
          owner: string | null
          sort_order: number
          status: Database["public"]["Enums"]["work_update_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          fund?: string
          id?: string
          original_id?: string | null
          owner?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["work_update_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          fund?: string
          id?: string
          original_id?: string | null
          owner?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["work_update_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_updates_original_id_fkey"
            columns: ["original_id"]
            isOneToOne: false
            referencedRelation: "work_updates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
      work_update_status: "planned" | "closed" | "pending"
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
      app_role: ["admin", "editor", "viewer"],
      work_update_status: ["planned", "closed", "pending"],
    },
  },
} as const
