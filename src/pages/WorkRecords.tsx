import { useWorkRecords } from '../hooks/use-work-records';
import { useWorkRecordForm } from '../hooks/use-work-record-form';
import { calcHours, formatDateWithDay, formatTime12Hour } from '../utils/time';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function WorkRecords() {
  const {
    filteredEmployees,
    employeeSearch,
    setEmployeeSearch,
    employeeId,
    selectedEmployee,
    selectEmployee,
    clearEmployee,
    records,
    isLoading,
    loadError,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    removeRecord,
    isDeleting,
    deleteError,
  } = useWorkRecords();

  const {
    register, onSubmit, errors, isDirectEntry, setValue,
    date, weekDays, monthLabel, selectDay, shiftWeek, jumpToDate,
    computedHours, applyHoursPreset, applyEntryPreset, applyExitDurationPreset,
    justSaved, isSubmitting, submitError,
  } = useWorkRecordForm(employeeId);

  const isBusy = isSubmitting || isDeleting;

  const totalHours = records.reduce((sum, r) => {
    const h = r.is_direct_entry
      ? (r.direct_hours ?? 0)
      : (r.entry_time && r.exit_time ? parseFloat(calcHours(r.entry_time, r.exit_time)) : 0);
    return sum + h;
  }, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Registro de Horas</h1>
        <p>Seleccione un empleado para registrar y consultar sus horas</p>
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
                <div className="employee-context-sub">Registrando horas para este empleado</div>
              </div>
            </div>
            <button type="button" className="btn-pill-outline" onClick={clearEmployee}>Cambiar empleado</button>
          </div>

          <div className="card">
            {(loadError || submitError || deleteError) && (
              <div className="alert alert-error">{loadError || submitError || deleteError}</div>
            )}
            {justSaved && !submitError && (
              <div className="save-indicator"><span className="save-dot" />Guardado — listo para el siguiente día</div>
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

              <label className="field-label field-label-spaced">Tipo de registro<span className="required">*</span></label>
              <div className="pill-tabs">
                <button type="button" className={!isDirectEntry ? 'active' : ''} disabled={isBusy}
                  onClick={() => setValue('is_direct_entry', false)}>Entrada / Salida</button>
                <button type="button" className={isDirectEntry ? 'active' : ''} disabled={isBusy}
                  onClick={() => setValue('is_direct_entry', true)}>Horas directas</button>
              </div>

              {isDirectEntry ? (
                <div className="entry-block">
                  <label className="field-label">Horas trabajadas</label>
                  <div className="pill-grid">
                    {[4, 6, 8, 8.5].map((h) => (
                      <button key={h} type="button" className="time-pill" disabled={isBusy}
                        onClick={() => applyHoursPreset(h)}>{h} h</button>
                    ))}
                  </div>
                  <input type="number" step="0.25" min="0" max="24" {...register('direct_hours')}
                    className="custom-input" disabled={isBusy} placeholder="Personalizado" />
                  {errors.direct_hours && <span className="field-error">{errors.direct_hours.message}</span>}
                </div>
              ) : (
                <div className="entry-block-row">
                  <div className="entry-block">
                    <label className="field-label">Entrada</label>
                    <div className="pill-grid">
                      {['06:00', '06:30', '07:00', '07:30', '08:00', '08:30'].map((t) => (
                        <button key={t} type="button" className="time-pill" disabled={isBusy}
                          onClick={() => applyEntryPreset(t)}>{formatTime12Hour(t)}</button>
                      ))}
                    </div>
                    <input type="time" {...register('entry_time')} className="custom-input" disabled={isBusy} />
                    {errors.entry_time && <span className="field-error">{errors.entry_time.message}</span>}
                  </div>
                  <div className="entry-block">
                    <label className="field-label">Salida</label>
                    <div className="pill-grid">
                      {[8, 8.5, 9, 9.5].map((h) => (
                        <button key={h} type="button" className="time-pill" disabled={isBusy}
                          onClick={() => applyExitDurationPreset(h)}>+{h} h</button>
                      ))}
                    </div>
                    <input type="time" {...register('exit_time')} className="custom-input" disabled={isBusy} />
                    {errors.exit_time && <span className="field-error">{errors.exit_time.message}</span>}
                  </div>
                </div>
              )}

              <div className="total-row">
                <span>Total del día</span>
                <span className="total-value">{computedHours ? `${computedHours} h` : '—'}</span>
              </div>

              <label className="field-label">Notas</label>
              <input {...register('notes')} placeholder="Opcional" disabled={isBusy} className="custom-input" />

              <div className="form-actions">
                <button type="submit" className="btn-pill-primary" disabled={isBusy}>
                  {isBusy ? <span className="spinner" /> : 'Registrar horas'}
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
            </div>
            {records.length > 0 && (
              <div className="report-summary">
                <div className="summary-item">
                  <div className="label">Registros</div>
                  <div className="value">{records.length}</div>
                </div>
                <div className="summary-item">
                  <div className="label">Total horas</div>
                  <div className="value">{totalHours.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            {isLoading && records.length === 0 ? (
              <div className="empty-state">
                <span className="spinner" style={{ borderColor: 'rgba(15,52,96,0.2)', borderTopColor: '#0f3460' }} />
                <p style={{ marginTop: 12 }}>Cargando registros...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="empty-state"><p>No hay registros de horas para este empleado</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Horas</th>
                    <th>Notas</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDateWithDay(r.date)}</td>
                      <td>{r.is_direct_entry ? 'Directo' : 'Ent/Sal'}</td>
                      <td>{formatTime12Hour(r.entry_time)}</td>
                      <td>{formatTime12Hour(r.exit_time)}</td>
                      <td>{r.is_direct_entry ? r.direct_hours : (
                        r.entry_time && r.exit_time ? calcHours(r.entry_time, r.exit_time) : '-'
                      )}</td>
                      <td>{r.notes || '-'}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => removeRecord(r.id)}>✕</button></td>
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
