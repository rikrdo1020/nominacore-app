import { useState, useEffect, useRef } from 'react';
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

export default function PayrollReport() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<PayrollReportData | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionOption>('');
  const actionRef = useRef<HTMLDivElement>(null);

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

  const generate = async () => {
    if (!selectedEmp || !startDate || !endDate) return;
    setLoading(true);
    clearMessage();
    try {
      const result = await window.api.calculatePayroll(Number(selectedEmp), startDate, endDate);
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

  const empName = employees.find(e => e.id === Number(selectedEmp))?.name || '';

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

  const formatDollar = (val: number): string => {
    return '$' + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
    const totalCols = 11;

    reports.forEach((r) => {
      const fullName = r.employee_name || employees.find(e => e.id === r.employee_id)?.name || `Empleado ${r.employee_id}`;
      const allDates = getDatesInRange(r.period_start, r.period_end);

      // Título del empleado
      aoa.push([fullName]);

      // Encabezados
      aoa.push([
        'Fecha', 'Entrada', 'Salida', 'Horas',
        'H. Regulares', 'H. Extra', 'Pago Regular', 'Pago Extra',
        'Total Día', 'Descuentos', 'Neto Día'
      ]);

      // Filas de datos (todas las fechas del período)
      allDates.forEach((dateStr) => {
        const db = r.daily_breakdown?.find(d => d.date === dateStr);
        const wr = r.work_records?.find(w => w.date === dateStr);

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
            formatDollar(db.regular_pay),
            formatDollar(db.overtime_pay),
            formatDollar(db.daily_total),
            formatDollar(db.deductions),
            formatDollar(db.daily_total - db.deductions),
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
            '0.00',
            '0.00',
            '$0.00',
            '$0.00',
            '$0.00',
            '$0.00',
            '$0.00',
          ]);
        } else {
          aoa.push([
            formatDateCell(dateStr),
            '-', '-', '-',
            '0.00', '0.00',
            '$0.00', '$0.00',
            '$0.00', '$0.00',
            '$0.00',
          ]);
        }
      });

      // Fila de totales del empleado
      aoa.push([
        'TOTALES', '', '', '',
        r.total_regular_hours.toFixed(2),
        r.total_overtime_hours.toFixed(2),
        formatDollar(r.regular_pay),
        formatDollar(r.overtime_pay),
        formatDollar(r.gross_pay),
        formatDollar(r.total_deductions),
        formatDollar(r.net_pay),
      ]);

      // Separación entre empleados
      aoa.push([]);
      aoa.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Forzar que el rango cubra todas las columnas de la tabla
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    range.e.c = Math.max(range.e.c, totalCols - 1);
    ws['!ref'] = XLSX.utils.encode_range(range);

    // Aplicar bordes a todas las celdas del rango
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C < totalCols; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = { v: '' };
        if (!ws[cellRef].s) ws[cellRef].s = {};
        ws[cellRef].s.border = thinBorder;
      }
    }

    // Aplicar estilos específicos por sección
    let currentRow = 0;
    reports.forEach((r) => {
      const allDates = getDatesInRange(r.period_start, r.period_end);

      // Título del empleado (negrita, fondo oscuro, texto blanco)
      for (let C = 0; C < totalCols; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: C });
        if (!ws[cellRef]) ws[cellRef] = { v: '' };
        if (!ws[cellRef].s) ws[cellRef].s = {};
        Object.assign(ws[cellRef].s, titleStyle);
      }
      currentRow++;

      // Headers de columna
      for (let C = 0; C < totalCols; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: C });
        if (!ws[cellRef]) ws[cellRef] = { v: '' };
        if (!ws[cellRef].s) ws[cellRef].s = {};
        Object.assign(ws[cellRef].s, headerStyle);
      }
      currentRow++;

      // Saltar filas de datos
      currentRow += allDates.length;

      // Fila de totales
      for (let C = 0; C < totalCols; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: C });
        if (!ws[cellRef]) ws[cellRef] = { v: '' };
        if (!ws[cellRef].s) ws[cellRef].s = {};
        Object.assign(ws[cellRef].s, totalStyle);
      }
      currentRow++;

      // Saltar filas de separación
      currentRow += 2;
    });

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte General');
    return wb;
  };

  const exportIndividual = () => {
    if (!report) return;
    const r = { ...report, employee_name: empName };
    const wb = buildWorkbook([r]);
    const filename = `Reporte_${empName.replace(/\s+/g, '_')}_${startDate}_al_${endDate}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const exportAll = async () => {
    if (!startDate || !endDate) return;
    setExportingAll(true);
    clearMessage();
    try {
      const allReports = await window.api.calculatePayrollAll(startDate, endDate);
      if (!allReports || allReports.length === 0) {
        showError('No hay empleados activos para exportar en el período seleccionado');
        setExportingAll(false);
        return;
      }
      const wb = buildWorkbook(allReports);
      const filename = `Reporte_General_${startDate}_al_${endDate}.xlsx`;
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
        <div className="form-row">
          <div className="form-group">
            <label>Empleado</label>
            <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} disabled={loading}>
              <option value="">{loading ? 'Cargando empleados...' : 'Seleccione...'}</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Período desde</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Período hasta</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Generar Reporte'}
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
                <div className="value">${report.regular_pay.toFixed(2)}</div>
              </div>
              <div className="summary-item">
                <div className="label">Pago Extra</div>
                <div className="value">${report.overtime_pay.toFixed(2)}</div>
              </div>
              <div className="summary-item">
                <div className="label">Subtotal</div>
                <div className="value">${report.gross_pay.toFixed(2)}</div>
              </div>
              <div className="summary-item">
                <div className="label">Descuentos</div>
                <div className="value negative">-${report.total_deductions.toFixed(2)}</div>
              </div>
              <div className="summary-item" style={{ background: '#1a1a2e', color: '#fff' }}>
                <div className="label" style={{ color: '#aaa' }}>Neto a Pagar</div>
                <div className="value positive" style={{ color: '#2ecc71' }}>${report.net_pay.toFixed(2)}</div>
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
                    <th>Neto Día</th>
                  </tr>
                </thead>
                <tbody>
                  {report.daily_breakdown.map((db, idx) => (
                    <tr key={idx}>
                      <td>{formatDateWithDay(db.date)}</td>
                      <td>{db.regular_hours.toFixed(2)}</td>
                      <td>{db.overtime_hours.toFixed(2)}</td>
                      <td>${db.regular_pay.toFixed(2)}</td>
                      <td>${db.overtime_pay.toFixed(2)}</td>
                      <td>${db.daily_total.toFixed(2)}</td>
                      <td>${db.deductions.toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>${(db.daily_total - db.deductions).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700, background: '#f9f9f9' }}>
                    <td>Totales</td>
                    <td>{report.total_regular_hours.toFixed(2)}</td>
                    <td>{report.total_overtime_hours.toFixed(2)}</td>
                    <td>${report.regular_pay.toFixed(2)}</td>
                    <td>${report.overtime_pay.toFixed(2)}</td>
                    <td>${report.gross_pay.toFixed(2)}</td>
                    <td>${report.total_deductions.toFixed(2)}</td>
                    <td>${report.net_pay.toFixed(2)}</td>
                  </tr>
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
                      <td>${d.amount.toFixed(2)}</td>
                      <td>{d.description || '-'}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan={2}>Total Descuentos</td>
                    <td>${report.total_deductions.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!report && selectedEmp && (
        <div className="card">
          <div className="empty-state">
            <p>Seleccione un empleado y período, luego presione "Generar Reporte"</p>
          </div>
        </div>
      )}
    </div>
  );
}
