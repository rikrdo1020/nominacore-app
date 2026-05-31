import { useEffect, useState, FormEvent } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../types/api';

export default function Users() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'USER'>('USER');

  const load = async () => {
    setLoading(true);
    try {
      const data = await window.api.getUsers();
      setUsers(data as User[]);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirm('');
    setRole('USER');
    setFormError('');
    setShowForm(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!username.trim() || username.trim().length < 3) {
      setFormError('Usuario mínimo 3 caracteres');
      return;
    }
    if (!password || password.length < 6) {
      setFormError('Contraseña mínimo 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setFormError('Las contraseñas no coinciden');
      return;
    }
    setSubmitting(true);
    try {
      await window.api.createUser({ username: username.trim(), password, role });
      resetForm();
      await load();
    } catch (err: any) {
      setFormError(err?.message || 'Error al crear usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await window.api.updateUser(u.id, { is_active: !u.is_active });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Error al actualizar usuario');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Usuarios</h1>
          <p>Gestión de accesos al sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nuevo Usuario'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Crear Usuario</h3>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Usuario</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="nombre.usuario" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Rol</label>
                <select value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'USER')}>
                  <option value="USER">Usuario</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Confirmar</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repetir contraseña" />
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting && <span className="spinner" />}
                {submitting ? 'Creando…' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Cargando usuarios…</div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <p>No hay usuarios registrados</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>
                    <span className={`status-badge ${u.role === 'ADMIN' ? 'status-paid' : 'status-pending'}`}>
                      {u.role === 'ADMIN' ? 'Admin' : 'Usuario'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${u.is_active ? 'status-paid' : 'status-pending'}`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="actions">
                    {currentUser?.id !== u.id && (
                      <button
                        className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
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
