export interface QueuedPing {
  localId: string;
  momentUri?: string; // local file:// URI (copied to documentDirectory)
  createdAt: number;  // Date.now()
  retryCount: number;
}

export interface IncomingPing {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  momentUrl?: string; // Supabase Storage URL
  receivedAt: number;
}

export type PingStatus = 'idle' | 'charging' | 'sending' | 'sent' | 'failed';
