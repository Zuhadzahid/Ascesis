/**
 * Database types for the Supabase schema in supabase/migrations.
 *
 * Hand-authored to match 0001_init.sql through 0004_pos.sql. Once the Supabase
 * CLI can reach a running database you can regenerate with:
 *   pnpm db:types
 * Keep the shape in sync with the migrations until then.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GoalKind = "year" | "month" | "week";
export type GoalDimension =
  | "career"
  | "health"
  | "finance"
  | "learning"
  | "personal";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          timezone: string;
          week_starts_on: number;
          settings: Json;
          canvas_state: Json;
          canvas_state_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          timezone?: string;
          week_starts_on?: number;
          settings?: Json;
          canvas_state?: Json;
          canvas_state_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          timezone?: string;
          week_starts_on?: number;
          settings?: Json;
          canvas_state?: Json;
          canvas_state_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          task_date: string; // date, "YYYY-MM-DD"
          title: string;
          details: string | null;
          has_details: boolean;
          completed: boolean;
          completed_at: string | null;
          position: string;
          goal_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          task_date: string;
          title: string;
          details?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          position: string;
          goal_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_date?: string;
          title?: string;
          details?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          position?: string;
          goal_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          objective: string | null;
          start_date: string;
          end_date: string;
          rules: Json; // [{ id, text }]
          deep_work_target_minutes: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          objective?: string | null;
          start_date: string;
          end_date: string;
          rules: Json;
          deep_work_target_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          objective?: string | null;
          start_date?: string;
          end_date?: string;
          rules?: Json;
          deep_work_target_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          kind: GoalKind;
          period_start: string;
          dimension: GoalDimension | null;
          parent_id: string | null;
          title: string;
          progress: number;
          deliverables: Json;
          log: Json;
          position: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          kind: GoalKind;
          period_start: string;
          dimension?: GoalDimension | null;
          parent_id?: string | null;
          title: string;
          progress?: number;
          deliverables?: Json;
          log?: Json;
          position?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: GoalKind;
          period_start?: string;
          dimension?: GoalDimension | null;
          parent_id?: string | null;
          title?: string;
          progress?: number;
          deliverables?: Json;
          log?: Json;
          position?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      daily_logs: {
        Row: {
          user_id: string;
          log_date: string;
          challenge_id: string | null;
          rule_ids: Json;
          completed_rule_ids: Json;
          main_objective: string | null;
          deep_work_minutes: number;
          deep_work_target_minutes: number;
          evening_rating: number | null;
          reflection_text: string | null;
          daily_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          log_date: string;
          challenge_id?: string | null;
          rule_ids?: Json;
          completed_rule_ids?: Json;
          main_objective?: string | null;
          deep_work_minutes?: number;
          deep_work_target_minutes?: number;
          evening_rating?: number | null;
          reflection_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          log_date?: string;
          challenge_id?: string | null;
          rule_ids?: Json;
          completed_rule_ids?: Json;
          main_objective?: string | null;
          deep_work_minutes?: number;
          deep_work_target_minutes?: number;
          evening_rating?: number | null;
          reflection_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      deep_work_sessions: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          started_at: string;
          ended_at: string | null;
          label: string | null;
          minutes: number;
        };
        Insert: {
          id?: string;
          user_id?: string;
          log_date: string;
          started_at?: string;
          ended_at?: string | null;
          label?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_date?: string;
          started_at?: string;
          ended_at?: string | null;
          label?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      streak: {
        Args: { p_asof: string; p_threshold?: number };
        Returns: { current_streak: number; longest_streak: number }[];
      };
      apply_ai_plan: {
        Args: { plan: Json };
        Returns: Json;
      };
    };
    Enums: {
      goal_kind: GoalKind;
      goal_dimension: GoalDimension;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];
export type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
export type DailyLogRow = Database["public"]["Tables"]["daily_logs"]["Row"];
export type DeepWorkRow =
  Database["public"]["Tables"]["deep_work_sessions"]["Row"];
