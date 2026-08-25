import type { WorkRecord } from '../../types/api';

export function getWorkRecords(empId: number, start?: string, end?: string): Promise<WorkRecord[]> {
  return window.api.getWorkRecords(empId, start, end);
}

export function getWorkRecordsAll(start?: string, end?: string): Promise<WorkRecord[]> {
  return window.api.getWorkRecordsAll(start, end);
}

export function addWorkRecord(record: Omit<WorkRecord, 'id' | 'created_at'>): Promise<{ id: number }> {
  return window.api.addWorkRecord(record);
}

export function deleteWorkRecord(id: number): Promise<{ success: boolean }> {
  return window.api.deleteWorkRecord(id);
}
