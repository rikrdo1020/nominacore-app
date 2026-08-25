import { contextBridge, ipcRenderer } from 'electron';

// Backend URL - hardcoded for reliability in preload context
const BACKEND_URL = process.env.VALENTINI_API_URL || 'https://nominacore-api-production.up.railway.app/api';

console.log('[Preload] Starting... URL:', BACKEND_URL);

function camelToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = camelToSnake((obj as Record<string, unknown>)[key]);
    }
    return result;
  }
  return obj;
}

// --- Auth plumbing -------------------------------------------------------

let authToken: string | null = null;

type UnauthorizedListener = () => void;
const unauthorizedListeners: UnauthorizedListener[] = [];

function notifyUnauthorized(): void {
  for (const listener of unauthorizedListeners) {
    try {
      listener();
    } catch (err) {
      console.error('[Preload] onUnauthorized listener threw:', err);
    }
  }
}

function buildHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

// Shared response handling: notifies "unauthorized" listeners on 401 (before
// throwing) so the renderer can react (e.g. log the user out), regardless of
// which helper (transformed or raw) issued the request.
async function handleResponse(res: Response): Promise<unknown> {
  if (res.status === 401) {
    notifyUnauthorized();
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

// --- Generic REST helpers (existing endpoints) ---------------------------
// These convert responses from the backend's camelCase to the snake_case
// shape the existing renderer code/types expect. Do not use these for the
// auth/users endpoints below, whose contract types are camelCase.

async function apiGet(path: string): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] GET', url);
  const res = await fetch(url, { headers: buildHeaders(false) });
  const data = await handleResponse(res);
  return camelToSnake(data);
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await handleResponse(res);
  return camelToSnake(data);
}

async function apiPut(path: string, body: unknown): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] PUT', url);
  const res = await fetch(url, {
    method: 'PUT',
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await handleResponse(res);
  return camelToSnake(data);
}

async function apiDelete(path: string): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] DELETE', url);
  const res = await fetch(url, { method: 'DELETE', headers: buildHeaders(false) });
  const data = await handleResponse(res);
  return camelToSnake(data);
}

// --- Raw REST helpers (auth/users endpoints) ------------------------------
// The NestJS auth/users contract is defined in camelCase (accessToken,
// isActive, createdAt...). Unlike the legacy endpoints above, these are NOT
// run through camelToSnake so the renderer receives exactly the shape
// declared in src/types/api.ts (User, LoginResponse, etc.).

async function rawGet(path: string): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] GET (raw)', url);
  const res = await fetch(url, { headers: buildHeaders(false) });
  return handleResponse(res);
}

async function rawPost(path: string, body: unknown): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] POST (raw)', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function rawDelete(path: string): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] DELETE (raw)', url);
  const res = await fetch(url, { method: 'DELETE', headers: buildHeaders(false) });
  return handleResponse(res);
}

try {
  contextBridge.exposeInMainWorld('api', {
    // Auto-updater
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    quitAndInstall: () => ipcRenderer.send('quit-and-install'),
    onUpdateStatus: (callback: (payload: unknown) => void) => {
      const handler = (_event: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on('update-status', handler);
      return () => ipcRenderer.removeListener('update-status', handler);
    },

    // Auth
    setAuthToken: (token: string | null) => {
      authToken = token;
    },
    onUnauthorized: (callback: () => void) => {
      unauthorizedListeners.push(callback);
      return () => {
        const idx = unauthorizedListeners.indexOf(callback);
        if (idx !== -1) unauthorizedListeners.splice(idx, 1);
      };
    },
    login: (username: string, password: string) => rawPost('/auth/login', { username, password }),
    getMe: () => rawGet('/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      rawPost('/auth/change-password', { currentPassword, newPassword }),

    // Users
    getUsers: () => rawGet('/users'),
    createUser: (dto: { username: string; role?: string }) => rawPost('/users', dto),
    deleteUser: (id: number) => rawDelete(`/users/${id}`),
    resetUserPassword: (id: number) => rawPost(`/users/${id}/reset-password`, {}),

    // Employees
    getEmployees: () => apiGet('/employees'),
    getAllEmployees: () => apiGet('/employees/all'),
    addEmployee: (name: string) => apiPost('/employees', { name }),
    updateEmployee: (id: number, name: string) => apiPut(`/employees/${id}`, { name }),
    deleteEmployee: (id: number) => apiDelete(`/employees/${id}`),

    // Rate Rules
    getRateRules: () => apiGet('/rate-rules'),
    updateRateRule: (id: number, maxReg: number, regRate: number, otRate: number, lunchDuration: number) =>
      apiPut(`/rate-rules/${id}`, {
        maxRegularHours: maxReg,
        regularRate: regRate,
        overtimeRate: otRate,
        lunchDuration: lunchDuration,
      }),

    // Employee Rates
    getEmployeeRates: (employeeId?: number) => {
      const params = new URLSearchParams();
      if (employeeId) params.append('employee_id', String(employeeId));
      return apiGet(`/employee-rates?${params.toString()}`);
    },
    createEmployeeRate: (dto: {
      employee_id: number;
      day_of_week: number;
      max_regular_hours?: number;
      regular_rate?: number;
      overtime_rate?: number;
      lunch_duration?: number;
    }) =>
      apiPost('/employee-rates', {
        employeeId: dto.employee_id,
        dayOfWeek: dto.day_of_week,
        maxRegularHours: dto.max_regular_hours,
        regularRate: dto.regular_rate,
        overtimeRate: dto.overtime_rate,
        lunchDuration: dto.lunch_duration,
      }),
    updateEmployeeRate: (id: number, dto: {
      day_of_week?: number;
      max_regular_hours?: number;
      regular_rate?: number;
      overtime_rate?: number;
      lunch_duration?: number;
      is_active?: boolean;
    }) =>
      apiPut(`/employee-rates/${id}`, {
        dayOfWeek: dto.day_of_week,
        maxRegularHours: dto.max_regular_hours,
        regularRate: dto.regular_rate,
        overtimeRate: dto.overtime_rate,
        lunchDuration: dto.lunch_duration,
        isActive: dto.is_active,
      }),
    deleteEmployeeRate: (id: number) => apiDelete(`/employee-rates/${id}`),

    // Work Records
    getWorkRecords: (empId: number, start?: string, end?: string) => {
      const params = new URLSearchParams();
      params.append('employee_id', String(empId));
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      return apiGet(`/work-records?${params.toString()}`);
    },
    getWorkRecordsAll: (start?: string, end?: string) => {
      const params = new URLSearchParams();
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      return apiGet(`/work-records?${params.toString()}`);
    },
    addWorkRecord: (record: {
      employee_id: number;
      date: string;
      entry_time: string | null;
      exit_time: string | null;
      direct_hours: number | null;
      is_direct_entry: number;
      notes: string | null;
    }) =>
      apiPost('/work-records', {
        employeeId: record.employee_id,
        date: record.date,
        entryTime: record.entry_time,
        exitTime: record.exit_time,
        directHours: record.direct_hours,
        isDirectEntry: !!record.is_direct_entry,
        notes: record.notes,
      }),
    updateWorkRecord: (id: number, record: {
      entry_time?: string | null;
      exit_time?: string | null;
      direct_hours?: number | null;
      is_direct_entry?: number;
      notes?: string | null;
    }) =>
      apiPut(`/work-records/${id}`, {
        entryTime: record.entry_time,
        exitTime: record.exit_time,
        directHours: record.direct_hours,
        isDirectEntry: !!record.is_direct_entry,
        notes: record.notes,
      }),
    deleteWorkRecord: (id: number) => apiDelete(`/work-records/${id}`),
    extractWorkRecords: (images: { file_name: string; mime_type: string; base64: string }[]) =>
      apiPost('/work-records/extract', {
        images: images.map((img) => ({ fileName: img.file_name, mimeType: img.mime_type, base64: img.base64 })),
      }),

    // Deductions
    getDeductions: (empId?: number | null, start?: string, end?: string) => {
      const params = new URLSearchParams();
      if (empId) params.append('employee_id', String(empId));
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      return apiGet(`/deductions?${params.toString()}`);
    },
    addDeduction: (ded: {
      employee_id: number;
      date: string;
      type: string;
      amount: number;
      description: string | null;
    }) =>
      apiPost('/deductions', {
        employeeId: ded.employee_id,
        date: ded.date,
        type: ded.type,
        amount: ded.amount,
        description: ded.description,
      }),
    deleteDeduction: (id: number) => apiDelete(`/deductions/${id}`),
    extractDeductions: (images: { file_name: string; mime_type: string; base64: string }[]) =>
      apiPost('/deductions/extract', {
        images: images.map((img) => ({ fileName: img.file_name, mimeType: img.mime_type, base64: img.base64 })),
      }),

    // Payroll
    calculatePayroll: (empId: number, workStart: string, workEnd: string, deductionStart: string, deductionEnd: string) => {
      const params = new URLSearchParams();
      params.append('employee_id', String(empId));
      params.append('work_start_date', workStart);
      params.append('work_end_date', workEnd);
      params.append('deduction_start_date', deductionStart);
      params.append('deduction_end_date', deductionEnd);
      return apiGet(`/payroll/calculate?${params.toString()}`);
    },
    calculatePayrollAll: (workStart: string, workEnd: string, deductionStart: string, deductionEnd: string) => {
      const params = new URLSearchParams();
      params.append('work_start_date', workStart);
      params.append('work_end_date', workEnd);
      params.append('deduction_start_date', deductionStart);
      params.append('deduction_end_date', deductionEnd);
      return apiGet(`/payroll/calculate-all?${params.toString()}`);
    },
    savePayroll: (empId: number, start: string, end: string, paidAt: string) =>
      apiPost('/payroll/save', {
        employeeId: empId,
        periodStart: start,
        periodEnd: end,
        paidAt: paidAt,
      }),
    getPayrollHistory: (empId?: number | null) => {
      const params = new URLSearchParams();
      if (empId) params.append('employee_id', String(empId));
      return apiGet(`/payroll/history?${params.toString()}`);
    },
  });

  console.log('[Preload] window.api exposed successfully');
} catch (err) {
  console.error('[Preload] FAILED to expose window.api:', err);
}
