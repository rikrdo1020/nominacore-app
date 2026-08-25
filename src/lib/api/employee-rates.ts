import type { EmployeeRate } from '../../types/api';

export function getEmployeeRates(employeeId?: number): Promise<EmployeeRate[]> {
  return window.api.getEmployeeRates(employeeId);
}

export function createEmployeeRate(dto: {
  employee_id: number;
  day_of_week: number;
  max_regular_hours?: number;
  regular_rate?: number;
  overtime_rate?: number;
  lunch_duration?: number;
}): Promise<{ id: number }> {
  return window.api.createEmployeeRate(dto);
}

export function updateEmployeeRate(
  id: number,
  dto: {
    day_of_week?: number;
    max_regular_hours?: number;
    regular_rate?: number;
    overtime_rate?: number;
    lunch_duration?: number;
    is_active?: boolean;
  }
): Promise<{ success: boolean }> {
  return window.api.updateEmployeeRate(id, dto);
}
