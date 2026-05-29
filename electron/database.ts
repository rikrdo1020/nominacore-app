import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

import type { Database as SqlJsDatabase } from 'sql.js';

let db: SqlJsDatabase | null = null;
let SQL: typeof SqlJsDatabase | null = null;
const DB_PATH = path.join(app.getPath('userData'), 'valentini.db');

function queryAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export async function initDatabase(): Promise<SqlJsDatabase> {
  SQL = await initSqlJs();
  loadOrCreateDatabase();
  createTables();
  seedDefaultRates();
  if (!db) throw new Error('Failed to initialize database');
  return db;
}

function loadOrCreateDatabase(): void {
  if (!SQL) throw new Error('SQL.js not loaded');
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL(buffer);
  } else {
    db = new SQL();
    saveDatabase();
  }
}

function saveDatabase(): void {
  if (!db) throw new Error('Database not initialized');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function createTables(): void {
  if (!db) throw new Error('Database not initialized');

  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rate_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL,
      day_name TEXT NOT NULL,
      max_regular_hours REAL DEFAULT 8,
      regular_rate REAL DEFAULT 2.50,
      overtime_rate REAL DEFAULT 3.00,
      lunch_duration REAL DEFAULT 0.5,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Migrate existing databases: add lunch_duration column if missing
  try {
    const rateRulesInfo = queryAll("PRAGMA table_info(rate_rules)");
    if (!rateRulesInfo.some(c => c.name === 'lunch_duration')) {
      db.run("ALTER TABLE rate_rules ADD COLUMN lunch_duration REAL DEFAULT 0.5");
    }
  } catch (e) {
    console.error('Migration error for lunch_duration:', e);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS work_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      entry_time TEXT,
      exit_time TEXT,
      direct_hours REAL,
      is_direct_entry INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deductions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Comida', 'Vales', 'Otro')),
      amount REAL NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      total_regular_hours REAL DEFAULT 0,
      total_overtime_hours REAL DEFAULT 0,
      regular_pay REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      total_deductions REAL DEFAULT 0,
      net_pay REAL DEFAULT 0,
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  saveDatabase();
}

function seedDefaultRates(): void {
  if (!db) throw new Error('Database not initialized');
  const count = db.exec("SELECT COUNT(*) as c FROM rate_rules");
  if (count.length > 0 && (count[0].values[0][0] as number) > 0) return;

  const days = [
    { dow: 0, name: 'Lunes', max: 8, reg: 2.50, ot: 3.00, lunch: 0.5 },
    { dow: 1, name: 'Martes', max: 8, reg: 2.50, ot: 3.00, lunch: 0.5 },
    { dow: 2, name: 'Miércoles', max: 8, reg: 2.50, ot: 3.00, lunch: 0.5 },
    { dow: 3, name: 'Jueves', max: 8, reg: 2.50, ot: 3.00, lunch: 0.5 },
    { dow: 4, name: 'Viernes', max: 8, reg: 2.50, ot: 3.00, lunch: 0.5 },
    { dow: 5, name: 'Sábado', max: 8, reg: 2.50, ot: 3.00, lunch: 0.5 },
    { dow: 6, name: 'Domingo', max: 0, reg: 3.00, ot: 3.00, lunch: 0.5 },
  ];

  const stmt = db.prepare(
    "INSERT INTO rate_rules (day_of_week, day_name, max_regular_hours, regular_rate, overtime_rate, lunch_duration) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const d of days) {
    stmt.run([d.dow, d.name, d.max, d.reg, d.ot, d.lunch]);
  }
  stmt.free();
  saveDatabase();
}

// === CRUD Employees ===
export function getEmployees(): Record<string, unknown>[] {
  return queryAll("SELECT id, name, is_active, created_at FROM employees WHERE is_active = 1 ORDER BY name");
}

export function getAllEmployees(): Record<string, unknown>[] {
  return queryAll("SELECT id, name, is_active, created_at FROM employees ORDER BY name");
}

export function addEmployee(name: string): number {
  if (!db) throw new Error('Database not initialized');
  db.run("INSERT INTO employees (name) VALUES (?)", [name]);
  saveDatabase();
  const result = db.exec("SELECT last_insert_rowid()")[0];
  return result.values[0][0] as number;
}

export function updateEmployee(id: number, name: string): void {
  if (!db) throw new Error('Database not initialized');
  db.run("UPDATE employees SET name = ? WHERE id = ?", [name, id]);
  saveDatabase();
}

export function deleteEmployee(id: number): void {
  if (!db) throw new Error('Database not initialized');
  db.run("UPDATE employees SET is_active = 0 WHERE id = ?", [id]);
  saveDatabase();
}

// === CRUD Rate Rules ===
export function getRateRules(): Record<string, unknown>[] {
  return queryAll("SELECT * FROM rate_rules ORDER BY day_of_week");
}

export function updateRateRule(id: number, maxReg: number, regRate: number, otRate: number, lunchDuration: number): void {
  if (!db) throw new Error('Database not initialized');
  db.run(
    "UPDATE rate_rules SET max_regular_hours = ?, regular_rate = ?, overtime_rate = ?, lunch_duration = ? WHERE id = ?",
    [maxReg, regRate, otRate, lunchDuration, id]
  );
  saveDatabase();
}

// === CRUD Work Records ===
export function getWorkRecords(employeeId: number | null, startDate?: string, endDate?: string): Record<string, unknown>[] {
  let query = "SELECT * FROM work_records WHERE 1=1";
  const params: unknown[] = [];
  if (employeeId) { query += " AND employee_id = ?"; params.push(employeeId); }
  if (startDate) { query += " AND date >= ?"; params.push(startDate); }
  if (endDate) { query += " AND date <= ?"; params.push(endDate); }
  query += " ORDER BY date DESC, employee_id";
  return queryAll(query, params);
}

export function getWorkRecordsAll(startDate?: string, endDate?: string): Record<string, unknown>[] {
  let query = `
    SELECT wr.*, e.name as employee_name
    FROM work_records wr
    JOIN employees e ON e.id = wr.employee_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (startDate) { query += " AND wr.date >= ?"; params.push(startDate); }
  if (endDate) { query += " AND wr.date <= ?"; params.push(endDate); }
  query += " ORDER BY wr.date DESC, e.name";
  return queryAll(query, params);
}

interface WorkRecordInput {
  employee_id: number;
  date: string;
  entry_time: string | null;
  exit_time: string | null;
  direct_hours: number | null;
  is_direct_entry: number;
  notes: string | null;
}

export function addWorkRecord(record: WorkRecordInput): number {
  if (!db) throw new Error('Database not initialized');
  db.run(
    "INSERT INTO work_records (employee_id, date, entry_time, exit_time, direct_hours, is_direct_entry, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [record.employee_id, record.date, record.entry_time || null, record.exit_time || null, record.direct_hours || null, record.is_direct_entry ? 1 : 0, record.notes || null]
  );
  saveDatabase();
  const result = db.exec("SELECT last_insert_rowid()")[0];
  return result.values[0][0] as number;
}

export function updateWorkRecord(id: number, record: Partial<WorkRecordInput>): void {
  if (!db) throw new Error('Database not initialized');
  db.run(
    "UPDATE work_records SET entry_time = ?, exit_time = ?, direct_hours = ?, is_direct_entry = ?, notes = ? WHERE id = ?",
    [record.entry_time || null, record.exit_time || null, record.direct_hours || null, record.is_direct_entry ? 1 : 0, record.notes || null, id]
  );
  saveDatabase();
}

export function deleteWorkRecord(id: number): void {
  if (!db) throw new Error('Database not initialized');
  db.run("DELETE FROM work_records WHERE id = ?", [id]);
  saveDatabase();
}

// === CRUD Deductions ===
export function getDeductions(employeeId: number | null, startDate?: string, endDate?: string): Record<string, unknown>[] {
  let query = "SELECT d.*, e.name as employee_name FROM deductions d JOIN employees e ON e.id = d.employee_id WHERE 1=1";
  const params: unknown[] = [];
  if (employeeId) { query += " AND d.employee_id = ?"; params.push(employeeId); }
  if (startDate) { query += " AND d.date >= ?"; params.push(startDate); }
  if (endDate) { query += " AND d.date <= ?"; params.push(endDate); }
  query += " ORDER BY d.date DESC";
  return queryAll(query, params);
}

interface DeductionInput {
  employee_id: number;
  date: string;
  type: string;
  amount: number;
  description: string | null;
}

export function addDeduction(ded: DeductionInput): number {
  if (!db) throw new Error('Database not initialized');
  db.run(
    "INSERT INTO deductions (employee_id, date, type, amount, description) VALUES (?, ?, ?, ?, ?)",
    [ded.employee_id, ded.date, ded.type, ded.amount, ded.description || null]
  );
  saveDatabase();
  const result = db.exec("SELECT last_insert_rowid()")[0];
  return result.values[0][0] as number;
}

export function deleteDeduction(id: number): void {
  if (!db) throw new Error('Database not initialized');
  db.run("DELETE FROM deductions WHERE id = ?", [id]);
  saveDatabase();
}

// === Payroll Calculation ===
interface DailyBreakdown {
  date: string;
  regular_hours: number;
  overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  daily_total: number;
  deductions: number;
}

interface PayrollCalcResult {
  employee_id: number;
  period_start: string;
  period_end: string;
  work_records: Record<string, unknown>[];
  deductions: Record<string, unknown>[];
  daily_breakdown: DailyBreakdown[];
  total_regular_hours: number;
  total_overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  total_deductions: number;
  gross_pay: number;
  net_pay: number;
}

export function calculatePayroll(employeeId: number, startDate: string, endDate: string): PayrollCalcResult {
  const rateRules = getRateRules();
  const workRecords = getWorkRecords(employeeId, startDate, endDate);
  const deductions = getDeductions(employeeId, startDate, endDate);

  // Map deductions by date
  const deductionsByDate = new Map<string, number>();
  for (const d of deductions) {
    const date = d.date as string;
    deductionsByDate.set(date, (deductionsByDate.get(date) || 0) + (d.amount as number));
  }

  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalRegularPay = 0;
  let totalOvertimePay = 0;
  const dailyBreakdown: DailyBreakdown[] = [];

  for (const wr of workRecords) {
    const dateStr = wr.date as string;
    const d = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const dayOfWeekAdjusted = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday=0 ... Sunday=6
    const rule = rateRules.find(r => r.day_of_week === dayOfWeekAdjusted);

    let hoursWorked = 0;
    if (wr.is_direct_entry && wr.direct_hours) {
      hoursWorked = wr.direct_hours as number;
    } else if (wr.entry_time && wr.exit_time) {
      const [eh, em] = (wr.entry_time as string).split(':').map(Number);
      const [xh, xm] = (wr.exit_time as string).split(':').map(Number);
      let entryMin = eh * 60 + em;
      let exitMin = xh * 60 + xm;
      if (exitMin <= entryMin) exitMin += 24 * 60;
      hoursWorked = (exitMin - entryMin) / 60;
    }

    let regHours = 0;
    let otHours = 0;
    let regPay = 0;
    let otPay = 0;

    if (rule) {
      const maxReg = rule.max_regular_hours as number;
      const regRate = rule.regular_rate as number;
      const otRate = rule.overtime_rate as number;
      const lunchDuration = (rule.lunch_duration as number) || 0;
      const netHours = Math.max(0, hoursWorked - lunchDuration);

      if (maxReg > 0 && netHours > maxReg) {
        regHours = maxReg;
        otHours = netHours - maxReg;
        regPay = maxReg * regRate;
        otPay = (netHours - maxReg) * otRate;
      } else {
        regHours = netHours;
        regPay = netHours * (maxReg > 0 ? regRate : otRate);
      }
    }

    totalRegularHours += regHours;
    totalOvertimeHours += otHours;
    totalRegularPay += regPay;
    totalOvertimePay += otPay;

    dailyBreakdown.push({
      date: dateStr,
      regular_hours: regHours,
      overtime_hours: otHours,
      regular_pay: regPay,
      overtime_pay: otPay,
      daily_total: regPay + otPay,
      deductions: deductionsByDate.get(dateStr) || 0,
    });
  }

  const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount as number), 0);
  const grossPay = totalRegularPay + totalOvertimePay;
  const netPay = grossPay - totalDeductions;

  return {
    employee_id: employeeId,
    period_start: startDate,
    period_end: endDate,
    work_records: workRecords,
    deductions: deductions,
    daily_breakdown: dailyBreakdown,
    total_regular_hours: totalRegularHours,
    total_overtime_hours: totalOvertimeHours,
    regular_pay: totalRegularPay,
    overtime_pay: totalOvertimePay,
    total_deductions: totalDeductions,
    gross_pay: grossPay,
    net_pay: netPay,
  };
}

export function calculatePayrollAll(startDate: string, endDate: string): (PayrollCalcResult & { employee_name?: string })[] {
  const employees = getEmployees();
  const results: (PayrollCalcResult & { employee_name?: string })[] = [];
  for (const emp of employees) {
    const calc = calculatePayroll(emp.id as number, startDate, endDate);
    results.push({
      ...calc,
      employee_id: emp.id as number,
      employee_name: emp.name as string,
    });
  }
  return results;
}

export function savePayroll(employeeId: number, startDate: string, endDate: string, paidAt: string): number {
  if (!db) throw new Error('Database not initialized');
  const calc = calculatePayroll(employeeId, startDate, endDate);
  db.run(
    "INSERT INTO payroll (employee_id, period_start, period_end, total_regular_hours, total_overtime_hours, regular_pay, overtime_pay, total_deductions, net_pay, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [employeeId, startDate, endDate, calc.total_regular_hours, calc.total_overtime_hours, calc.regular_pay, calc.overtime_pay, calc.total_deductions, calc.net_pay, paidAt]
  );
  saveDatabase();
  const result = db.exec("SELECT last_insert_rowid()")[0];
  return result.values[0][0] as number;
}

export function getPayrollHistory(employeeId: number | null): Record<string, unknown>[] {
  let query = "SELECT * FROM payroll WHERE 1=1";
  const params: unknown[] = [];
  if (employeeId) { query += " AND employee_id = ?"; params.push(employeeId); }
  query += " ORDER BY period_start DESC";
  return queryAll(query, params);
}
