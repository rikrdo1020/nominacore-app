"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
exports.stopServer = stopServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db = __importStar(require("./database"));
function startServer(port = 3456) {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // Employees
    app.get('/api/employees', (_req, res) => res.json(db.getEmployees()));
    app.get('/api/employees/all', (_req, res) => res.json(db.getAllEmployees()));
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
    app.get('/api/rate-rules', (_req, res) => res.json(db.getRateRules()));
    app.put('/api/rate-rules/:id', (req, res) => {
        db.updateRateRule(Number(req.params.id), req.body.max_regular_hours, req.body.regular_rate, req.body.overtime_rate, req.body.lunch_duration);
        res.json({ success: true });
    });
    // Work Records
    app.get('/api/work-records', (req, res) => {
        const { employee_id, start_date, end_date } = req.query;
        if (employee_id) {
            res.json(db.getWorkRecords(Number(employee_id), start_date, end_date));
        }
        else {
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
    app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`NominaCore API server running on port ${port}`);
    });
    return server;
}
function stopServer(server) {
    if (server) {
        server.close();
        console.log('API server stopped');
    }
}
//# sourceMappingURL=server.js.map