import { useDeductions } from '../hooks/use-deductions';
import { useDeductionForm } from '../hooks/use-deduction-form';
import { formatDateWithDay } from '../utils/time';

export default function Deductions() {
  const {
    employees,
    deductions,
    isLoading,
    loadError,
    filterEmp,
    setFilterEmp,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    empName,
    removeDeduction,
    isDeleting,
    deleteError,
  } = useDeductions();
  const { register, onSubmit, errors, isSubmitting, submitError } = useDeductionForm();

  const isBusy = isSubmitting || isDeleting;

  return (
    <div>
      <div className="page-header">
        <h1>Descuentos</h1>
        <p>Registre descuentos por comida, vales y otros</p>
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
            <div className="form-group">
              <label>Tipo</label>
              <select {...register('type')} disabled={isBusy}>
                <option value="Comida">Comida</option>
                <option value="Vales">Vales</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Monto</label>
              <input type="number" step="0.01" min="0" {...register('amount')} style={{ width: 100 }} disabled={isBusy} />
              {errors.amount && <span className="field-error">{errors.amount.message}</span>}
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <input {...register('description')} placeholder="Opcional" disabled={isBusy} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isBusy}>
              {isBusy ? <span className="spinner" /> : 'Agregar'}
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
          {(filterStart || filterEnd) && (
            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setFilterStart(''); setFilterEnd(''); }}>
                Limpiar fechas
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        {isLoading && deductions.length === 0 ? (
          <div className="empty-state">
            <span className="spinner" style={{ borderColor: 'rgba(15,52,96,0.2)', borderTopColor: '#0f3460' }} />
            <p style={{ marginTop: 12 }}>Cargando descuentos...</p>
          </div>
        ) : deductions.length === 0 ? (
          <div className="empty-state"><p>No hay descuentos registrados</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Descripción</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {deductions.map(d => (
                <tr key={d.id}>
                  <td>{d.employee_name || empName(d.employee_id)}</td>
                  <td>{formatDateWithDay(d.date)}</td>
                  <td><span className="status-badge" style={{
                    background: d.type === 'Comida' ? '#e8f4fd' : d.type === 'Vales' ? '#fef3e2' : '#f0e6ff',
                    color: d.type === 'Comida' ? '#0a6e9e' : d.type === 'Vales' ? '#9e6e0a' : '#6e0a9e',
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
    </div>
  );
}
