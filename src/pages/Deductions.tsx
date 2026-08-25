import { useNavigate } from 'react-router-dom';
import { useDeductions } from '../hooks/use-deductions';
import { useDeductionForm } from '../hooks/use-deduction-form';
import { formatDateWithDay } from '../utils/time';

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  Comida: { bg: '#e8f4fd', color: '#0a6e9e' },
  Vales: { bg: '#fef3e2', color: '#9e6e0a' },
  Otro: { bg: '#f0e6ff', color: '#6e0a9e' },
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Deductions() {
  const navigate = useNavigate();
  const {
    filteredEmployees,
    employeeSearch,
    setEmployeeSearch,
    employeeId,
    selectedEmployee,
    selectEmployee,
    clearEmployee,
    deductions,
    isLoading,
    loadError,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    removeDeduction,
    isDeleting,
    deleteError,
  } = useDeductions();

  const {
    register, onSubmit, errors, type, setValue,
    date, weekDays, monthLabel, selectDay, shiftWeek, jumpToDate,
    amountPresets, applyAmountPreset, justSaved, isSubmitting, submitError,
  } = useDeductionForm(employeeId);

  const isBusy = isSubmitting || isDeleting;
  const totalAmount = deductions.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Descuentos</h1>
        <p>Seleccione un empleado para registrar y consultar sus descuentos</p>
      </div>

      {!employeeId ? (
        <div className="card employee-picker">
          <label className="field-label">Empleado</label>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar empleado por nombre..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            autoFocus
          />
          <div className="employee-list">
            {filteredEmployees.length === 0 ? (
              <div className="empty-state"><p>No se encontraron empleados</p></div>
            ) : filteredEmployees.map((e) => (
              <button key={e.id} type="button" className="employee-row" onClick={() => selectEmployee(e.id)}>
                <span className="employee-avatar">{initials(e.name)}</span>
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="card employee-context">
            <div className="employee-context-info">
              <span className="employee-avatar employee-avatar-lg">{initials(selectedEmployee?.name ?? '')}</span>
              <div>
                <div className="employee-context-name">{selectedEmployee?.name}</div>
                <div className="employee-context-sub">Registrando descuentos para este empleado</div>
              </div>
            </div>
            <button type="button" className="btn-pill-outline" onClick={clearEmployee}>Cambiar empleado</button>
          </div>

          <div className="card">
            <label className="field-label">Carga masiva con IA</label>
            <p style={{ fontSize: 13, color: '#666', marginTop: -4, marginBottom: 12 }}>
              Sube fotos de comprobantes (recibos, vales) y la IA completa fecha, tipo y monto por ti
            </p>
            <button
              type="button"
              className="btn-pill-outline"
              onClick={() => navigate(`/deductions/bulk-upload?employeeId=${employeeId}`)}
            >
              Elegir imágenes
            </button>
          </div>

          <div className="card">
            {(loadError || submitError || deleteError) && (
              <div className="alert alert-error">{loadError || submitError || deleteError}</div>
            )}
            {justSaved && !submitError && (
              <div className="save-indicator"><span className="save-dot" />Guardado</div>
            )}

            <form onSubmit={onSubmit} noValidate>
              <label className="field-label">Fecha<span className="required">*</span></label>
              <div className="date-jump-row">
                <label className="date-jump-pill">
                  {monthLabel}
                  <span className="chevron">▾</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => jumpToDate(e.target.value)}
                    className="date-jump-input"
                    disabled={isBusy}
                  />
                </label>
                <div className="week-nav">
                  <button type="button" className="icon-btn" onClick={() => shiftWeek(-1)} disabled={isBusy} aria-label="Semana anterior">‹</button>
                  <button type="button" className="icon-btn" onClick={() => shiftWeek(1)} disabled={isBusy} aria-label="Semana siguiente">›</button>
                </div>
              </div>
              <div className="week-strip">
                {weekDays.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    className={`day-pill${day.date === date ? ' active' : ''}${day.isToday && day.date !== date ? ' is-today' : ''}`}
                    disabled={isBusy}
                    onClick={() => selectDay(day.date)}
                  >
                    <span className="day-pill-label">{day.label}</span>
                    <span className="day-pill-num">{day.num}</span>
                  </button>
                ))}
              </div>
              {errors.date && <span className="field-error">{errors.date.message}</span>}

              <label className="field-label field-label-spaced">Tipo</label>
              <div className="pill-tabs">
                {(['Comida', 'Vales', 'Otro'] as const).map((t) => (
                  <button key={t} type="button" className={type === t ? 'active' : ''} disabled={isBusy}
                    onClick={() => setValue('type', t)}>{t}</button>
                ))}
              </div>

              <div className="entry-block">
                <label className="field-label">Monto</label>
                <div className="pill-grid">
                  {amountPresets.map((a) => (
                    <button key={a} type="button" className="time-pill" disabled={isBusy}
                      onClick={() => applyAmountPreset(a)}>${a}</button>
                  ))}
                </div>
                <input type="number" step="0.01" min="0" {...register('amount')}
                  className="custom-input" disabled={isBusy} placeholder="Monto personalizado" />
                {errors.amount && <span className="field-error">{errors.amount.message}</span>}
              </div>

              <label className="field-label">Descripción</label>
              <input {...register('description')} placeholder="Opcional" disabled={isBusy} className="custom-input" />

              <div className="form-actions">
                <button type="submit" className="btn-pill-primary" disabled={isBusy}>
                  {isBusy ? <span className="spinner" /> : 'Agregar descuento'}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="form-row">
              <div className="form-group">
                <label>Desde</label>
                <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Hasta</label>
                <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
              </div>
              {(filterStart || filterEnd) && (
                <div className="form-group" style={{ alignSelf: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setFilterStart(''); setFilterEnd(''); }}>
                    Limpiar fechas
                  </button>
                </div>
              )}
            </div>
            {deductions.length > 0 && (
              <div className="report-summary">
                <div className="summary-item">
                  <div className="label">Registros</div>
                  <div className="value">{deductions.length}</div>
                </div>
                <div className="summary-item">
                  <div className="label">Total</div>
                  <div className="value">${totalAmount.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            {isLoading && deductions.length === 0 ? (
              <div className="empty-state">
                <span className="spinner" style={{ borderColor: 'rgba(15,52,96,0.2)', borderTopColor: '#0f3460' }} />
                <p style={{ marginTop: 12 }}>Cargando descuentos...</p>
              </div>
            ) : deductions.length === 0 ? (
              <div className="empty-state"><p>No hay descuentos registrados para este empleado</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Descripción</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((d) => (
                    <tr key={d.id}>
                      <td>{formatDateWithDay(d.date)}</td>
                      <td><span className="status-badge" style={{
                        background: TYPE_BADGE[d.type]?.bg,
                        color: TYPE_BADGE[d.type]?.color,
                      }}>{d.type}</span></td>
                      <td>${d.amount.toFixed(2)}</td>
                      <td>{d.description || '-'}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => removeDeduction(d.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
