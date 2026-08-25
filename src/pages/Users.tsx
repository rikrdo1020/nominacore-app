import { useUsers } from '../hooks/use-users';
import { useCreateUserForm } from '../hooks/use-create-user-form';
import { formatDateTimeDay } from '../utils/time';

export default function Users() {
  const { users, isLoading, loadError, currentUserId, removeUser, isDeleting, deletingId, deleteError } = useUsers();
  const { register, onSubmit, errors, isSubmitting, submitError } = useCreateUserForm();

  return (
    <div>
      <div className="page-header">
        <h1>Usuarios</h1>
        <p>Administración de accesos al sistema</p>
      </div>

      <div className="card">
        <form onSubmit={onSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="new-username">Usuario</label>
              <input id="new-username" type="text" placeholder="nombre.usuario" disabled={isSubmitting} {...register('username')} />
              {errors.username && <span className="field-error">{errors.username.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="new-password">Contraseña</label>
              <input id="new-password" type="password" placeholder="••••••" disabled={isSubmitting} {...register('password')} />
              {errors.password && <span className="field-error">{errors.password.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="new-role">Rol</label>
              <select id="new-role" disabled={isSubmitting} {...register('role')}>
                <option value="ADMIN">Administrador</option>
                <option value="SUPER_ADMIN">Super Administrador</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <span className="spinner" /> : 'Crear usuario'}
            </button>
          </div>
          {submitError && <div className="alert alert-error">{submitError}</div>}
        </form>
      </div>

      <div className="card">
        {deleteError && <div className="alert alert-error">{deleteError}</div>}
        {isLoading ? (
          <div className="empty-state">
            <span className="spinner" style={{ borderColor: 'rgba(15,52,96,0.2)', borderTopColor: '#0f3460' }} />
            <p style={{ marginTop: 12 }}>Cargando usuarios...</p>
          </div>
        ) : loadError ? (
          <div className="alert alert-error">{loadError}</div>
        ) : users.length === 0 ? (
          <div className="empty-state"><p>No hay usuarios registrados</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th style={{ width: 130 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.role === 'SUPER_ADMIN' ? 'Super Administrador' : 'Administrador'}</td>
                  <td>
                    <span className={`status-badge ${u.isActive ? 'status-paid' : 'status-pending'}`}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{formatDateTimeDay(u.createdAt)}</td>
                  <td className="actions">
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={u.id === currentUserId || !u.isActive || (isDeleting && deletingId === u.id)}
                      onClick={() => removeUser(u.id, u.username)}
                    >
                      {isDeleting && deletingId === u.id ? <span className="spinner" /> : 'Desactivar'}
                    </button>
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
