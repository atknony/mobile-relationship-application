// Hand-written stubs — replace with Supabase-generated types once the backend is ready.
// Run: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Profile {
  id: string;                 // = auth.uid
  username: string;
  avatar_url: string | null;
  partner_id: string | null;  // partner's user_id (auth.uid of the other person)
  push_token: string | null;
  created_at: string;
}

export interface Moment {
  id: string;
  pair_id: string;            // FK → pairs table
  sender_id: string;
  photo_url: string | null;   // Supabase Storage URL
  viewed_at: string | null;
  created_at: string;
}

export interface Pair {
  id: string;
  requester_id: string;       // user who created the invite
  receiver_id: string;        // user who redeemed the invite
  status: string;             // 'pending' | 'active' | 'dissolved'
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          partner_id?: string | null;
          push_token?: string | null;
          created_at?: string;
        };
        Update: Partial<Profile>;
      };
      moments: {
        Row: Moment;
        Insert: Omit<Moment, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Moment>;
      };
      pairs: {
        Row: Pair;
        Insert: Omit<Pair, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Pair>;
      };
    };
  };
}
