export interface Employee {
  id: number;
  name: string;
  is_active: number;
  created_at: string;
}

export interface RateRule {
  id: number;
  day_of_week: number;
  day_name: string;
  max_regular_hours: number;
  regular_rate: number;
  overtime_rate: number;
  lunch_duration: number;
  is_active: number;
}

export interface EmployeeRate {
  id: number;
  employee_id: number;
  day_of_week: number;
  max_regular_hours: number;
  regular_rate: number;
  overtime_rate: number;
  lunch_duration: number;
  is_active: number;
}

export interface WorkRecord {
  id: number;
  employee_id: number;
  date: string;
  entry_time: string | null;
  exit_time: string | null;
  direct_hours: number | null;
  is_direct_entry: number;
  notes: string | null;
  created_at?: string;
  employee_name?: string;
}

export interface Deduction {
  id: number;
  employee_id: number;
  date: string;
  type: 'Comida' | 'Vales' | 'Otro';
  amount: number;
  description: string | null;
  created_at?: string;
  employee_name?: string;
}

export interface ImageInput {
  file_name: string;
  mime_type: string;
  base64: string;
}

export interface ExtractedDeduction {
  file_name: string;
  date: string | null;
  type: 'Comida' | 'Vales' | 'Otro' | null;
  amount: number | null;
  description: string | null;
  confidence: 'high' | 'low';
  error: string | null;
}

export interface ExtractedWorkRecord {
  file_name: string;
  date: string | null;
  is_direct_entry: boolean;
  entry_time: string | null;
  exit_time: string | null;
  direct_hours: number | null;
  notes: string | null;
  confidence: 'high' | 'low';
  error: string | null;
}

export interface DailyBreakdown {
  date: string;
  regular_hours: number;
  overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  daily_total: number;
  deductions: number;
}

export interface PayrollReportData {
  employee_id: number;
  period_start: string;
  period_end: string;
  work_records: WorkRecord[];
  deductions: Deduction[];
  daily_breakdown: DailyBreakdown[];
  total_regular_hours: number;
  total_overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  total_deductions: number;
  gross_pay: number;
  net_pay: number;
}

export interface PayrollHistory {
  id: number;
  employee_id: number;
  period_start: string;
  period_end: string;
  total_regular_hours: number;
  total_overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  total_deductions: number;
  net_pay: number;
  paid_at: string | null;
  created_at: string;
}

export interface UpdateStatus {
  status: 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';
  version?: string;
  progress?: number;
  error?: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface User {
  id: number;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface ApiService {
  // Auto-updater
  checkForUpdates(): void;
  quitAndInstall(): void;
  onUpdateStatus(callback: (payload: UpdateStatus) => void): () => void;

  // Auth
  setAuthToken(token: string | null): void;
  onUnauthorized(callback: () => void): () => void;
  login(username: string, password: string): Promise<LoginResponse>;
  getMe(): Promise<AuthUser>;

  // Users
  getUsers(): Promise<User[]>;
  createUser(dto: { username: string; password: string; role?: UserRole }): Promise<{ id: number; username: string; role: UserRole }>;
  deleteUser(id: number): Promise<{ success: boolean }>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getAllEmployees(): Promise<Employee[]>;
  addEmployee(name: string): Promise<{ id: number }>;
  updateEmployee(id: number, name: string): Promise<{ success: boolean }>;
  deleteEmployee(id: number): Promise<{ success: boolean }>;

  // Rate Rules
  getRateRules(): Promise<RateRule[]>;
  updateRateRule(
    id: number,
    maxReg: number,
    regRate: number,
    otRate: number,
    lunchDuration: number
  ): Promise<{ success: boolean }>;

  // Employee Rates
  getEmployeeRates(employeeId?: number): Promise<EmployeeRate[]>;
  createEmployeeRate(dto: {
    employee_id: number;
    day_of_week: number;
    max_regular_hours?: number;
    regular_rate?: number;
    overtime_rate?: number;
    lunch_duration?: number;
  }): Promise<{ id: number }>;
  updateEmployeeRate(
    id: number,
    dto: {
      day_of_week?: number;
      max_regular_hours?: number;
      regular_rate?: number;
      overtime_rate?: number;
      lunch_duration?: number;
      is_active?: boolean;
    }
  ): Promise<{ success: boolean }>;
  deleteEmployeeRate(id: number): Promise<{ success: boolean }>;

  // Work Records
  getWorkRecords(empId: number, start?: string, end?: string): Promise<WorkRecord[]>;
  getWorkRecordsAll(start?: string, end?: string): Promise<WorkRecord[]>;
  addWorkRecord(record: Omit<WorkRecord, 'id' | 'created_at'>): Promise<{ id: number }>;
  updateWorkRecord(id: number, record: Partial<Omit<WorkRecord, 'id' | 'created_at'>>): Promise<{ success: boolean }>;
  deleteWorkRecord(id: number): Promise<{ success: boolean }>;
  extractWorkRecords(images: ImageInput[]): Promise<ExtractedWorkRecord[]>;

  // Deductions
  getDeductions(empId?: number | null, start?: string, end?: string): Promise<Deduction[]>;
  addDeduction(ded: Omit<Deduction, 'id' | 'created_at'>): Promise<{ id: number }>;
  deleteDeduction(id: number): Promise<{ success: boolean }>;
  extractDeductions(images: ImageInput[]): Promise<ExtractedDeduction[]>;

  // Payroll
  calculatePayroll(empId: number, workStart: string, workEnd: string, deductionStart: string, deductionEnd: string): Promise<PayrollReportData>;
  calculatePayrollAll(workStart: string, workEnd: string, deductionStart: string, deductionEnd: string): Promise<(PayrollReportData & { employee_name?: string })[]>;
  savePayroll(empId: number, start: string, end: string, paidAt: string): Promise<{ id: number }>;
  getPayrollHistory(empId?: number | null): Promise<PayrollHistory[]>;
}

declare global {
  interface Window {
    api: ApiService;
  }
}

export {};
