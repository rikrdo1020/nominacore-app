import express, { Request, Response } from 'express';
import cors from 'cors';
import * as db from './database';

export function startServer(port = 3456) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Employees
  app.get('/api/employees', (_req: Request, res: Response) => res.json(db.getEmployees()));
  app.get('/api/employees/all', (_req: Request, res: Response) => res.json(db.getAllEmployees()));
  app.post('/api/employees', (req: Request, res: Response) => {
    const id = db.addEmployee(req.body.name);
    res.json({ id });
  });
  app.put('/api/employees/:id', (req: Request, res: Response) => {
    db.updateEmployee(Number(req.params.id), req.body.name);
    res.json({ success: true });
  });
  app.delete('/api/employees/:id', (req: Request, res: Response) => {
    db.deleteEmployee(Number(req.params.id));
    res.json({ success: true });
  });

  // Rate Rules
  app.get('/api/rate-rules', (_req: Request, res: Response) => res.json(db.getRateRules()));
  app.put('/api/rate-rules/:id', (req: Request, res: Response) => {
    db.updateRateRule(
      Number(req.params.id),
      req.body.max_regular_hours,
      req.body.regular_rate,
      req.body.overtime_rate,
      req.body.lunch_duration
    );
    res.json({ success: true });
  });

  // Work Records
  app.get('/api/work-records', (req: Request, res: Response) => {
    const { employee_id, start_date, end_date } = req.query;
    if (employee_id) {
      res.json(db.getWorkRecords(Number(employee_id), start_date as string, end_date as string));
    } else {
      res.json(db.getWorkRecordsAll(start_date as string, end_date as string));
    }
  });
  app.post('/api/work-records', (req: Request, res: Response) => {
    const id = db.addWorkRecord(req.body);
    res.json({ id });
  });
  app.put('/api/work-records/:id', (req: Request, res: Response) => {
    db.updateWorkRecord(Number(req.params.id), req.body);
    res.json({ success: true });
  });
  app.delete('/api/work-records/:id', (req: Request, res: Response) => {
    db.deleteWorkRecord(Number(req.params.id));
    res.json({ success: true });
  });

  // Deductions
  app.get('/api/deductions', (req: Request, res: Response) => {
    const { employee_id, start_date, end_date } = req.query;
    res.json(db.getDeductions(Number(employee_id) || null, start_date as string, end_date as string));
  });
  app.post('/api/deductions', (req: Request, res: Response) => {
    const id = db.addDeduction(req.body);
    res.json({ id });
  });
  app.delete('/api/deductions/:id', (req: Request, res: Response) => {
    db.deleteDeduction(Number(req.params.id));
    res.json({ success: true });
  });

  // Payroll
  app.get('/api/payroll/calculate', (req: Request, res: Response) => {
    const { employee_id, start_date, end_date } = req.query;
    res.json(db.calculatePayroll(Number(employee_id), start_date as string, end_date as string));
  });
  app.get('/api/payroll/calculate-all', (req: Request, res: Response) => {
    const { start_date, end_date } = req.query;
    res.json(db.calculatePayrollAll(start_date as string, end_date as string));
  });
  app.post('/api/payroll/save', (req: Request, res: Response) => {
    const id = db.savePayroll(req.body.employee_id, req.body.period_start, req.body.period_end, req.body.paid_at);
    res.json({ id });
  });
  app.get('/api/payroll/history', (req: Request, res: Response) => {
    res.json(db.getPayrollHistory(Number(req.query.employee_id) || null));
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => res.json({ status: 'ok', time: new Date().toISOString() }));

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`NominaCore API server running on port ${port}`);
  });

  return server;
}

export function stopServer(server: ReturnType<typeof startServer> | null): void {
  if (server) {
    server.close();
    console.log('API server stopped');
  }
}
