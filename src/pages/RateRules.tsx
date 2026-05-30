import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { RateRule } from '../types/api';

interface Message {
  type: 'error' | 'success';
  text: string;
}

interface RateRulesForm {
  rules: RateRule[];
}

export default function RateRules() {
  const [rules, setRules] = useState<RateRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const { control, reset } = useForm<RateRulesForm>({
    defaultValues: { rules: [] },
  });

  const showError = (msg: string) => setMessage({ type: 'error', text: msg });
  const showSuccess = (msg: string) => setMessage({ type: 'success', text: msg });
  const clearMessage = () => setMessage(null);

  const load = async () => {
    setLoading(true);
    clearMessage();
    try {
      if (window.api) setRules(await window.api.getRateRules());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al cargar tarifas: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    reset({ rules });
  }, [rules, reset]);

  const update = async (id: number, field: keyof RateRule, value: string) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    const updated = { ...rule, [field]: parseFloat(value) || 0 };
    setLoading(true);
    clearMessage();
    try {
      await window.api.updateRateRule(
        id,
        updated.max_regular_hours,
        updated.regular_rate,
        updated.overtime_rate,
        updated.lunch_duration
      );
      showSuccess('Tarifa actualizada');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al actualizar tarifa: ' + msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const NumberField = ({
    index,
    field,
    rule,
    width,
    step = '0.01',
    min = '0',
    max,
  }: {
    index: number;
    field: 'max_regular_hours' | 'regular_rate' | 'overtime_rate' | 'lunch_duration';
    rule: RateRule;
    width: number;
    step?: string;
    min?: string;
    max?: string;
  }) => (
    <Controller
      name={`rules.${index}.${field}`}
      control={control}
      render={({ field: { value, onChange } }) => (
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={e => {
            onChange(e.target.value);
            update(rule.id, field, e.target.value);
          }}
          style={{ width }}
          disabled={loading}
        />
      )}
    />
  );

  return (
    <div>
      <div className="page-header">
        <h1>Tarifas por Día</h1>
        <p>Configure el valor por hora y descuento de almuerzo según el día de la semana</p>
      </div>
      <div className="card">
        {message && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}
        {loading && rules.length === 0 ? (
          <div className="empty-state">
            <span className="spinner" style={{ borderColor: 'rgba(15,52,96,0.2)', borderTopColor: '#0f3460' }} />
            <p style={{ marginTop: 12 }}>Cargando tarifas...</p>
          </div>
        ) : (
        <table>
          <thead>
            <tr>
              <th>Día</th>
              <th>Horas Regulares</th>
              <th>Valor Hora Regular</th>
              <th>Valor Hora Extra</th>
              <th>Descuento Almuerzo (hrs)</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, idx) => (
              <tr key={rule.id}>
                <td><strong>{rule.day_name}</strong></td>
                <td>
                  <NumberField index={idx} field="max_regular_hours" rule={rule} width={80} step="0.5" max="24" />
                </td>
                <td>
                  <NumberField index={idx} field="regular_rate" rule={rule} width={100} />
                </td>
                <td>
                  <NumberField index={idx} field="overtime_rate" rule={rule} width={100} />
                </td>
                <td>
                  <NumberField index={idx} field="lunch_duration" rule={rule} width={100} max="24" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
        <p style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
          * Si "Horas Regulares" es 0, todas las horas se pagan como extra.<br />
          * El "Descuento Almuerzo" se resta automáticamente de las horas trabajadas al calcular la nómina.<br />
          * Lunes a Sábado: 8h regulares a $2.50, extra a $3.00 — Domingo: todo a $3.00 (ejemplo inicial)
        </p>
      </div>
    </div>
  );
}
