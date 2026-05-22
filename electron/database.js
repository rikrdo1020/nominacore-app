const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let db = null;
let SQL = null;
const DB_PATH = path.join(app.getPath('userData'), 'valentini.db');

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

async function initDatabase() {
  SQL = await initSqlJs();
  loadOrCreateDatabase();
  createTables();
  seedDefaultRates();
  return db;
}

function loadOrCreateDatabase() {
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    saveDatabase();
  }
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function createTables() {
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

function seedDefaultRates() {
  const count = db.exec("SELECT COUNT(*) as c FROM rate_rules");
  if (count.length > 0 && count[0].values[0][0] > 0) return;

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
function getEmployees() {
  return queryAll("SELECT id, name, is_active, created_at FROM employees WHERE is_active = 1 ORDER BY name");
}

function getAllEmployees() {
  return queryAll("SELECT id, name, is_active, created_at FROM employees ORDER BY name");
}

function addEmployee(name) {
  db.run("INSERT INTO employees (name) VALUES (?)", [name]);
  saveDatabase();
  return db.exec("SELECT last_insert_rowid()")[0].values[0][0];
}

function updateEmployee(id, name) {
  db.run("UPDATE employees SET name = ? WHERE id = ?", [name, id]);
  saveDatabase();
}

function deleteEmployee(id) {
  db.run("UPDATE employees SET is_active = 0 WHERE id = ?", [id]);
  saveDatabase();
}

// === CRUD Rate Rules ===
function getRateRules() {
  return queryAll("SELECT * FROM rate_rules ORDER BY day_of_week");
}

function updateRateRule(id, maxReg, regRate, otRate, lunchDuration) {
  db.run(
    "UPDATE rate_rules SET max_regular_hours = ?, regular_rate = ?, overtime_rate = ?, lunch_duration = ? WHERE id = ?",
    [maxReg, regRate, otRate, lunchDuration, id]
  );
  saveDatabase();
}

// === CRUD Work Records ===
function getWorkRecords(employeeId, startDate, endDate) {
  let query = "SELECT * FROM work_records WHERE 1=1";
  const params = [];
  if (employeeId) { query += " AND employee_id = ?"; params.push(employeeId); }
  if (startDate) { query += " AND date >= ?"; params.push(startDate); }
  if (endDate) { query += " AND date <= ?"; params.push(endDate); }
  query += " ORDER BY date DESC, employee_id";
  return queryAll(query, params);
}

function getWorkRecordsAll(startDate, endDate) {
  let query = `
    SELECT wr.*, e.name as employee_name
    FROM work_records wr
    JOIN employees e ON e.id = wr.employee_id
    WHERE 1=1
  `;
  const params = [];
  if (startDate) { query += " AND wr.date >= ?"; params.push(startDate); }
  if (endDate) { query += " AND wr.date <= ?"; params.push(endDate); }
  query += " ORDER BY wr.date DESC, e.name";
  return queryAll(query, params);
}

function addWorkRecord(record) {
  db.run(
    "INSERT INTO work_records (employee_id, date, entry_time, exit_time, direct_hours, is_direct_entry, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [record.employee_id, record.date, record.entry_time || null, record.exit_time || null, record.direct_hours || null, record.is_direct_entry ? 1 : 0, record.notes || null]
  );
  saveDatabase();
  return db.exec("SELECT last_insert_rowid()")[0].values[0][0];
}

function updateWorkRecord(id, record) {
  db.run(
    "UPDATE work_records SET entry_time = ?, exit_time = ?, direct_hours = ?, is_direct_entry = ?, notes = ? WHERE id = ?",
    [record.entry_time || null, record.exit_time || null, record.direct_hours || null, record.is_direct_entry ? 1 : 0, record.notes || null, id]
  );
  saveDatabase();
}

function deleteWorkRecord(id) {
  db.run("DELETE FROM work_records WHERE id = ?", [id]);
  saveDatabase();
}

// === CRUD Deductions ===
function getDeductions(employeeId, startDate, endDate) {
  let query = "SELECT d.*, e.name as employee_name FROM deductions d JOIN employees e ON e.id = d.employee_id WHERE 1=1";
  const params = [];
  if (employeeId) { query += " AND d.employee_id = ?"; params.push(employeeId); }
  if (startDate) { query += " AND d.date >= ?"; params.push(startDate); }
  if (endDate) { query += " AND d.date <= ?"; params.push(endDate); }
  query += " ORDER BY d.date DESC";
  return queryAll(query, params);
}

function addDeduction(ded) {
  db.run(
    "INSERT INTO deductions (employee_id, date, type, amount, description) VALUES (?, ?, ?, ?, ?)",
    [ded.employee_id, ded.date, ded.type, ded.amount, ded.description || null]
  );
  saveDatabase();
  return db.exec("SELECT last_insert_rowid()")[0].values[0][0];
}

function deleteDeduction(id) {
  db.run("DELETE FROM deductions WHERE id = ?", [id]);
  saveDatabase();
}

// === Payroll Calculation ===
function calculatePayroll(employeeId, startDate, endDate) {
  const rateRules = getRateRules();
  const workRecords = getWorkRecords(employeeId, startDate, endDate);
  const deductions = getDeductions(employeeId, startDate, endDate);

  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalRegularPay = 0;
  let totalOvertimePay = 0;

  for (const wr of workRecords) {
    const d = new Date(wr.date + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const dayOfWeekAdjusted = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday=0 ... Sunday=6
    const rule = rateRules.find(r => r.day_of_week === dayOfWeekAdjusted);

    let hoursWorked = 0;
    if (wr.is_direct_entry && wr.direct_hours) {
      hoursWorked = wr.direct_hours;
    } else if (wr.entry_time && wr.exit_time) {
      const [eh, em] = wr.entry_time.split(':').map(Number);
      const [xh, xm] = wr.exit_time.split(':').map(Number);
      let entryMin = eh * 60 + em;
      let exitMin = xh * 60 + xm;
      if (exitMin <= entryMin) exitMin += 24 * 60;
      hoursWorked = (exitMin - entryMin) / 60;
    }

    if (rule) {
      const maxReg = rule.max_regular_hours;
      const regRate = rule.regular_rate;
      const otRate = rule.overtime_rate;
      const lunchDuration = rule.lunch_duration || 0;
      const netHours = Math.max(0, hoursWorked - lunchDuration);

      if (maxReg > 0 && netHours > maxReg) {
        totalRegularHours += maxReg;
        totalOvertimeHours += netHours - maxReg;
        totalRegularPay += maxReg * regRate;
        totalOvertimePay += (netHours - maxReg) * otRate;
      } else {
        totalRegularHours += netHours;
        totalRegularPay += netHours * (maxReg > 0 ? regRate : otRate);
      }
    }
  }

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const grossPay = totalRegularPay + totalOvertimePay;
  const netPay = grossPay - totalDeductions;

  return {
    employee_id: employeeId,
    period_start: startDate,
    period_end: endDate,
    work_records: workRecords,
    deductions: deductions,
    total_regular_hours: Math.round(totalRegularHours * 100) / 100,
    total_overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
    regular_pay: Math.round(totalRegularPay * 100) / 100,
    overtime_pay: Math.round(totalOvertimePay * 100) / 100,
    total_deductions: Math.round(totalDeductions * 100) / 100,
    gross_pay: Math.round(grossPay * 100) / 100,
    net_pay: Math.round(netPay * 100) / 100,
  };
}

function calculatePayrollAll(startDate, endDate) {
  const employees = getEmployees();
  const results = [];
  for (const emp of employees) {
    const calc = calculatePayroll(emp.id, startDate, endDate);
    results.push({
      employee_id: emp.id,
      employee_name: emp.name,
      ...calc
    });
  }
  return results;
}

function savePayroll(employeeId, startDate, endDate, paidAt) {
  const calc = calculatePayroll(employeeId, startDate, endDate);
  db.run(
    "INSERT INTO payroll (employee_id, period_start, period_end, total_regular_hours, total_overtime_hours, regular_pay, overtime_pay, total_deductions, net_pay, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [employeeId, startDate, endDate, calc.total_regular_hours, calc.total_overtime_hours, calc.regular_pay, calc.overtime_pay, calc.total_deductions, calc.net_pay, paidAt]
  );
  saveDatabase();
  return db.exec("SELECT last_insert_rowid()")[0].values[0][0];
}

function getPayrollHistory(employeeId) {
  let query = "SELECT * FROM payroll WHERE 1=1";
  const params = [];
  if (employeeId) { query += " AND employee_id = ?"; params.push(employeeId); }
  query += " ORDER BY period_start DESC";
  return queryAll(query, params);
}

module.exports = {
  initDatabase,
  saveDatabase,
  getEmployees,
  getAllEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getRateRules,
  updateRateRule,
  getWorkRecords,
  getWorkRecordsAll,
  addWorkRecord,
  updateWorkRecord,
  deleteWorkRecord,
  getDeductions,
  addDeduction,
  deleteDeduction,
  calculatePayroll,
  calculatePayrollAll,
  savePayroll,
  getPayrollHistory,
};
