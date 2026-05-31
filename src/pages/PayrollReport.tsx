import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx-js-style';
import type { Employee, PayrollReportData } from '../types/api';
import { calcHours, formatDateWithDay, formatTime12Hour } from '../utils/time';

interface Message {
  type: 'error' | 'success';
  text: string;
}

type ActionOption =
  | ''
  | 'print'
  | 'export-individual'
  | 'export-all';

interface PayrollForm {
  selectedEmp: string;
  workStartDate: string;
  workEndDate: string;
  deductionStartDate: string;
  deductionEndDate: string;
}

export default function PayrollReport() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [report, setReport] = useState<PayrollReportData | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionOption>('');
  const actionRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, getValues, watch, formState: { isSubmitting } } = useForm<PayrollForm>({
    defaultValues: {
      selectedEmp: '',
      workStartDate: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })(),
      workEndDate: new Date().toISOString().split('T')[0],
      deductionStartDate: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })(),
      deductionEndDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedEmpValue = watch('selectedEmp');
  const empName = employees.find(e => e.id === Number(selectedEmpValue))?.name || '';

  const showError = (msg: string) => setMessage({ type: 'error', text: msg });
  const showSuccess = (msg: string) => setMessage({ type: 'success', text: msg });
  const clearMessage = () => setMessage(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (window.api) setEmployees(await window.api.getEmployees());
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Desconocido';
        showError('Error al cargar empleados: ' + msg);
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
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

  const generate = async (data: PayrollForm) => {
    if (!data.selectedEmp || !data.workStartDate || !data.workEndDate || !data.deductionStartDate || !data.deductionEndDate) return;
    setLoading(true);
    clearMessage();
    try {
      const result = await window.api.calculatePayroll(
        Number(data.selectedEmp),
        data.workStartDate,
        data.workEndDate,
        data.deductionStartDate,
        data.deductionEndDate
      );
      setReport(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al generar reporte: ' + msg);
      console.error(err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const print = () => window.print();

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

  const formatDateCell = (dateStr: string): string => {
    return formatDateWithDay(dateStr);
  };

  const formatNumber = (val: number): string => {
    return val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

  const buildWorkbook = (reports: (PayrollReportData & { employee_name?: string })[]) => {
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
      // +1 for the empty "Neto a Pagar" column
      const totalCols = FIXED_COLS + deductionTypes.length + 1;
      sectionMeta.push({ totalCols, numDataRows: allDates.length });

      // Título del empleado
      aoa.push([fullName]);

      // Encabezados
      aoa.push([
        'Fecha', 'Entrada', 'Salida', 'Horas',
        'H. Regulares', 'H. Extra', 'Pago Regular', 'Pago Extra', 'Total Día',
        ...deductionTypes,
        'Neto a Pagar',
      ]);

      // Filas de datos (todas las fechas del período)
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
            formatDateCell(dateStr),
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
            formatDateCell(dateStr),
            formatTime12Hour(wr.entry_time),
            formatTime12Hour(wr.exit_time),
            hours,
            '0.00', '0.00', '0.00', '0.00', '0.00',
            ...deductionCols,
            '',
          ]);
        } else {
          aoa.push([
            formatDateCell(dateStr),
            '-', '-', '-',
            '0.00', '0.00', '0.00', '0.00', '0.00',
            ...deductionCols,
            '',
          ]);
        }
      });

      // Fila de totales del empleado
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

      // Separación entre empleados
      aoa.push([]);
      aoa.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const maxTotalCols = sectionMeta.reduce((max, m) => Math.max(max, m.totalCols), FIXED_COLS);

    // Forzar que el rango cubra todas las columnas de la tabla
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    range.e.c = Math.max(range.e.c, maxTotalCols - 1);
    ws['!ref'] = XLSX.utils.encode_range(range);

    // Aplicar estilos por sección usando el totalCols de cada una
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

      currentRow += 2; // filas de separación
    });

    // Ajustar anchos de columna
    const deductionColWidths = Array.from({ length: maxTotalCols - FIXED_COLS }, () => ({ wch: 14 }));
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, ...deductionColWidths,
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte General');
    return wb;
  };

  const exportIndividual = () => {
    if (!report) return;
    const values = getValues();
    const r = { ...report, employee_name: empName };
    const wb = buildWorkbook([r]);
    const filename = `Reporte_${empName.replace(/\s+/g, '_')}_Horas_${values.workStartDate}_al_${values.workEndDate}_Desc_${values.deductionStartDate}_al_${values.deductionEndDate}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const exportAll = async () => {
    const values = getValues();
    if (!values.workStartDate || !values.workEndDate || !values.deductionStartDate || !values.deductionEndDate) return;
    setExportingAll(true);
    clearMessage();
    try {
      const allReports = await window.api.calculatePayrollAll(
        values.workStartDate,
        values.workEndDate,
        values.deductionStartDate,
        values.deductionEndDate
      );
      if (!allReports || allReports.length === 0) {
        showError('No hay empleados activos para exportar en el período seleccionado');
        setExportingAll(false);
        return;
      }
      const wb = buildWorkbook(allReports);
      const filename = `Reporte_General_Horas_${values.workStartDate}_al_${values.workEndDate}_Desc_${values.deductionStartDate}_al_${values.deductionEndDate}.xlsx`;
      XLSX.writeFile(wb, filename);
      showSuccess('Reporte general exportado');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al generar reporte general: ' + msg);
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
    // Reset after a brief delay so the label returns to "Acciones"
    setTimeout(() => setSelectedAction(''), 300);
  };

  const actionLabels: Record<ActionOption, string> = {
    '': 'Acciones',
    'print': 'Imprimir',
    'export-individual': 'Exportar Excel Individual',
    'export-all': 'Exportar Excel Todos',
  };

  const isBusy = loading || isSubmitting;

  return (
    <div>
      <div className="page-header">
        <h1>Reporte de Pago</h1>
        <p>Calcule el pago de un empleado en un período</p>
      </div>

      <div className="card">
        {message && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}
        <form onSubmit={handleSubmit(generate)}>
          <div className="form-row">
            <div className="form-group" style={{ minWidth: 260 }}>
              <label>Empleado</label>
              <select {...register('selectedEmp')} disabled={isBusy}>
                <option value="">{loading ? 'Cargando empleados...' : 'Seleccione...'}</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row" style={{ gap: 16, alignItems: 'stretch' }}>
            <div style={{ flex: 1, borderLeft: '3px solid #0f3460', background: '#f8fafc', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f3460', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                🕐 Período de Horas Trabajadas
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label>Desde</label>
                  <input type="date" {...register('workStartDate')} disabled={isBusy} />
                </div>
                <div className="form-group">
                  <label>Hasta</label>
                  <input type="date" {...register('workEndDate')} disabled={isBusy} />
                </div>
              </div>
            </div>

            <div style={{ flex: 1, borderLeft: '3px solid #e94560', background: '#fff5f5', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e94560', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                💸 Período de Descuentos
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label>Desde</label>
                  <input type="date" {...register('deductionStartDate')} disabled={isBusy} />
                </div>
                <div className="form-group">
                  <label>Hasta</label>
                  <input type="date" {...register('deductionEndDate')} disabled={isBusy} />
                </div>
              </div>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 4 }}>
            <button type="submit" className="btn btn-primary" disabled={isBusy}>
              {isBusy ? <span className="spinner" /> : 'Generar Reporte'}
            </button>

            <div className="form-group" style={{ position: 'relative', minWidth: 220 }} ref={actionRef}>
              <label>Opciones</label>
              <div
                className="custom-dropdown"
                onClick={() => setActionOpen(!actionOpen)}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  userSelect: 'none',
                }}
              >
                <span>{actionLabels[selectedAction || '']}</span>
                <span style={{ transform: actionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </div>
              {actionOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  marginTop: 4,
                  zIndex: 10,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                }}>
                  {report && (
                    <>
                      <div
                        className="dropdown-item"
                        onClick={() => handleActionChange('print')}
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        Imprimir
                      </div>
                      <div
                        className="dropdown-item"
                        onClick={() => handleActionChange('export-individual')}
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        Exportar Excel Individual
                      </div>
                      <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
                    </>
                  )}
                  <div
                    className="dropdown-item"
                    onClick={() => handleActionChange('export-all')}
                    style={{ padding: '8px 12px', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    {exportingAll ? 'Generando...' : 'Exportar Excel Todos'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {report && (
        <>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>{empName}</h2>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
              Período: {formatDateWithDay(report.period_start)} al {formatDateWithDay(report.period_end)}
            </p>

            <div className="report-summary">
              <div className="summary-item">
                <div className="label">Horas Regulares</div>
                <div className="value">{report.total_regular_hours.toFixed(2)}</div>
              </div>
              <div className="summary-item">
                <div className="label">Horas Extra</div>
                <div className="value">{report.total_overtime_hours.toFixed(2)}</div>
              </div>
              <div className="summary-item">
                <div className="label">Pago Regular</div>
                <div className="value">{report.regular_pay.toFixed(2)}</div>
              </div>
              <div className="summary-item">
                <div className="label">Pago Extra</div>
                <div className="value">{report.overtime_pay.toFixed(2)}</div>
              </div>
              <div className="summary-item">
                <div className="label">Subtotal</div>
                <div className="value">{report.gross_pay.toFixed(2)}</div>
              </div>
              <div className="summary-item">
                <div className="label">Descuentos</div>
                <div className="value negative">-{report.total_deductions.toFixed(2)}</div>
              </div>
              <div className="summary-item" style={{ background: '#1a1a2e', color: '#fff' }}>
                <div className="label" style={{ color: '#aaa' }}>Neto a Pagar</div>
                <div className="value positive" style={{ color: '#2ecc71' }}>{report.net_pay.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {report.daily_breakdown && report.daily_breakdown.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Desglose Diario</h3>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Horas Regulares</th>
                    <th>Horas Extra</th>
                    <th>Pago Regular</th>
                    <th>Pago Extra</th>
                    <th>Total Día</th>
                    <th>Descuentos</th>
                  </tr>
                </thead>
                <tbody>
                  {report.daily_breakdown.map((db, idx) => {
                    const dayDeductions = report.deductions.filter(d => d.date === db.date);
                    return (
                      <tr key={idx}>
                        <td>{formatDateWithDay(db.date)}</td>
                        <td>{db.regular_hours.toFixed(2)}</td>
                        <td>{db.overtime_hours.toFixed(2)}</td>
                        <td>{db.regular_pay.toFixed(2)}</td>
                        <td>{db.overtime_pay.toFixed(2)}</td>
                        <td>{db.daily_total.toFixed(2)}</td>
                        <td>
                          {dayDeductions.length > 0 ? (
                            dayDeductions.map(d => (
                              <div key={d.id}>{d.type}: {d.amount.toFixed(2)}</div>
                            ))
                          ) : (
                            '0.00'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(() => {
                    const dailyTotalSum = report.daily_breakdown.reduce((sum, db) => sum + db.daily_total, 0);
                    return (
                      <tr style={{ fontWeight: 700, background: '#f9f9f9' }}>
                        <td>Totales</td>
                        <td>{report.total_regular_hours.toFixed(2)}</td>
                        <td>{report.total_overtime_hours.toFixed(2)}</td>
                        <td>{report.regular_pay.toFixed(2)}</td>
                        <td>{report.overtime_pay.toFixed(2)}</td>
                        <td>{dailyTotalSum.toFixed(2)}</td>
                        <td>{report.total_deductions.toFixed(2)}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {report.work_records.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Detalle de Horas</h3>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {report.work_records.map(r => (
                    <tr key={r.id}>
                      <td>{formatDateWithDay(r.date)}</td>
                      <td>{formatTime12Hour(r.entry_time)}</td>
                      <td>{formatTime12Hour(r.exit_time)}</td>
                      <td>{r.is_direct_entry ? r.direct_hours?.toFixed(2) : (
                        r.entry_time && r.exit_time ? calcHours(r.entry_time, r.exit_time) : '-'
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {report.deductions.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Detalle de Descuentos</h3>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {report.deductions.map(d => (
                    <tr key={d.id}>
                      <td>{formatDateWithDay(d.date)}</td>
                      <td>{d.type}</td>
                      <td>{d.amount.toFixed(2)}</td>
                      <td>{d.description || '-'}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan={2}>Total Descuentos</td>
                    <td>{report.total_deductions.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!report && selectedEmpValue && (
        <div className="card">
          <div className="empty-state">
            <p>Seleccione un empleado y período, luego presione "Generar Reporte"</p>
          </div>
        </div>
      )}
    </div>
  );
}
