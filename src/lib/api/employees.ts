import type { Employee } from '../../types/api';

export function getEmployees(): Promise<Employee[]> {
  return window.api.getEmployees();
}

export function addEmployee(name: string): Promise<{ id: number }> {
  return window.api.addEmployee(name);
}

export function updateEmployee(id: number, name: string): Promise<{ success: boolean }> {
  return window.api.updateEmployee(id, name);
}

export function deleteEmployee(id: number): Promise<{ success: boolean }> {
  return window.api.deleteEmployee(id);
}
