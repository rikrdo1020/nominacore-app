import { useState, useEffect } from 'react';
import type { Employee } from '../types/api';

interface Message {
  type: 'error' | 'success';
  text: string;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [apiReady, setApiReady] = useState(false);

  const showError = (msg: string) => setMessage({ type: 'error', text: msg });
  const showSuccess = (msg: string) => setMessage({ type: 'success', text: msg });
  const clearMessage = () => setMessage(null);

  useEffect(() => {
    if (!window.api) {
      showError('No se pudo conectar con el backend. Asegúrate de estar ejecutando la app desde Electron (no desde el navegador).');
      return;
    }
    setApiReady(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    clearMessage();
    try {
      setEmployees(await window.api.getEmployees());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al cargar empleados: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const add = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    clearMessage();
    try {
      await window.api.addEmployee(newName.trim());
      showSuccess('Empleado agregado correctamente');
      setNewName('');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al agregar empleado: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditName(emp.name);
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return;
    setLoading(true);
    clearMessage();
    try {
      await window.api.updateEmployee(id, editName.trim());
      showSuccess('Empleado actualizado');
      setEditingId(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al actualizar: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Desactivar este empleado?')) return;
    setLoading(true);
    clearMessage();
    try {
      await window.api.deleteEmployee(id);
      showSuccess('Empleado desactivado');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al desactivar: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!apiReady) {
    return (
      <div>
        <div className="page-header"><h1>Empleados</h1><p>Gestión de trabajadores</p></div>
        <div className="card">
          {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
          <div className="empty-state">
            <p>Esperando conexión con el backend...</p>
            <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              Abre las DevTools (Ctrl+Shift+I) y revisa la consola para más detalles.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Empleados</h1>
        <p>Gestión de trabajadores</p>
      </div>
      <div className="card">
        {message && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label>Nombre del empleado</label>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Ingrese nombre" onKeyDown={e => e.key === 'Enter' && add()} />
          </div>
          <button className="btn btn-primary" onClick={add} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Agregar'}
          </button>
        </div>
      </div>
      <div className="card">
        {loading && employees.length === 0 ? (
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
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(emp.id)}
                        onBlur={() => saveEdit(emp.id)} autoFocus />
                    ) : (
                      emp.name
                    )}
                  </td>
                  <td>{emp.created_at}</td>
                  <td className="actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(emp)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(emp.id)}>Desactivar</button>
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
