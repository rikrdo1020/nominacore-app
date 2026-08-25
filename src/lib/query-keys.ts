// Central registry of TanStack Query keys. Keep every query key definition
// here so invalidation/prefetching stays consistent across the app.
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    list: ['users', 'list'] as const,
  },
};
