import type { PayrollReportData } from '../../types/api';

export function calculatePayroll(
  empId: number,
  workStart: string,
  workEnd: string,
  deductionStart: string,
  deductionEnd: string
): Promise<PayrollReportData> {
  return window.api.calculatePayroll(empId, workStart, workEnd, deductionStart, deductionEnd);
}

export function calculatePayrollAll(
  workStart: string,
  workEnd: string,
  deductionStart: string,
  deductionEnd: string
): Promise<(PayrollReportData & { employee_name?: string })[]> {
  return window.api.calculatePayrollAll(workStart, workEnd, deductionStart, deductionEnd);
}
