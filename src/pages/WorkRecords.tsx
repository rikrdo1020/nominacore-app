import { useState, useEffect } from 'react';
import type { Employee, WorkRecord } from '../types/api';
import { calcHours, formatDateWithDay, formatTime12Hour } from '../utils/time';

interface Message {
  type: 'error' | 'success';
  text: string;
}

interface WorkRecordForm {
  employee_id: string;
  date: string;
  is_direct_entry: boolean;
  entry_time: string;
  exit_time: string;
  direct_hours: string;
  notes: string;
}

export default function WorkRecords() {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<WorkRecordForm>({
    employee_id: '', date: new Date().toISOString().split('T')[0],
    is_direct_entry: false, entry_time: '08:00', exit_time: '17:00',
    direct_hours: '8', notes: '',
  });
  const [filterEmp, setFilterEmp] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const showError = (msg: string) => setMessage({ type: 'error', text: msg });
  const showSuccess = (msg: string) => setMessage({ type: 'success', text: msg });
  const clearMessage = () => setMessage(null);

  const load = async () => {
    setLoading(true);
    clearMessage();
    try {
      if (window.api) {
        setEmployees(await window.api.getEmployees());
        const start = filterStart || undefined;
        const end = filterEnd || undefined;
        if (filterEmp) {
          setRecords(await window.api.getWorkRecords(Number(filterEmp), start, end));
        } else {
          setRecords(await window.api.getWorkRecordsAll(start, end));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al cargar registros: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [filterEmp, filterStart, filterEnd]);

  const submit = async () => {
    if (!form.employee_id || !form.date) return;
    setLoading(true);
    clearMessage();
    try {
      const record: Omit<WorkRecord, 'id' | 'created_at'> = {
        employee_id: Number(form.employee_id),
        date: form.date,
        is_direct_entry: form.is_direct_entry ? 1 : 0,
        entry_time: form.is_direct_entry ? null : form.entry_time,
        exit_time: form.is_direct_entry ? null : form.exit_time,
        direct_hours: form.is_direct_entry ? parseFloat(form.direct_hours) : null,
        notes: form.notes || null,
      };
      await window.api.addWorkRecord(record);
      showSuccess('Registro guardado correctamente');
      setForm(f => ({ ...f, employee_id: '', notes: '' }));
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al guardar registro: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar este registro?')) return;
    setLoading(true);
    clearMessage();
    try {
      await window.api.deleteWorkRecord(id);
      showSuccess('Registro eliminado');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al eliminar: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const empName = (id: number) => employees.find(e => e.id === id)?.name || `ID:${id}`;

  return (
    <div>
      <div className="page-header">
        <h1>Registro de Horas</h1>
        <p>Ingrese horas trabajadas por empleado</p>
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
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <label htmlFor="mode-entry" style={{ textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>Entrada/Salida</label>
            <input id="mode-entry" type="radio" name="entryMode" checked={!form.is_direct_entry}
              onChange={() => setForm(f => ({ ...f, is_direct_entry: false }))} />
            <label htmlFor="mode-direct" style={{ textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>Horas directas</label>
            <input id="mode-direct" type="radio" name="entryMode" checked={form.is_direct_entry}
              onChange={() => setForm(f => ({ ...f, is_direct_entry: true }))} />
          </div>
        </div>
        <div className="form-row">
          {form.is_direct_entry ? (
            <div className="form-group">
              <label>Horas trabajadas</label>
              <input type="number" step="0.25" min="0" max="24" value={form.direct_hours}
                onChange={e => setForm(f => ({ ...f, direct_hours: e.target.value }))} style={{ width: 100 }} />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Entrada</label>
                <input type="time" value={form.entry_time}
                  onChange={e => setForm(f => ({ ...f, entry_time: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Salida</label>
                <input type="time" value={form.exit_time}
                  onChange={e => setForm(f => ({ ...f, exit_time: e.target.value }))} />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Notas</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Opcional" />
          </div>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Registrar'}
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
          <div className="form-group">
            <label>Desde</label>
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Hasta</label>
            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>Filtrar</button>
        </div>
      </div>
      <div className="card">
        {loading && records.length === 0 ? (
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
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

