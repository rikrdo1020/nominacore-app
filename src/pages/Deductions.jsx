import React, { useState, useEffect } from 'react';

export default function Deductions() {
  const [deductions, setDeductions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    employee_id: '', date: new Date().toISOString().split('T')[0],
    type: 'Comida', amount: '', description: '',
  });
  const [filterEmp, setFilterEmp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const showError = (msg) => setMessage({ type: 'error', text: msg });
  const showSuccess = (msg) => setMessage({ type: 'success', text: msg });
  const clearMessage = () => setMessage(null);

  const load = async () => {
    clearMessage();
    try {
      if (window.api) {
        setEmployees(await window.api.getEmployees());
        setDeductions(await window.api.getDeductions(filterEmp ? Number(filterEmp) : null));
      }
    } catch (err) {
      showError('Error al cargar descuentos: ' + (err.message || 'Desconocido'));
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [filterEmp]);

  const submit = async () => {
    if (!form.employee_id || !form.amount) return;
    setLoading(true);
    clearMessage();
    try {
      await window.api.addDeduction({
        employee_id: Number(form.employee_id),
        date: form.date,
        type: form.type,
        amount: parseFloat(form.amount),
        description: form.description || null,
      });
      showSuccess('Descuento registrado correctamente');
      setForm(f => ({ ...f, employee_id: '', amount: '', description: '' }));
      await load();
    } catch (err) {
      showError('Error al registrar descuento: ' + (err.message || 'Desconocido'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este descuento?')) return;
    setLoading(true);
    clearMessage();
    try {
      await window.api.deleteDeduction(id);
      showSuccess('Descuento eliminado');
      await load();
    } catch (err) {
      showError('Error al eliminar: ' + (err.message || 'Desconocido'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const empName = (id) => employees.find(e => e.id === id)?.name || `ID:${id}`;

  return (
    <div>
      <div className="page-header">
        <h1>Descuentos</h1>
        <p>Registre descuentos por comida, vales y otros</p>
      </div>
      <div className="card">
        {message && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label>Empleado</label>
            <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
              <option value="">Seleccione...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="Comida">Comida</option>
              <option value="Vales">Vales</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="form-group">
            <label>Monto</label>
            <input type="number" step="0.01" min="0" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: 100 }} />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Opcional" />
          </div>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Agregar'}
          </button>
        </div>
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
        </div>
      </div>
      <div className="card">
        {deductions.length === 0 ? (
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
                  <td>{d.date}</td>
                  <td><span className="status-badge" style={{
                    background: d.type === 'Comida' ? '#e8f4fd' : d.type === 'Vales' ? '#fef3e2' : '#f0e6ff',
                    color: d.type === 'Comida' ? '#0a6e9e' : d.type === 'Vales' ? '#9e6e0a' : '#6e0a9e',
                  }}>{d.type}</span></td>
                  <td>${d.amount.toFixed(2)}</td>
                  <td>{d.description || '-'}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(d.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
