import { create } from 'zustand';

export type UnpairRole = 'initiator' | 'responder' | null;
export type UnpairStatus =
  | 'idle'
  | 'pending_partner'     // I initiated, waiting for partner
  | 'partner_initiated'   // Partner initiated, I must respond
  | 'confirmed'
  | 'declined'
  | 'expired';

export interface UnpairRequestState {
  id: string;
  initiatedBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'confirmed' | 'declined' | 'expired';
}

interface UnpairState {
  role: UnpairRole;
  status: UnpairStatus;
  activeRequest: UnpairRequestState | null;

  setUnpairRequest: (req: UnpairRequestState | null, ownUserId: string) => void;
  setStatus: (status: UnpairStatus) => void;
  resetUnpair: () => void;
}

export const useUnpairStore = create<UnpairState>((set) => ({
  role: null,
  status: 'idle',
  activeRequest: null,

  setUnpairRequest: (req, ownUserId) => {
    if (!req) {
      set({ activeRequest: null, role: null, status: 'idle' });
      return;
    }
    const role: UnpairRole = req.initiatedBy === ownUserId ? 'initiator' : 'responder';
    let status: UnpairStatus = 'idle';
    if (req.status === 'pending') {
      status = role === 'initiator' ? 'pending_partner' : 'partner_initiated';
    } else if (req.status === 'confirmed') {
      status = 'confirmed';
    } else if (req.status === 'declined') {
      status = 'declined';
    } else if (req.status === 'expired') {
      status = 'expired';
    }
    set({ activeRequest: req, role, status });
  },

  setStatus: (status) => set({ status }),

  resetUnpair: () => set({ role: null, status: 'idle', activeRequest: null }),
}));
