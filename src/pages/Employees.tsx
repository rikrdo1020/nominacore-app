import { useEmployees } from '../hooks/use-employees';
import { useEmployeeForm } from '../hooks/use-employee-form';
import { formatDateTimeDay } from '../utils/time';

export default function Employees() {
  const {
    employees,
    isLoading,
    loadError,
    removeEmployee,
    isDeleting,
    editingId,
    editErrors,
    startEdit,
    registerEdit,
    onEditSubmit,
    isEditing,
  } = useEmployees();
  const { register, onSubmit, errors, isSubmitting, submitError } = useEmployeeForm();

  const isBusy = isDeleting || isEditing;

  return (
    <div>
      <div className="page-header">
        <h1>Empleados</h1>
        <p>Gestión de trabajadores</p>
      </div>
      <div className="card">
        {(loadError || submitError) && (
          <div className="alert alert-error">{loadError || submitError}</div>
        )}
        <form onSubmit={onSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre del empleado</label>
              <input {...register('name')} placeholder="Ingrese nombre" disabled={isSubmitting} />
              {errors.name && <span className="field-error">{errors.name.message}</span>}
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <span className="spinner" /> : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
      <div className="card">
        {isLoading && employees.length === 0 ? (
          <div className="empty-state">
            <span className="spinner" style={{ borderColor: 'rgba(15,52,96,0.2)', borderTopColor: '#0f3460' }} />
            <p style={{ marginTop: 12 }}>Cargando empleados...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="empty-state"><p>No hay empleados registrados</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Fecha de registro</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    {editingId === emp.id ? (
                      <form onSubmit={onEditSubmit}>
                        <input {...registerEdit('name')} autoFocus disabled={isBusy} onBlur={onEditSubmit} />
                        {editErrors.name && <span className="field-error">{editErrors.name.message}</span>}
                      </form>
                    ) : (
                      emp.name
                    )}
                  </td>
                  <td>{formatDateTimeDay(emp.created_at)}</td>
                  <td className="actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(emp)} disabled={isBusy}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeEmployee(emp.id)} disabled={isBusy}>Desactivar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
