import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { Employee, EmployeeRate, RateRule } from '../types/api';

interface Message {
  type: 'error' | 'success';
  text: string;
}

interface DayRateRow {
  isCustom: boolean;
  max_regular_hours: number;
  regular_rate: number;
  overtime_rate: number;
  lunch_duration: number;
}

interface EmployeeRatesForm {
  days: DayRateRow[];
}

const DAYS = [
  { dow: 0, name: 'Lunes' },
  { dow: 1, name: 'Martes' },
  { dow: 2, name: 'Miércoles' },
  { dow: 3, name: 'Jueves' },
  { dow: 4, name: 'Viernes' },
  { dow: 5, name: 'Sábado' },
  { dow: 6, name: 'Domingo' },
];

export default function EmployeeRates() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [employeeRates, setEmployeeRates] = useState<EmployeeRate[]>([]);
  const [generalRules, setGeneralRules] = useState<RateRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const { control, reset } = useForm<EmployeeRatesForm>({
    defaultValues: { days: DAYS.map(() => ({ isCustom: false, max_regular_hours: 8, regular_rate: 2.5, overtime_rate: 3, lunch_duration: 0.5 })) },
  });

  const showError = (msg: string) => setMessage({ type: 'error', text: msg });
  const showSuccess = (msg: string) => setMessage({ type: 'success', text: msg });
  const clearMessage = () => setMessage(null);

  const loadEmployees = async () => {
    try {
      if (window.api) setEmployees(await window.api.getEmployees());
    } catch (err) {
      console.error(err);
    }
  };

  const loadGeneralRules = async () => {
    try {
      if (window.api) setGeneralRules(await window.api.getRateRules());
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmployeeRates = async (empId: number) => {
    setLoading(true);
    clearMessage();
    try {
      if (window.api) {
        const rates = await window.api.getEmployeeRates(empId);
        setEmployeeRates(rates);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al cargar tarifas del empleado: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadGeneralRules();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeRates(selectedEmployee);
    } else {
      setEmployeeRates([]);
    }
  }, [selectedEmployee]);

  const getRateForDay = (dow: number): EmployeeRate | RateRule | undefined => {
    const custom = employeeRates.find(r => r.day_of_week === dow && r.is_active);
    if (custom) return custom;
    return generalRules.find(r => r.day_of_week === dow);
  };

  const hasCustomRate = (dow: number) => {
    return employeeRates.some(r => r.day_of_week === dow && r.is_active);
  };

  useEffect(() => {
    const days: DayRateRow[] = DAYS.map(day => {
      const rate = getRateForDay(day.dow);
      return {
        isCustom: hasCustomRate(day.dow),
        max_regular_hours: rate?.max_regular_hours ?? 8,
        regular_rate: rate?.regular_rate ?? 2.5,
        overtime_rate: rate?.overtime_rate ?? 3,
        lunch_duration: rate?.lunch_duration ?? 0.5,
      };
    });
    reset({ days });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeRates, generalRules]);

  const toggleDayRate = async (dow: number) => {
    if (!selectedEmployee) return;
    const existing = employeeRates.find(r => r.day_of_week === dow);

    setLoading(true);
    clearMessage();
    try {
      if (existing) {
        await window.api.updateEmployeeRate(existing.id, {
          is_active: !existing.is_active,
        });
        showSuccess(existing.is_active ? 'Tarifa personalizada desactivada' : 'Tarifa personalizada activada');
      } else {
        const general = generalRules.find(r => r.day_of_week === dow);
        await window.api.createEmployeeRate({
          employee_id: selectedEmployee,
          day_of_week: dow,
          max_regular_hours: general?.max_regular_hours ?? 8,
          regular_rate: general?.regular_rate ?? 2.50,
          overtime_rate: general?.overtime_rate ?? 3.00,
          lunch_duration: general?.lunch_duration ?? 0.5,
        });
        showSuccess('Tarifa personalizada creada');
      }
      await loadEmployeeRates(selectedEmployee);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al modificar tarifa: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateRate = async (dow: number, field: 'max_regular_hours' | 'regular_rate' | 'overtime_rate' | 'lunch_duration', value: string) => {
    if (!selectedEmployee) return;
    const existing = employeeRates.find(r => r.day_of_week === dow);
    if (!existing) return;

    setLoading(true);
    clearMessage();
    try {
      const numValue = parseFloat(value) || 0;
      await window.api.updateEmployeeRate(existing.id, {
        [field]: numValue,
      });
      showSuccess('Tarifa actualizada');
      await loadEmployeeRates(selectedEmployee);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al actualizar tarifa: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Tarifas por Empleado</h1>
        <p>Configure tarifas personalizadas para cada empleado. Si un empleado no tiene tarifa personalizada para un día, se usará la tarifa general.</p>
      </div>

      <div className="card">
        {message && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Empleado:</label>
          <select
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value ? parseInt(e.target.value) : '')}
            style={{ padding: '8px 12px', fontSize: 14, minWidth: 250 }}
          >
            <option value="">Seleccione un empleado...</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {!selectedEmployee && (
          <div className="empty-state">
            <p>Seleccione un empleado para ver o editar sus tarifas personalizadas.</p>
          </div>
        )}

        {selectedEmployee && loading && employeeRates.length === 0 && (
          <div className="empty-state">
            <span className="spinner" style={{ borderColor: 'rgba(15,52,96,0.2)', borderTopColor: '#0f3460' }} />
            <p style={{ marginTop: 12 }}>Cargando tarifas...</p>
          </div>
        )}

        {selectedEmployee && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Personalizada</th>
                  <th>Horas Regulares</th>
                  <th>Valor Hora Regular</th>
                  <th>Valor Hora Extra</th>
                  <th>Descuento Almuerzo</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, idx) => {
                  const isCustom = hasCustomRate(day.dow);
                  return (
                    <tr key={day.dow}>
                      <td><strong>{day.name}</strong></td>
                      <td>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Controller
                            name={`days.${idx}.isCustom`}
                            control={control}
                            render={({ field: { value } }) => (
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={() => toggleDayRate(day.dow)}
                                disabled={loading}
                              />
                            )}
                          />
                          <span style={{ fontSize: 12, color: isCustom ? '#2e7d32' : '#888' }}>
                            {isCustom ? 'Sí (editable)' : 'No (usa general)'}
                          </span>
                        </label>
                      </td>
                      <td>
                        <Controller
                          name={`days.${idx}.max_regular_hours`}
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <input
                              type="number" step="0.5" min="0" max="24"
                              value={value}
                              onChange={e => {
                                onChange(e.target.value);
                                isCustom && updateRate(day.dow, 'max_regular_hours', e.target.value);
                              }}
                              style={{ width: 80 }}
                              disabled={loading || !isCustom}
                            />
                          )}
                        />
                      </td>
                      <td>
                        <Controller
                          name={`days.${idx}.regular_rate`}
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <input
                              type="number" step="0.01" min="0"
                              value={value}
                              onChange={e => {
                                onChange(e.target.value);
                                isCustom && updateRate(day.dow, 'regular_rate', e.target.value);
                              }}
                              style={{ width: 100 }}
                              disabled={loading || !isCustom}
                            />
                          )}
                        />
                      </td>
                      <td>
                        <Controller
                          name={`days.${idx}.overtime_rate`}
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <input
                              type="number" step="0.01" min="0"
                              value={value}
                              onChange={e => {
                                onChange(e.target.value);
                                isCustom && updateRate(day.dow, 'overtime_rate', e.target.value);
                              }}
                              style={{ width: 100 }}
                              disabled={loading || !isCustom}
                            />
                          )}
                        />
                      </td>
                      <td>
                        <Controller
                          name={`days.${idx}.lunch_duration`}
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <input
                              type="number" step="0.01" min="0" max="24"
                              value={value}
                              onChange={e => {
                                onChange(e.target.value);
                                isCustom && updateRate(day.dow, 'lunch_duration', e.target.value);
                              }}
                              style={{ width: 100 }}
                              disabled={loading || !isCustom}
                            />
                          )}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
              * Active el checkbox "Personalizada" para crear una tarifa propia para ese día.<br />
              * Si el checkbox está desactivado, el empleado usará la tarifa general.<br />
              * Los valores en gris son las tarifas generales (no editables aquí).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
