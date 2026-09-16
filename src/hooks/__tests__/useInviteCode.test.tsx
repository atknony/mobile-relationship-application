import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInviteCode } from '@/hooks/useInviteCode';
import { useProfileStore } from '@/stores/profileStore';

const mockInvoke = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

/** One client per test — a shared one would leak mutation state between them. */
function createWrapper() {
  const client = new QueryClient({
    // gcTime 0 so the client leaves no pending timers behind for Jest.
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: 0, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mockInvoke.mockReset();
  useProfileStore.setState({ pairedWith: null, pairId: null });
});

describe('redeeming an invite code', () => {
  it('stores the partner user id in pairedWith and the pair id in pairId', async () => {
    mockInvoke.mockResolvedValue({
      data: { pairId: 'pair-uuid', partnerId: 'partner-uuid' },
      error: null,
    });

    const { result } = await renderHook(() => useInviteCode(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.redeemCode.mutateAsync('ABC123');
    });

    // These were swapped: the pairs-table UUID was written into pairedWith,
    // which every other consumer reads as the partner's user_id.
    expect(useProfileStore.getState().pairedWith).toBe('partner-uuid');
    expect(useProfileStore.getState().pairId).toBe('pair-uuid');
  });

  it('rejects a response that is missing the partner id', async () => {
    mockInvoke.mockResolvedValue({ data: { pairId: 'pair-uuid' }, error: null });

    const { result } = await renderHook(() => useInviteCode(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await expect(result.current.redeemCode.mutateAsync('ABC123')).rejects.toThrow();
    });

    expect(useProfileStore.getState().pairedWith).toBeNull();
  });
});
