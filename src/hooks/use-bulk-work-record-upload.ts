import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addWorkRecord, extractWorkRecords } from '../lib/api/work-records';
import { getEmployees } from '../lib/api/employees';
import { queryKeys } from '../lib/query-keys';
import { compressImageFile } from '../utils/image';

export const MAX_BULK_IMAGES = 20;
// Original file before client-side compression — generous, since the
// compress step is what actually controls what gets sent/billed.
const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024;

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export interface BulkWorkRecordRow {
  id: string;
  fileName: string;
  date: string;
  isDirectEntry: boolean;
  entryTime: string;
  exitTime: string;
  directHours: string;
  notes: string;
  confidence: 'high' | 'low';
  extractError: string | null;
}

export function isRowValid(row: BulkWorkRecordRow): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return false;
  if (row.isDirectEntry) return !!row.directHours && parseFloat(row.directHours) > 0;
  return !!row.entryTime && !!row.exitTime;
}

let rowIdCounter = 0;
function nextRowId(): string {
  rowIdCounter += 1;
  return `wr-row-${rowIdCounter}`;
}

export function useBulkWorkRecordUpload(employeeId: string) {
  const queryClient = useQueryClient();
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagingError, setStagingError] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkWorkRecordRow[]>([]);
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
      const results = await extractWorkRecords(
        compressed.map((c) => ({ file_name: c.fileName, mime_type: c.mimeType, base64: c.base64 })),
      );
      return results;
    },
    onSuccess: (results) => {
      const newRows = results.map((r) => ({
        id: nextRowId(),
        fileName: r.file_name,
        date: r.date ?? '',
        isDirectEntry: r.is_direct_entry,
        entryTime: r.entry_time ?? '',
        exitTime: r.exit_time ?? '',
        directHours: r.direct_hours != null ? String(r.direct_hours) : '',
        notes: r.notes ?? '',
        confidence: (r.error ? 'low' : r.confidence) as 'high' | 'low',
        extractError: r.error,
      }));
      setRows((prev) => [...prev, ...newRows]);
      setStagedFiles([]);
    },
  });

  const editRow = <K extends keyof BulkWorkRecordRow>(id: string, field: K, value: BulkWorkRecordRow[K]) => {
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
        isDirectEntry: false,
        entryTime: '08:00',
        exitTime: '17:00',
        directHours: '',
        notes: '',
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
          addWorkRecord({
            employee_id: Number(employeeId),
            date: row.date,
            is_direct_entry: row.isDirectEntry ? 1 : 0,
            entry_time: row.isDirectEntry ? null : row.entryTime,
            exit_time: row.isDirectEntry ? null : row.exitTime,
            direct_hours: row.isDirectEntry ? parseFloat(row.directHours) : null,
            notes: row.notes || null,
          }),
        ),
      );
      return validRows.map((r) => r.id);
    },
    onSuccess: (savedIds) => {
      queryClient.invalidateQueries({ queryKey: ['workRecords'] });
      setRows((prev) => prev.filter((row) => !savedIds.includes(row.id)));
      setSaveError(null);
    },
    onError: () => setSaveError('Error al guardar uno o más registros'),
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
