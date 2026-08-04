export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      assistant_messages: {
        Row: {
          content: string;
          created_at: string;
          disease_ids: Json;
          id: string;
          image_path: string | null;
          lang: string;
          risk: Json | null;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          disease_ids?: Json;
          id?: string;
          image_path?: string | null;
          lang?: string;
          risk?: Json | null;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          disease_ids?: Json;
          id?: string;
          image_path?: string | null;
          lang?: string;
          risk?: Json | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          error: string | null;
          id: string;
          latency_ms: number | null;
          metadata: Json | null;
          resource: string | null;
          status: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          latency_ms?: number | null;
          metadata?: Json | null;
          resource?: string | null;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          latency_ms?: number | null;
          metadata?: Json | null;
          resource?: string | null;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      content_items: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          data: Json;
          id: string;
          published: boolean;
          slug: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          created_by?: string | null;
          data?: Json;
          id?: string;
          published?: boolean;
          slug: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          data?: Json;
          id?: string;
          published?: boolean;
          slug?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      detections: {
        Row: {
          alternatives: Json | null;
          causes: Json | null;
          confidence: number | null;
          created_at: string;
          crop: string;
          differentials: Json | null;
          disease: string | null;
          id: string;
          image_path: string;
          immediate_actions: Json | null;
          is_healthy: boolean;
          plant_part: string | null;
          prevention: Json | null;
          raw: Json | null;
          reasoning: string | null;
          recovery_time: string | null;
          severity: string | null;
          summary: string | null;
          symptoms: Json | null;
          treatment_chemical: Json | null;
          treatment_chemical_detailed: Json | null;
          treatment_organic: Json | null;
          treatment_organic_detailed: Json | null;
          user_id: string;
          weather: Json | null;
          weather_risk: Json | null;
        };
        Insert: {
          alternatives?: Json | null;
          causes?: Json | null;
          confidence?: number | null;
          created_at?: string;
          crop: string;
          differentials?: Json | null;
          disease?: string | null;
          id?: string;
          image_path: string;
          immediate_actions?: Json | null;
          is_healthy?: boolean;
          plant_part?: string | null;
          prevention?: Json | null;
          raw?: Json | null;
          reasoning?: string | null;
          recovery_time?: string | null;
          severity?: string | null;
          summary?: string | null;
          symptoms?: Json | null;
          treatment_chemical?: Json | null;
          treatment_chemical_detailed?: Json | null;
          treatment_organic?: Json | null;
          treatment_organic_detailed?: Json | null;
          user_id: string;
          weather?: Json | null;
          weather_risk?: Json | null;
        };
        Update: {
          alternatives?: Json | null;
          causes?: Json | null;
          confidence?: number | null;
          created_at?: string;
          crop?: string;
          differentials?: Json | null;
          disease?: string | null;
          id?: string;
          image_path?: string;
          immediate_actions?: Json | null;
          is_healthy?: boolean;
          plant_part?: string | null;
          prevention?: Json | null;
          raw?: Json | null;
          reasoning?: string | null;
          recovery_time?: string | null;
          severity?: string | null;
          summary?: string | null;
          symptoms?: Json | null;
          treatment_chemical?: Json | null;
          treatment_chemical_detailed?: Json | null;
          treatment_organic?: Json | null;
          treatment_organic_detailed?: Json | null;
          user_id?: string;
          weather?: Json | null;
          weather_risk?: Json | null;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          answers: Json;
          created_at: string;
          id: string;
          score: number;
          total: number;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          created_at?: string;
          id?: string;
          score: number;
          total: number;
          user_id: string;
        };
        Update: {
          answers?: Json;
          created_at?: string;
          id?: string;
          score?: number;
          total?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          action: string;
          bucket: string;
          count: number;
          user_id: string;
        };
        Insert: {
          action: string;
          bucket: string;
          count?: number;
          user_id: string;
        };
        Update: {
          action?: string;
          bucket?: string;
          count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      soil_analyses: {
        Row: {
          created_at: string;
          fertility: string | null;
          id: string;
          image_path: string;
          maintenance: string | null;
          ph_range: string | null;
          raw: Json | null;
          recommended_crops: Json | null;
          soil_type: string | null;
          summary: string | null;
          tips: Json | null;
          user_id: string;
          water_retention: string | null;
        };
        Insert: {
          created_at?: string;
          fertility?: string | null;
          id?: string;
          image_path: string;
          maintenance?: string | null;
          ph_range?: string | null;
          raw?: Json | null;
          recommended_crops?: Json | null;
          soil_type?: string | null;
          summary?: string | null;
          tips?: Json | null;
          user_id: string;
          water_retention?: string | null;
        };
        Update: {
          created_at?: string;
          fertility?: string | null;
          id?: string;
          image_path?: string;
          maintenance?: string | null;
          ph_range?: string | null;
          raw?: Json | null;
          recommended_crops?: Json | null;
          soil_type?: string | null;
          summary?: string | null;
          tips?: Json | null;
          user_id?: string;
          water_retention?: string | null;
        };
        Relationships: [];
      };
      treatment_progress: {
        Row: {
          after_image_path: string;
          analysis: Json | null;
          before_image_path: string;
          created_at: string;
          crop: string | null;
          id: string;
          improvement_percent: number | null;
          notes: string | null;
          status: string | null;
          user_id: string;
        };
        Insert: {
          after_image_path: string;
          analysis?: Json | null;
          before_image_path: string;
          created_at?: string;
          crop?: string | null;
          id?: string;
          improvement_percent?: number | null;
          notes?: string | null;
          status?: string | null;
          user_id: string;
        };
        Update: {
          after_image_path?: string;
          analysis?: Json | null;
          before_image_path?: string;
          created_at?: string;
          crop?: string | null;
          id?: string;
          improvement_percent?: number | null;
          notes?: string | null;
          status?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      rate_limit_hit: {
        Args: {
          _action: string;
          _limit: number;
          _user: string;
          _window_seconds?: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const;
