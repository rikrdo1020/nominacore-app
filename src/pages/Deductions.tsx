import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Employee, Deduction } from '../types/api';
import { formatDateWithDay } from '../utils/time';

interface Message {
  type: 'error' | 'success';
  text: string;
}

interface DeductionForm {
  employee_id: string;
  date: string;
  type: 'Comida' | 'Vales' | 'Otro';
  amount: string;
  description: string;
}

export default function Deductions() {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterEmp, setFilterEmp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<DeductionForm>({
    defaultValues: {
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      type: 'Comida',
      amount: '',
      description: '',
    },
  });

  const showError = (msg: string) => setMessage({ type: 'error', text: msg });
  const showSuccess = (msg: string) => setMessage({ type: 'success', text: msg });
  const clearMessage = () => setMessage(null);

  const load = async () => {
    setLoading(true);
    clearMessage();
    try {
      if (window.api) {
        const [emps, deds] = await Promise.all([
          window.api.getEmployees(),
          window.api.getDeductions(filterEmp ? Number(filterEmp) : null),
        ]);
        setEmployees(emps);
        setDeductions(deds);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al cargar descuentos: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [filterEmp]);

  const onSubmit = async (data: DeductionForm) => {
    if (!data.employee_id || !data.amount) return;
    setLoading(true);
    clearMessage();
    try {
      await window.api.addDeduction({
        employee_id: Number(data.employee_id),
        date: data.date,
        type: data.type,
        amount: parseFloat(data.amount),
        description: data.description || null,
      });
      showSuccess('Descuento registrado correctamente');
      reset({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        type: 'Comida',
        amount: '',
        description: '',
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al registrar descuento: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar este descuento?')) return;
    setLoading(true);
    clearMessage();
    try {
      await window.api.deleteDeduction(id);
      showSuccess('Descuento eliminado');
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

  const isBusy = loading || isSubmitting;

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
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-row">
            <div className="form-group">
              <label>Empleado</label>
              <select {...register('employee_id')} disabled={isBusy}>
                <option value="">Seleccione...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" {...register('date')} disabled={isBusy} />
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
        </div>
      </div>
      <div className="card">
        {loading && deductions.length === 0 ? (
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
