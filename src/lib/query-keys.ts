// Central registry of TanStack Query keys. Keep every query key definition
// here so invalidation/prefetching stays consistent across the app.
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    list: ['users', 'list'] as const,
  },
  employees: {
    list: ['employees', 'list'] as const,
  },
  rateRules: {
    list: ['rateRules', 'list'] as const,
  },
  employeeRates: {
    byEmployee: (employeeId: number) => ['employeeRates', employeeId] as const,
  },
  workRecords: {
    list: (empId: string, start?: string, end?: string) =>
      ['workRecords', empId, start, end] as const,
  },
  deductions: {
    list: (empId: string, start?: string, end?: string) =>
      ['deductions', empId, start, end] as const,
  },
};
