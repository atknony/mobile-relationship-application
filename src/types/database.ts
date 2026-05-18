// Hand-written stubs — replace with Supabase-generated types once the backend is ready.
// Run: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Profile {
  id: string;               // = auth.uid
  display_name: string;
  full_name: string;
  avatar_url: string | null;
  pair_id: string | null;   // FK → pairs table
  created_at: string;
}

export interface Ping {
  id: string;
  pair_id: string;
  sender_id: string;
  moment_url: string | null; // Supabase Storage URL
  created_at: string;
}

export interface UnpairRequest {
  id: string;
  pair_id: string;
  initiated_by: string;
  status: 'pending' | 'confirmed' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface Pair {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          display_name: string;
          full_name: string;
          avatar_url?: string | null;
          pair_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Profile>;
      };
      pings: {
        Row: Ping;
        Insert: Omit<Ping, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Ping>;
      };
      unpair_requests: {
        Row: UnpairRequest;
        Insert: Omit<UnpairRequest, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<UnpairRequest>;
      };
      pairs: {
        Row: Pair;
        Insert: Omit<Pair, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Pair>;
      };
    };
  };
}
