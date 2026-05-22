import React, { useState, useEffect } from 'react';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [apiReady, setApiReady] = useState(false);

  const showError = (msg) => setMessage({ type: 'error', text: msg });
  const showSuccess = (msg) => setMessage({ type: 'success', text: msg });
  const clearMessage = () => setMessage(null);

  useEffect(() => {
    if (!window.api) {
      showError('No se pudo conectar con el backend. Asegúrate de estar ejecutando la app desde Electron (no desde el navegador).');
      return;
    }
    setApiReady(true);
    load();
  }, []);

  const load = async () => {
    clearMessage();
    try {
      setEmployees(await window.api.getEmployees());
    } catch (err) {
      showError('Error al cargar empleados: ' + (err.message || 'Desconocido'));
      console.error(err);
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
      showError('Error al agregar empleado: ' + (err.message || 'Desconocido'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (emp) => {
    setEditingId(emp.id);
    setEditName(emp.name);
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    setLoading(true);
    clearMessage();
    try {
      await window.api.updateEmployee(id, editName.trim());
      showSuccess('Empleado actualizado');
      setEditingId(null);
      await load();
    } catch (err) {
      showError('Error al actualizar: ' + (err.message || 'Desconocido'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('¿Desactivar este empleado?')) return;
    setLoading(true);
    clearMessage();
    try {
      await window.api.deleteEmployee(id);
      showSuccess('Empleado desactivado');
      await load();
    } catch (err) {
      showError('Error al desactivar: ' + (err.message || 'Desconocido'));
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
        {employees.length === 0 ? (
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
