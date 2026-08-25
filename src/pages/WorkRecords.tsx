import { useWorkRecords } from '../hooks/use-work-records';
import { useWorkRecordForm } from '../hooks/use-work-record-form';
import { calcHours, formatDateWithDay, formatTime12Hour } from '../utils/time';

export default function WorkRecords() {
  const {
    employees,
    records,
    isLoading,
    loadError,
    filterEmp,
    setFilterEmp,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    empName,
    removeRecord,
    isDeleting,
    deleteError,
  } = useWorkRecords();
  const { register, onSubmit, errors, setValue, isDirectEntry, isSubmitting, submitError } = useWorkRecordForm();

  const isBusy = isSubmitting || isDeleting;

  return (
    <div>
      <div className="page-header">
        <h1>Registro de Horas</h1>
        <p>Ingrese horas trabajadas por empleado</p>
      </div>
      <div className="card">
        {(loadError || submitError || deleteError) && (
          <div className="alert alert-error">{loadError || submitError || deleteError}</div>
        )}
        <form onSubmit={onSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label>Empleado</label>
              <select {...register('employee_id')} disabled={isBusy}>
                <option value="">Seleccione...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {errors.employee_id && <span className="field-error">{errors.employee_id.message}</span>}
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" {...register('date')} disabled={isBusy} />
              {errors.date && <span className="field-error">{errors.date.message}</span>}
            </div>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <label htmlFor="mode-entry" style={{ textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>Entrada/Salida</label>
              <input id="mode-entry" type="radio" name="entryMode" checked={!isDirectEntry}
                onChange={() => setValue('is_direct_entry', false)} />
              <label htmlFor="mode-direct" style={{ textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>Horas directas</label>
              <input id="mode-direct" type="radio" name="entryMode" checked={isDirectEntry}
                onChange={() => setValue('is_direct_entry', true)} />
            </div>
          </div>
          <div className="form-row">
            {isDirectEntry ? (
              <div className="form-group">
                <label>Horas trabajadas</label>
                <input type="number" step="0.25" min="0" max="24" {...register('direct_hours')}
                  style={{ width: 100 }} disabled={isBusy} />
                {errors.direct_hours && <span className="field-error">{errors.direct_hours.message}</span>}
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Entrada</label>
                  <input type="time" {...register('entry_time')} disabled={isBusy} />
                  {errors.entry_time && <span className="field-error">{errors.entry_time.message}</span>}
                </div>
                <div className="form-group">
                  <label>Salida</label>
                  <input type="time" {...register('exit_time')} disabled={isBusy} />
                  {errors.exit_time && <span className="field-error">{errors.exit_time.message}</span>}
                </div>
              </>
            )}
            <div className="form-group">
              <label>Notas</label>
              <input {...register('notes')} placeholder="Opcional" disabled={isBusy} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isBusy}>
              {isBusy ? <span className="spinner" /> : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
      <div className="card">
        <div className="form-row">
          <div className="form-group">
            <label>Filtrar por empleado</label>
            <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
              <option value="">Todos</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Desde</label>
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Hasta</label>
            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        {isLoading && records.length === 0 ? (
          <div className="empty-state">
            <span className="spinner" style={{ borderColor: 'rgba(15,52,96,0.2)', borderTopColor: '#0f3460' }} />
            <p style={{ marginTop: 12 }}>Cargando registros...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state"><p>No hay registros de horas</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
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
              {records.map(r => (
                <tr key={r.id}>
                  <td>{r.employee_name || empName(r.employee_id)}</td>
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
    </div>
  );
}
