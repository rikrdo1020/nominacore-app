import type { Deduction, ImageInput, ExtractedDeduction } from '../../types/api';

export function getDeductions(empId?: number | null, start?: string, end?: string): Promise<Deduction[]> {
  return window.api.getDeductions(empId, start, end);
}

export function addDeduction(ded: Omit<Deduction, 'id' | 'created_at'>): Promise<{ id: number }> {
  return window.api.addDeduction(ded);
}

export function deleteDeduction(id: number): Promise<{ success: boolean }> {
  return window.api.deleteDeduction(id);
}

export function extractDeductions(images: ImageInput[]): Promise<ExtractedDeduction[]> {
  return window.api.extractDeductions(images);
}
