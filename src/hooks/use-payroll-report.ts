import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx-js-style';
import { getEmployees } from '../lib/api/employees';
import { calculatePayroll, calculatePayrollAll } from '../lib/api/payroll';
import { queryKeys } from '../lib/query-keys';
import type { PayrollReportData } from '../types/api';
import { calcHours, formatDateWithDay, formatTime12Hour } from '../utils/time';

type ActionOption = '' | 'print' | 'export-individual' | 'export-all';

export interface PayrollFormValues {
  selectedEmp: string;
  workStartDate: string;
  workEndDate: string;
  deductionStartDate: string;
  deductionEndDate: string;
}

const schema = yup.object({
  selectedEmp: yup.string().required('El empleado es requerido'),
  workStartDate: yup.string().required('La fecha de inicio es requerida'),
  workEndDate: yup.string().required('La fecha de fin es requerida'),
  deductionStartDate: yup.string().required('La fecha de inicio es requerida'),
  deductionEndDate: yup.string().required('La fecha de fin es requerida'),
});

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const defaultValues: PayrollFormValues = {
  selectedEmp: '',
  workStartDate: daysAgo(7),
  workEndDate: new Date().toISOString().split('T')[0],
  deductionStartDate: daysAgo(7),
  deductionEndDate: new Date().toISOString().split('T')[0],
};

const thinBorder = {
  top: { style: 'thin' as any, color: { rgb: '000000' } },
  bottom: { style: 'thin' as any, color: { rgb: '000000' } },
  left: { style: 'thin' as any, color: { rgb: '000000' } },
  right: { style: 'thin' as any, color: { rgb: '000000' } },
};

const titleStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
  fill: { patternType: 'solid' as any, fgColor: { rgb: '1A1A2E' } },
  border: thinBorder,
};

const headerStyle = {
  font: { bold: true, color: { rgb: '000000' } },
  fill: { patternType: 'solid' as any, fgColor: { rgb: 'E9E9E9' } },
  border: thinBorder,
};

const totalStyle = {
  font: { bold: true, color: { rgb: '000000' } },
  fill: { patternType: 'solid' as any, fgColor: { rgb: 'D9E1F2' } },
  border: thinBorder,
};

const grandTotalStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
  fill: { patternType: 'solid' as any, fgColor: { rgb: '0F3460' } },
  border: thinBorder,
};

const getDatesInRange = (start: string, end: string): string[] => {
  const dates: string[] = [];
  const curr = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (curr <= last) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const formatNumber = (val: number): string => val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function buildWorkbook(reports: (PayrollReportData & { employee_name?: string })[], employees: { id: number; name: string }[]) {
  const aoa: any[][] = [];
  const FIXED_COLS = 9; // Fecha, Entrada, Salida, Horas, H.Reg, H.Extra, P.Reg, P.Extra, Total Día

  const applyStyleToRow = (ws: any, row: number, colCount: number, style: object) => {
    for (let C = 0; C < colCount; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: C });
      if (!ws[cellRef]) ws[cellRef] = { v: '' };
      if (!ws[cellRef].s) ws[cellRef].s = {};
      Object.assign(ws[cellRef].s, style);
    }
  };

  const sectionMeta: Array<{ totalCols: number; numDataRows: number }> = [];

  reports.forEach((r) => {
    const fullName = r.employee_name || employees.find(e => e.id === r.employee_id)?.name || `Empleado ${r.employee_id}`;
    const allDates = getDatesInRange(r.period_start, r.period_end);

    const deductionTypes = [...new Set(r.deductions.map(d => d.type))].sort();
    const totalCols = FIXED_COLS + deductionTypes.length + 1;
    sectionMeta.push({ totalCols, numDataRows: allDates.length });

    aoa.push([fullName]);

    aoa.push([
      'Fecha', 'Entrada', 'Salida', 'Horas',
      'H. Regulares', 'H. Extra', 'Pago Regular', 'Pago Extra', 'Total Día',
      ...deductionTypes,
      'Neto a Pagar',
    ]);

    allDates.forEach((dateStr) => {
      const db = r.daily_breakdown?.find(d => d.date === dateStr);
      const wr = r.work_records?.find(w => w.date === dateStr);

      const deductionCols = deductionTypes.map(type => {
        const sum = r.deductions
          .filter(d => d.date === dateStr && d.type === type)
          .reduce((acc, d) => acc + d.amount, 0);
        return sum > 0 ? formatNumber(sum) : '0.00';
      });

      if (db) {
        const hours = wr?.is_direct_entry
          ? (wr.direct_hours?.toFixed(2) || '0.00')
          : (wr?.entry_time && wr?.exit_time ? calcHours(wr.entry_time, wr.exit_time) : '-');

        aoa.push([
          formatDateWithDay(dateStr),
          formatTime12Hour(wr?.entry_time),
          formatTime12Hour(wr?.exit_time),
          hours,
          db.regular_hours.toFixed(2),
          db.overtime_hours.toFixed(2),
          formatNumber(db.regular_pay),
          formatNumber(db.overtime_pay),
          formatNumber(db.daily_total),
          ...deductionCols,
          '',
        ]);
      } else if (wr) {
        const hours = wr.is_direct_entry
          ? (wr.direct_hours?.toFixed(2) || '0.00')
          : (wr.entry_time && wr.exit_time ? calcHours(wr.entry_time, wr.exit_time) : '-');

        aoa.push([
          formatDateWithDay(dateStr),
          formatTime12Hour(wr.entry_time),
          formatTime12Hour(wr.exit_time),
          hours,
          '0.00', '0.00', '0.00', '0.00', '0.00',
          ...deductionCols,
          '',
        ]);
      } else {
        aoa.push([
          formatDateWithDay(dateStr),
          '-', '-', '-',
          '0.00', '0.00', '0.00', '0.00', '0.00',
          ...deductionCols,
          '',
        ]);
      }
    });

    const dailyTotalSum = r.daily_breakdown?.reduce((sum, db) => sum + db.daily_total, 0) || 0;
    const deductionTotals = deductionTypes.map(type => {
      const total = r.deductions
        .filter(d => d.type === type)
        .reduce((acc, d) => acc + d.amount, 0);
      return formatNumber(total);
    });

    aoa.push([
      'TOTALES', '', '', '',
      r.total_regular_hours.toFixed(2),
      r.total_overtime_hours.toFixed(2),
      formatNumber(r.regular_pay),
      formatNumber(r.overtime_pay),
      formatNumber(dailyTotalSum),
      ...deductionTotals,
      formatNumber(r.net_pay),
    ]);

    aoa.push([]);
    aoa.push([]);
  });

  const maxTotalCols = sectionMeta.reduce((max, m) => Math.max(max, m.totalCols), FIXED_COLS);

  let hasGrandTotals = false;
  if (reports.length > 1) {
    hasGrandTotals = true;
    const grandDailyTotal = reports.reduce((sum, r) =>
      sum + (r.daily_breakdown?.reduce((s, db) => s + db.daily_total, 0) || 0), 0);
    const grandNetPay = reports.reduce((sum, r) => sum + r.net_pay, 0);

    aoa.push(['TOTAL QUINCENA', '', '', '', '', '', '', '', formatNumber(grandDailyTotal)]);
    aoa.push(['TOTAL QUINCENA CON DESCUENTOS (NETO A PAGAR)', '', '', '', '', '', '', '', formatNumber(grandNetPay)]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  range.e.c = Math.max(range.e.c, maxTotalCols - 1);
  ws['!ref'] = XLSX.utils.encode_range(range);

  let currentRow = 0;
  sectionMeta.forEach((meta) => {
    applyStyleToRow(ws, currentRow, meta.totalCols, titleStyle);
    currentRow++;

    applyStyleToRow(ws, currentRow, meta.totalCols, headerStyle);
    currentRow++;

    for (let i = 0; i < meta.numDataRows; i++) {
      applyStyleToRow(ws, currentRow, meta.totalCols, { border: thinBorder });
      currentRow++;
    }

    applyStyleToRow(ws, currentRow, meta.totalCols, totalStyle);
    currentRow++;

    currentRow += 2;
  });

  if (hasGrandTotals) {
    applyStyleToRow(ws, currentRow, maxTotalCols, grandTotalStyle);
    const row1 = currentRow;
    currentRow++;
    applyStyleToRow(ws, currentRow, maxTotalCols, grandTotalStyle);
    const row2 = currentRow;
    currentRow++;

    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push(
      { s: { r: row1, c: 0 }, e: { r: row1, c: 7 } },
      { s: { r: row2, c: 0 }, e: { r: row2, c: 7 } },
    );
  }

  const deductionColWidths = Array.from({ length: maxTotalCols - FIXED_COLS }, () => ({ wch: 14 }));
  ws['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, ...deductionColWidths,
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte General');
  return wb;
}

export function usePayrollReport() {
  const [report, setReport] = useState<PayrollReportData | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionOption>('');
  const actionRef = useRef<HTMLDivElement>(null);

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list,
    queryFn: getEmployees,
  });

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PayrollFormValues>({
    resolver: yupResolver(schema),
    defaultValues,
  });

  const selectedEmpValue = watch('selectedEmp');
  const employees = employeesQuery.data ?? [];
  const empName = employees.find(e => e.id === Number(selectedEmpValue))?.name || '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
        setActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      setActionOpen(false);
    };
  }, []);

  const generateMutation = useMutation({
    mutationFn: (values: PayrollFormValues) =>
      calculatePayroll(
        Number(values.selectedEmp),
        values.workStartDate,
        values.workEndDate,
        values.deductionStartDate,
        values.deductionEndDate
      ),
    onSuccess: (data) => setReport(data),
    onError: () => setReport(null),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await generateMutation.mutateAsync(values);
    } catch {
      // surfaced below via generateMutation.error / loadError
    }
  });

  const print = () => window.print();

  const exportIndividual = () => {
    if (!report) return;
    const values = getValues();
    const r = { ...report, employee_name: empName };
    const wb = buildWorkbook([r], employees);
    const filename = `Reporte_${empName.replace(/\s+/g, '_')}_Horas_${values.workStartDate}_al_${values.workEndDate}_Desc_${values.deductionStartDate}_al_${values.deductionEndDate}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const exportAll = async () => {
    const values = getValues();
    if (!values.workStartDate || !values.workEndDate || !values.deductionStartDate || !values.deductionEndDate) return;
    setExportingAll(true);
    setExportError(null);
    try {
      const allReports = await calculatePayrollAll(
        values.workStartDate,
        values.workEndDate,
        values.deductionStartDate,
        values.deductionEndDate
      );
      if (!allReports || allReports.length === 0) {
        setExportError('No hay empleados activos para exportar en el período seleccionado');
        setExportingAll(false);
        return;
      }
      const wb = buildWorkbook(allReports, employees);
      const filename = `Reporte_General_Horas_${values.workStartDate}_al_${values.workEndDate}_Desc_${values.deductionStartDate}_al_${values.deductionEndDate}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      setExportError('Error al generar reporte general');
      console.error(err);
    }
    setExportingAll(false);
  };

  const handleActionChange = (action: ActionOption) => {
    setSelectedAction(action);
    setActionOpen(false);
    if (!action) return;

    switch (action) {
      case 'print':
        print();
        break;
      case 'export-individual':
        exportIndividual();
        break;
      case 'export-all':
        exportAll();
        break;
    }
    setTimeout(() => setSelectedAction(''), 300);
  };

  const actionLabels: Record<ActionOption, string> = {
    '': 'Acciones',
    'print': 'Imprimir',
    'export-individual': 'Exportar Excel Individual',
    'export-all': 'Exportar Excel Todos',
  };

  const isBusy = isSubmitting || generateMutation.isPending;
  const loadError = generateMutation.isError ? 'Error al generar reporte' : exportError;

  return {
    employees,
    employeesLoading: employeesQuery.isLoading,
    register,
    onSubmit,
    errors,
    isBusy,
    report,
    empName,
    selectedEmpValue,
    loadError,
    actionOpen,
    setActionOpen,
    selectedAction,
    actionLabels,
    handleActionChange,
    actionRef,
    exportingAll,
  };
}
