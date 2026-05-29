import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { Employee, PayrollReportData } from '../types/api';
import { calcHours } from '../utils/time';

interface Message {
  type: 'error' | 'success';
  text: string;
}

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

  const pay = async () => {
    if (!report) return;
    setLoading(true);
    clearMessage();
    try {
      const now = new Date().toISOString();
      await window.api.savePayroll(report.employee_id, report.period_start, report.period_end, now);
      showSuccess('Pago registrado exitosamente');
      setReport(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al registrar pago: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const print = () => window.print();

  const empName = employees.find(e => e.id === Number(selectedEmp))?.name || '';

  const usedSheetNames = new Set<string>();
  const safeSheetName = (name: string) => {
    let base = name.replace(/[\\/*\[\]:?]/g, '-').substring(0, 31);
    let finalName = base;
    let counter = 1;
    while (usedSheetNames.has(finalName)) {
      const suffix = `-${counter}`;
      finalName = base.substring(0, 31 - suffix.length) + suffix;
      counter++;
    }
    usedSheetNames.add(finalName);
    return finalName;
  };

  const buildWorkbook = (reports: (PayrollReportData & { employee_name?: string })[]) => {
    const wb = XLSX.utils.book_new();

    const summaryData = reports.map(r => ({
      Empleado: r.employee_name || employees.find(e => e.id === r.employee_id)?.name || '',
      'Horas Regulares': r.total_regular_hours,
      'Horas Extra': r.total_overtime_hours,
      'Pago Regular': r.regular_pay,
      'Pago Extra': r.overtime_pay,
      Subtotal: r.gross_pay,
      Descuentos: r.total_deductions,
      'Neto a Pagar': r.net_pay,
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, safeSheetName('Resumen General'));

    reports.forEach(r => {
      const fullName = r.employee_name || employees.find(e => e.id === r.employee_id)?.name || `Empleado ${r.employee_id}`;

      const resData = [{
        Empleado: fullName,
        Periodo: `${r.period_start} al ${r.period_end}`,
        'Horas Regulares': r.total_regular_hours,
        'Horas Extra': r.total_overtime_hours,
        'Pago Regular': r.regular_pay,
        'Pago Extra': r.overtime_pay,
        Subtotal: r.gross_pay,
        Descuentos: r.total_deductions,
        'Neto a Pagar': r.net_pay,
      }];
      const wsRes = XLSX.utils.json_to_sheet(resData);
      XLSX.utils.book_append_sheet(wb, wsRes, safeSheetName(`${fullName} - Resumen`));

      if (r.work_records && r.work_records.length > 0) {
        const hoursData = r.work_records.map(wr => ({
          Fecha: wr.date,
          Entrada: wr.entry_time || '-',
          Salida: wr.exit_time || '-',
          Horas: wr.is_direct_entry ? (wr.direct_hours?.toFixed(2) || '0.00') : (
            wr.entry_time && wr.exit_time ? calcHours(wr.entry_time, wr.exit_time) : '-'
          ),
        }));
        const wsHours = XLSX.utils.json_to_sheet(hoursData);
        XLSX.utils.book_append_sheet(wb, wsHours, safeSheetName(`${fullName} - Horas`));
      }

      if (r.deductions && r.deductions.length > 0) {
        const dedData = r.deductions.map(d => ({
          Fecha: d.date,
          Tipo: d.type,
          Monto: d.amount,
          Descripción: d.description || '-',
        }));
        const wsDed = XLSX.utils.json_to_sheet(dedData);
        XLSX.utils.book_append_sheet(wb, wsDed, safeSheetName(`${fullName} - Descuentos`));
      }
    });

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
          {report && <button className="btn btn-secondary" onClick={print}>Imprimir</button>}
          {report && (
            <button className="btn btn-secondary" onClick={exportIndividual}>
              Exportar Excel
            </button>
          )}
          <button className="btn btn-secondary" onClick={exportAll} disabled={exportingAll}>
            {exportingAll ? 'Generando...' : 'Exportar Excel Todos'}
          </button>
        </div>
      </div>

      {report && (
        <>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>{empName}</h2>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
              Período: {report.period_start} al {report.period_end}
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

            <button className="btn btn-success" onClick={pay} style={{ marginTop: 12 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Registrar Pago'}
            </button>
          </div>

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
                      <td>{r.date}</td>
                      <td>{r.entry_time || '-'}</td>
                      <td>{r.exit_time || '-'}</td>
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
                      <td>{d.date}</td>
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

