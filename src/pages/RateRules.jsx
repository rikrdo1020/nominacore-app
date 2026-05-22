import React, { useState, useEffect } from 'react';

export default function RateRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const showError = (msg) => setMessage({ type: 'error', text: msg });
  const showSuccess = (msg) => setMessage({ type: 'success', text: msg });
  const clearMessage = () => setMessage(null);

  const load = async () => {
    clearMessage();
    try {
      if (window.api) setRules(await window.api.getRateRules());
    } catch (err) {
      showError('Error al cargar tarifas: ' + (err.message || 'Desconocido'));
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  const update = async (id, field, value) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    const updated = { ...rule, [field]: parseFloat(value) || 0 };
    setLoading(true);
    clearMessage();
    try {
      await window.api.updateRateRule(id, updated.max_regular_hours, updated.regular_rate, updated.overtime_rate, updated.lunch_duration);
      showSuccess('Tarifa actualizada');
      await load();
    } catch (err) {
      showError('Error al actualizar tarifa: ' + (err.message || 'Desconocido'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
            {rules.map(rule => (
              <tr key={rule.id}>
                <td><strong>{rule.day_name}</strong></td>
                <td>
                  <input type="number" step="0.5" min="0" max="24"
                    value={rule.max_regular_hours}
                    onChange={e => update(rule.id, 'max_regular_hours', e.target.value)}
                    style={{ width: 80 }} disabled={loading} />
                </td>
                <td>
                  <input type="number" step="0.01" min="0"
                    value={rule.regular_rate}
                    onChange={e => update(rule.id, 'regular_rate', e.target.value)}
                    style={{ width: 100 }} disabled={loading} />
                </td>
                <td>
                  <input type="number" step="0.01" min="0"
                    value={rule.overtime_rate}
                    onChange={e => update(rule.id, 'overtime_rate', e.target.value)}
                    style={{ width: 100 }} disabled={loading} />
                </td>
                <td>
                  <input type="number" step="0.01" min="0" max="24"
                    value={rule.lunch_duration}
                    onChange={e => update(rule.id, 'lunch_duration', e.target.value)}
                    style={{ width: 100 }} disabled={loading} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
          * Si "Horas Regulares" es 0, todas las horas se pagan como extra.<br />
          * El "Descuento Almuerzo" se resta automáticamente de las horas trabajadas al calcular la nómina.<br />
          * Lunes a Sábado: 8h regulares a $2.50, extra a $3.00 — Domingo: todo a $3.00 (ejemplo inicial)
        </p>
      </div>
    </div>
  );
}
