const express = require('express');
const cors = require('cors');
const db = require('./database');

function startServer(port = 3456) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Employees
  app.get('/api/employees', (req, res) => res.json(db.getEmployees()));
  app.get('/api/employees/all', (req, res) => res.json(db.getAllEmployees()));
  app.post('/api/employees', (req, res) => {
    const id = db.addEmployee(req.body.name);
    res.json({ id });
  });
  app.put('/api/employees/:id', (req, res) => {
    db.updateEmployee(Number(req.params.id), req.body.name);
    res.json({ success: true });
  });
  app.delete('/api/employees/:id', (req, res) => {
    db.deleteEmployee(Number(req.params.id));
    res.json({ success: true });
  });

  // Rate Rules
  app.get('/api/rate-rules', (req, res) => res.json(db.getRateRules()));
  app.put('/api/rate-rules/:id', (req, res) => {
    db.updateRateRule(Number(req.params.id), req.body.max_regular_hours, req.body.regular_rate, req.body.overtime_rate, req.body.lunch_duration);
    res.json({ success: true });
  });

  // Work Records
  app.get('/api/work-records', (req, res) => {
    const { employee_id, start_date, end_date } = req.query;
    if (employee_id) {
      res.json(db.getWorkRecords(Number(employee_id), start_date, end_date));
    } else {
      res.json(db.getWorkRecordsAll(start_date, end_date));
    }
  });
  app.post('/api/work-records', (req, res) => {
    const id = db.addWorkRecord(req.body);
    res.json({ id });
  });
  app.put('/api/work-records/:id', (req, res) => {
    db.updateWorkRecord(Number(req.params.id), req.body);
    res.json({ success: true });
  });
  app.delete('/api/work-records/:id', (req, res) => {
    db.deleteWorkRecord(Number(req.params.id));
    res.json({ success: true });
  });

  // Deductions
  app.get('/api/deductions', (req, res) => {
    const { employee_id, start_date, end_date } = req.query;
    res.json(db.getDeductions(Number(employee_id) || null, start_date, end_date));
  });
  app.post('/api/deductions', (req, res) => {
    const id = db.addDeduction(req.body);
    res.json({ id });
  });
  app.delete('/api/deductions/:id', (req, res) => {
    db.deleteDeduction(Number(req.params.id));
    res.json({ success: true });
  });

  // Payroll
  app.get('/api/payroll/calculate', (req, res) => {
    const { employee_id, start_date, end_date } = req.query;
    res.json(db.calculatePayroll(Number(employee_id), start_date, end_date));
  });
  app.get('/api/payroll/calculate-all', (req, res) => {
    const { start_date, end_date } = req.query;
    res.json(db.calculatePayrollAll(start_date, end_date));
  });
  app.post('/api/payroll/save', (req, res) => {
    const id = db.savePayroll(req.body.employee_id, req.body.period_start, req.body.period_end, req.body.paid_at);
    res.json({ id });
  });
  app.get('/api/payroll/history', (req, res) => {
    res.json(db.getPayrollHistory(Number(req.query.employee_id) || null));
  });

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Valentini API server running on port ${port}`);
  });

  return server;
}

function stopServer(server) {
  if (server) {
    server.close();
    console.log('API server stopped');
  }
}

module.exports = { startServer, stopServer };
