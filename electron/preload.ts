import { contextBridge, ipcRenderer } from 'electron';
import path from 'path';
import fs from 'fs';

// Backend URL - hardcoded for reliability in preload context
const BACKEND_URL = process.env.VALENTINI_API_URL || 'https://nominacore-api.onrender.com/api';

console.log('[Preload] Starting... URL:', BACKEND_URL);

// Read app version from package.json
let appVersion = 'unknown';
try {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  appVersion = pkg.version || 'unknown';
} catch {
  appVersion = 'unknown';
}
console.log('[Preload] App version:', appVersion);

// Auth token in memory
let authToken: string | null = null;

function getHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

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

async function apiGet(path: string): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] GET', url);
  const res = await fetch(url, { headers: getHeaders(false) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  return camelToSnake(data);
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  return camelToSnake(data);
}

async function apiPut(path: string, body: unknown): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] PUT', url);
  const res = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  return camelToSnake(data);
}

async function apiDelete(path: string): Promise<unknown> {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] DELETE', url);
  const res = await fetch(url, { method: 'DELETE', headers: getHeaders(false) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  return camelToSnake(data);
}

try {
  contextBridge.exposeInMainWorld('api', {
    appVersion,

    // Auth
    setAuthToken: (token: string) => { authToken = token; },
    clearAuthToken: () => { authToken = null; },
    login: (username: string, password: string) => apiPost('/auth/login', { username, password }),
    getMe: () => apiGet('/auth/me'),
    getUsers: () => apiGet('/users'),
    createUser: (dto: { username: string; password: string; role: string }) => apiPost('/users', dto),
    updateUser: (id: number, dto: Partial<{ username: string; password: string; role: string; is_active: boolean }>) => apiPut(`/users/${id}`, dto),
    deleteUser: (id: number) => apiDelete(`/users/${id}`),

    // Auto-updater
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    quitAndInstall: () => ipcRenderer.send('quit-and-install'),
    onUpdateStatus: (callback: (payload: unknown) => void) => {
      const handler = (_event: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on('update-status', handler);
      return () => ipcRenderer.removeListener('update-status', handler);
    },

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
