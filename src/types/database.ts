// Hand-written stubs — replace with Supabase-generated types once the backend is ready.
// Run: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// These are `type` aliases rather than `interface` on purpose: supabase-js
// constrains each table's Row to Record<string, unknown>, and interfaces have
// no implicit index signature — declaring them as interfaces silently widens
// every Insert/Update payload to `never`.

export type Profile = {
  id: string;                 // = auth.uid
  username: string;
  avatar_url: string | null;
  partner_id: string | null;  // partner's user_id (auth.uid of the other person)
  push_token: string | null;
  quiet_hours_start: number | null; // minutes since local midnight; null = off
  quiet_hours_end: number | null;
  created_at: string;
};

export type Moment = {
  id: string;
  pair_id: string;            // FK → pairs table
  sender_id: string;
  client_id: string | null;   // client-generated localId — idempotency key for retries
  photo_path: string | null;  // Storage object path — sign at read time, never a URL
  viewed_at: string | null;
  created_at: string;
};

export type Pair = {
  id: string;
  requester_id: string;       // user who created the invite
  receiver_id: string | null; // null until the invite is redeemed
  invite_code: string | null; // cleared on activation
  expires_at: string | null;  // pending invites expire
  status: string;             // 'pending' | 'active' | 'dissolved'
  created_at: string;         // when the invite was generated, not when it was redeemed
  activated_at: string | null; // trigger-stamped when status becomes 'active' (20260917180000)
  // Stamped by a trigger when either member's avatar or username changes — the
  // partner's Realtime cue to refetch that profile (20260917160000).
  profile_changed_at: string | null;
  profile_changed_by: string | null;
};

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
        Relationships: [];
      };
      moments: {
        Row: Moment;
        Insert: Omit<Moment, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Moment>;
        Relationships: [];
      };
      pairs: {
        Row: Pair;
        Insert: Omit<Pair, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Pair>;
        Relationships: [];
      };
    };
    // Required by supabase-js's GenericSchema constraint — without them the
    // schema does not match and every write payload widens to `never`.
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
