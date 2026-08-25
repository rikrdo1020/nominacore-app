import { useUsers } from '../hooks/use-users';
import { useCreateUserForm } from '../hooks/use-create-user-form';
import { formatDateTimeDay } from '../utils/time';
import CredentialsModal from '../components/CredentialsModal';

export default function Users() {
  const {
    users,
    isLoading,
    loadError,
    currentUserId,
    removeUser,
    isDeleting,
    deletingId,
    deleteError,
    resetPassword,
    isResetting,
    resettingId,
    resetCredentials,
    clearResetCredentials,
    resetError,
  } = useUsers();
  const { register, onSubmit, errors, isSubmitting, submitError, credentials, clearCredentials } = useCreateUserForm();

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
          <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
            La contraseña se genera automáticamente al crear el usuario.
          </p>
          {submitError && <div className="alert alert-error">{submitError}</div>}
        </form>
      </div>

      {credentials && (
        <CredentialsModal
          title="Usuario creado"
          username={credentials.username}
          password={credentials.tempPassword}
          onClose={clearCredentials}
        />
      )}

      {resetCredentials && (
        <CredentialsModal
          title="Contraseña restablecida"
          username={resetCredentials.username}
          password={resetCredentials.tempPassword}
          onClose={clearResetCredentials}
        />
      )}

      <div className="card">
        {deleteError && <div className="alert alert-error">{deleteError}</div>}
        {resetError && <div className="alert alert-error">{resetError}</div>}
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
                <th style={{ width: 220 }}>Acciones</th>
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
                      className="btn btn-secondary btn-sm"
                      disabled={isResetting && resettingId === u.id}
                      onClick={() => resetPassword(u.id, u.username)}
                    >
                      {isResetting && resettingId === u.id ? <span className="spinner" /> : 'Restablecer contraseña'}
                    </button>
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
