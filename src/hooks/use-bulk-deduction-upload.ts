import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDeduction, extractDeductions } from '../lib/api/deductions';
import { getEmployees } from '../lib/api/employees';
import { queryKeys } from '../lib/query-keys';
import { compressImageFile } from '../utils/image';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export const MAX_BULK_IMAGES = 20;
// Original file before client-side compression — generous, since the
// compress step is what actually controls what gets sent/billed.
const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024;

export interface BulkPreviewRow {
  id: string;
  fileName: string;
  date: string;
  type: 'Comida' | 'Vales' | 'Otro';
  amount: string;
  description: string;
  confidence: 'high' | 'low';
  extractError: string | null;
}

export function isRowValid(row: BulkPreviewRow): boolean {
  const amountNum = parseFloat(row.amount);
  return /^\d{4}-\d{2}-\d{2}$/.test(row.date) && !!row.amount && amountNum > 0;
}

let rowIdCounter = 0;
function nextRowId(): string {
  rowIdCounter += 1;
  return `row-${rowIdCounter}`;
}

export function useBulkDeductionUpload(employeeId: string) {
  const queryClient = useQueryClient();
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagingError, setStagingError] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkPreviewRow[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list,
    queryFn: getEmployees,
  });
  const selectedEmployee = (employeesQuery.data ?? []).find((e) => String(e.id) === employeeId) ?? null;

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const invalid = incoming.find((f) => !f.type.startsWith('image/'));
    if (invalid) {
      setStagingError(`"${invalid.name}" no es una imagen`);
      return;
    }
    const tooLarge = incoming.find((f) => f.size > MAX_RAW_FILE_BYTES);
    if (tooLarge) {
      setStagingError(`"${tooLarge.name}" supera ${MAX_RAW_FILE_BYTES / (1024 * 1024)}MB`);
      return;
    }
    const combined = [...stagedFiles, ...incoming];
    if (combined.length > MAX_BULK_IMAGES) {
      setStagingError(`Máximo ${MAX_BULK_IMAGES} imágenes por carga`);
      return;
    }
    setStagingError(null);
    setStagedFiles(combined);
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const compressed = await Promise.all(stagedFiles.map(compressImageFile));
      const results = await extractDeductions(
        compressed.map((c) => ({ file_name: c.fileName, mime_type: c.mimeType, base64: c.base64 })),
      );
      return results;
    },
    onSuccess: (results) => {
      const newRows = results.map((r) => ({
        id: nextRowId(),
        fileName: r.file_name,
        date: r.date ?? '',
        type: r.type ?? 'Otro',
        amount: r.amount != null ? String(r.amount) : '',
        description: r.description ?? '',
        confidence: (r.error ? 'low' : r.confidence) as 'high' | 'low',
        extractError: r.error,
      }));
      setRows((prev) => [...prev, ...newRows]);
      setStagedFiles([]);
    },
  });

  const editRow = <K extends keyof BulkPreviewRow>(id: string, field: K, value: BulkPreviewRow[K]) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const addManualRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: nextRowId(),
        fileName: 'Manual',
        date: today(),
        type: 'Comida',
        amount: '',
        description: '',
        confidence: 'high',
        extractError: null,
      },
    ]);
  };

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const validRows = rows.filter(isRowValid);
      await Promise.all(
        validRows.map((row) =>
          addDeduction({
            employee_id: Number(employeeId),
            date: row.date,
            type: row.type,
            amount: parseFloat(row.amount),
            description: row.description || null,
          }),
        ),
      );
      return validRows.map((r) => r.id);
    },
    onSuccess: (savedIds) => {
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
      setRows((prev) => prev.filter((row) => !savedIds.includes(row.id)));
      setSaveError(null);
    },
    onError: () => setSaveError('Error al guardar uno o más descuentos'),
  });

  return {
    selectedEmployee,
    stagedFiles,
    stagingError,
    addFiles,
    removeStagedFile,
    rows,
    editRow,
    removeRow,
    addManualRow,
    analyze: analyzeMutation.mutate,
    isAnalyzing: analyzeMutation.isPending,
    analyzeError: analyzeMutation.isError ? 'Error al analizar imágenes con IA' : null,
    confirmAll: confirmMutation.mutate,
    isSaving: confirmMutation.isPending,
    saveError,
    validRowCount: rows.filter(isRowValid).length,
  };
}
