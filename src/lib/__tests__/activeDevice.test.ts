import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from '@supabase/supabase-js';
import { isSessionRevoked, sessionIdOf, claimActiveDevice } from '@/lib/activeDevice';
import { useAppStore } from '@/stores/appStore';

const mockGetUser = jest.fn();
const mockSignOut = jest.fn(async () => ({ error: null }));
const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      signOut: (...args: unknown[]) => mockSignOut(...(args as [])),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

function tokenWith(claims: object) {
  const encode = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.signature`;
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({ sessionReplaced: false });
});

describe('sessionIdOf', () => {
  it('reads the session_id claim from a base64url payload', () => {
    // "~~~" encodes to base64 containing "+" / "/", which base64url rewrites.
    const token = tokenWith({ session_id: 'abc-123', note: '~~~???' });
    expect(sessionIdOf(token)).toBe('abc-123');
  });

  it('is null for anything it cannot read', () => {
    expect(sessionIdOf(undefined)).toBeNull();
    expect(sessionIdOf('not-a-jwt')).toBeNull();
    expect(sessionIdOf(tokenWith({ sub: 'u' }))).toBeNull();
  });
});

describe('isSessionRevoked', () => {
  it('is false for a live session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u' } }, error: null });
    await expect(isSessionRevoked()).resolves.toBe(false);
  });

  it('is true when Auth says the session is gone', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });
    await expect(isSessionRevoked()).resolves.toBe(true);

    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new AuthApiError('Session from session_id claim in JWT does not exist', 403, 'session_not_found'),
    });
    await expect(isSessionRevoked()).resolves.toBe(true);
  });

  // The one that matters: being offline must never sign anyone out.
  it('is false when Auth cannot be reached or fails for another reason', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new AuthRetryableFetchError('Network request failed', 0),
    });
    await expect(isSessionRevoked()).resolves.toBe(false);

    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new AuthApiError('Internal error', 500, 'unexpected_failure'),
    });
    await expect(isSessionRevoked()).resolves.toBe(false);
  });
});

describe('claimActiveDevice', () => {
  it('keeps the session when the claim succeeds', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(claimActiveDevice()).resolves.toBeNull();
    expect(mockRpc).toHaveBeenCalledWith('claim_active_device');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('drops the session rather than leave two phones on one account', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const message = await claimActiveDevice();
    expect(message).toEqual(expect.any(String));
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
