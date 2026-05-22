const { contextBridge } = require('electron');

// Backend URL - hardcoded for reliability in preload context
const BACKEND_URL = process.env.VALENTINI_API_URL || 'https://nominacore-api.onrender.com/api';

console.log('[Preload] Starting... URL:', BACKEND_URL);

function camelToSnake(obj) {
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = camelToSnake(obj[key]);
    }
    return result;
  }
  return obj;
}

async function apiGet(path) {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] GET', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  return camelToSnake(data);
}

async function apiPost(path, body) {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  return camelToSnake(data);
}

async function apiPut(path, body) {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] PUT', url);
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  return camelToSnake(data);
}

async function apiDelete(path) {
  const url = `${BACKEND_URL}${path}`;
  console.log('[Preload] DELETE', url);
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  return camelToSnake(data);
}

try {
  contextBridge.exposeInMainWorld('api', {
    // Employees
    getEmployees: () => apiGet('/employees'),
    getAllEmployees: () => apiGet('/employees/all'),
    addEmployee: (name) => apiPost('/employees', { name }),
    updateEmployee: (id, name) => apiPut(`/employees/${id}`, { name }),
    deleteEmployee: (id) => apiDelete(`/employees/${id}`),

    // Rate Rules
    getRateRules: () => apiGet('/rate-rules'),
    updateRateRule: (id, maxReg, regRate, otRate, lunchDuration) =>
      apiPut(`/rate-rules/${id}`, {
        maxRegularHours: maxReg,
        regularRate: regRate,
        overtimeRate: otRate,
        lunchDuration: lunchDuration,
      }),

    // Work Records
    getWorkRecords: (empId, start, end) => {
      const params = new URLSearchParams();
      params.append('employee_id', String(empId));
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      return apiGet(`/work-records?${params.toString()}`);
    },
    getWorkRecordsAll: (start, end) => {
      const params = new URLSearchParams();
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      return apiGet(`/work-records?${params.toString()}`);
    },
    addWorkRecord: (record) =>
      apiPost('/work-records', {
        employeeId: record.employee_id,
        date: record.date,
        entryTime: record.entry_time,
        exitTime: record.exit_time,
        directHours: record.direct_hours,
        isDirectEntry: record.is_direct_entry,
        notes: record.notes,
      }),
    updateWorkRecord: (id, record) =>
      apiPut(`/work-records/${id}`, {
        entryTime: record.entry_time,
        exitTime: record.exit_time,
        directHours: record.direct_hours,
        isDirectEntry: record.is_direct_entry,
        notes: record.notes,
      }),
    deleteWorkRecord: (id) => apiDelete(`/work-records/${id}`),

    // Deductions
    getDeductions: (empId, start, end) => {
      const params = new URLSearchParams();
      if (empId) params.append('employee_id', String(empId));
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      return apiGet(`/deductions?${params.toString()}`);
    },
    addDeduction: (ded) =>
      apiPost('/deductions', {
        employeeId: ded.employee_id,
        date: ded.date,
        type: ded.type,
        amount: ded.amount,
        description: ded.description,
      }),
    deleteDeduction: (id) => apiDelete(`/deductions/${id}`),

    // Payroll
    calculatePayroll: (empId, start, end) => {
      const params = new URLSearchParams();
      params.append('employee_id', String(empId));
      params.append('start_date', start);
      params.append('end_date', end);
      return apiGet(`/payroll/calculate?${params.toString()}`);
    },
    calculatePayrollAll: (start, end) => {
      const params = new URLSearchParams();
      params.append('start_date', start);
      params.append('end_date', end);
      return apiGet(`/payroll/calculate-all?${params.toString()}`);
    },
    savePayroll: (empId, start, end, paidAt) =>
      apiPost('/payroll/save', {
        employeeId: empId,
        periodStart: start,
        periodEnd: end,
        paidAt: paidAt,
      }),
    getPayrollHistory: (empId) => {
      const params = new URLSearchParams();
      if (empId) params.append('employee_id', String(empId));
      return apiGet(`/payroll/history?${params.toString()}`);
    },
  });

  console.log('[Preload] window.api exposed successfully');
} catch (err) {
  console.error('[Preload] FAILED to expose window.api:', err);
}
