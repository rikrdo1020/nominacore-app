import { usePayrollReport } from '../hooks/use-payroll-report';
import { calcHours, formatDateWithDay, formatTime12Hour } from '../utils/time';

export default function PayrollReport() {
  const {
    employees,
    employeesLoading,
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
  } = usePayrollReport();

  return (
    <div>
      <div className="page-header">
        <h1>Reporte de Pago</h1>
        <p>Calcule el pago de un empleado en un período</p>
      </div>

      <div className="card">
        {loadError && (
          <div className="alert alert-error">{loadError}</div>
        )}
        <form onSubmit={onSubmit} noValidate>
          <div className="form-row">
            <div className="form-group" style={{ minWidth: 260 }}>
              <label>Empleado<span className="required">*</span></label>
              <select {...register('selectedEmp')} className="custom-input" disabled={isBusy}>
                <option value="">{employeesLoading ? 'Cargando empleados...' : 'Seleccione...'}</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {errors.selectedEmp && <span className="field-error">{errors.selectedEmp.message}</span>}
            </div>
          </div>

          <div className="form-row" style={{ gap: 16, alignItems: 'stretch' }}>
            <div style={{ flex: 1, borderLeft: '3px solid #0f3460', background: '#f8fafc', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f3460', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                🕐 Período de Horas Trabajadas
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label>Desde</label>
                  <input type="date" {...register('workStartDate')} className="custom-input" disabled={isBusy} />
                  {errors.workStartDate && <span className="field-error">{errors.workStartDate.message}</span>}
                </div>
                <div className="form-group">
                  <label>Hasta</label>
                  <input type="date" {...register('workEndDate')} className="custom-input" disabled={isBusy} />
                  {errors.workEndDate && <span className="field-error">{errors.workEndDate.message}</span>}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, borderLeft: '3px solid #e94560', background: '#fff5f5', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e94560', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                💸 Período de Descuentos
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label>Desde</label>
                  <input type="date" {...register('deductionStartDate')} className="custom-input" disabled={isBusy} />
                  {errors.deductionStartDate && <span className="field-error">{errors.deductionStartDate.message}</span>}
                </div>
                <div className="form-group">
                  <label>Hasta</label>
                  <input type="date" {...register('deductionEndDate')} className="custom-input" disabled={isBusy} />
                  {errors.deductionEndDate && <span className="field-error">{errors.deductionEndDate.message}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 4 }}>
            <button type="submit" className="btn-pill-primary" disabled={isBusy}>
              {isBusy ? <span className="spinner" /> : 'Generar Reporte'}
            </button>

            <div className="form-group" style={{ minWidth: 240 }}>
              <label>Opciones</label>
              <div className={`action-menu${actionOpen ? ' open' : ''}`} ref={actionRef}>
                <div className="action-menu-trigger" onClick={() => setActionOpen(!actionOpen)}>
                  <span>{actionLabels[selectedAction || '']}</span>
                  <span className="chevron">▾</span>
                </div>
                {actionOpen && (
                  <div className="action-menu-panel">
                    {report && (
                      <>
                        <div className="action-menu-item" onClick={() => handleActionChange('print')}>Imprimir</div>
                        <div className="action-menu-item" onClick={() => handleActionChange('export-individual')}>
                          Exportar Excel Individual
                        </div>
                        <div className="action-menu-divider" />
                      </>
                    )}
                    <div className="action-menu-item" onClick={() => handleActionChange('export-all')}>
                      {exportingAll ? 'Generando...' : 'Exportar Excel Todos'}
                    </div>
                  </div>
                )}
              </div>
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
