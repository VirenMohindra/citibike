/**
 * Supabase Database Types
 * Generated types for type-safe database access
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; // uuid
          email: string | null;
          citibike_user_id: string | null;
          is_demo_user: boolean; // DEMO MODE: identifies demo accounts
          demo_persona: string | null; // DEMO MODE: persona type (e.g., "daily_commuter")
          created_at: string; // timestamp
          updated_at: string | null; // timestamp
        };
        Insert: {
          id: string;
          email?: string | null;
          citibike_user_id?: string | null;
          is_demo_user?: boolean;
          demo_persona?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          citibike_user_id?: string | null;
          is_demo_user?: boolean;
          demo_persona?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      trips: {
        Row: {
          id: string;
          user_id: string; // uuid
          start_time: string; // timestamptz
          end_time: string; // timestamptz
          duration: number;
          start_station_id: string;
          start_station_name: string;
          start_lat: number;
          start_lon: number;
          end_station_id: string;
          end_station_name: string;
          end_lat: number;
          end_lon: number;
          bike_type: 'classic' | 'ebike';
          distance: number | null;
          angel_points: number | null;
          has_actual_coordinates: boolean | null;
          synced_at: string; // timestamptz
        };
        Insert: {
          id: string;
          user_id: string;
          start_time: string;
          end_time: string;
          duration: number;
          start_station_id: string;
          start_station_name: string;
          start_lat: number;
          start_lon: number;
          end_station_id: string;
          end_station_name: string;
          end_lat: number;
          end_lon: number;
          bike_type: 'classic' | 'ebike';
          distance?: number | null;
          angel_points?: number | null;
          has_actual_coordinates?: boolean | null;
          synced_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          start_time?: string;
          end_time?: string;
          duration?: number;
          start_station_id?: string;
          start_station_name?: string;
          start_lat?: number;
          start_lon?: number;
          end_station_id?: string;
          end_station_name?: string;
          end_lat?: number;
          end_lon?: number;
          bike_type?: 'classic' | 'ebike';
          distance?: number | null;
          angel_points?: number | null;
          has_actual_coordinates?: boolean | null;
          synced_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
