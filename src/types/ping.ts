export interface QueuedPing {
  localId: string;
  userId?: string;    // owner — a queue surviving a sign-out must not be sent by the next user
  momentUri?: string; // local file:// URI (copied to documentDirectory)
  createdAt: number;  // Date.now()
  retryCount: number;
}

export interface IncomingPing {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  momentPath?: string; // Storage object path — signed for display, not a URL
  receivedAt: number;
}

export type PingStatus = 'idle' | 'charging' | 'sending' | 'sent' | 'failed';
