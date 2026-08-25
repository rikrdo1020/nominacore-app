import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { RateRule } from '../types/api';
import { useRateRules } from '../hooks/use-rate-rules';

interface RateRulesFormValues {
  rules: RateRule[];
}

function NumberField({
  index,
  field,
  rule,
  control,
  onCommit,
  width,
  step = '0.01',
  min = '0',
  max,
}: {
  index: number;
  field: 'max_regular_hours' | 'regular_rate' | 'overtime_rate' | 'lunch_duration';
  rule: RateRule;
  control: Control<RateRulesFormValues>;
  onCommit: (id: number, field: keyof RateRule, value: string) => void;
  width: number;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
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
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onCommit(rule.id, field, e.target.value)}
          style={{ width }}
        />
      )}
    />
  );
}

export default function RateRules() {
  const { rules, isLoading, loadError, control, updateField, updateError } = useRateRules();

  return (
    <div>
      <div className="page-header">
        <h1>Tarifas por Día</h1>
        <p>Configure el valor por hora y descuento de almuerzo según el día de la semana</p>
      </div>
      <div className="card">
        {(loadError || updateError) && (
          <div className="alert alert-error">{loadError || updateError}</div>
        )}
        {isLoading && rules.length === 0 ? (
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
                  <NumberField index={idx} field="max_regular_hours" rule={rule} control={control} onCommit={updateField} width={80} step="0.5" max="24" />
                </td>
                <td>
                  <NumberField index={idx} field="regular_rate" rule={rule} control={control} onCommit={updateField} width={100} />
                </td>
                <td>
                  <NumberField index={idx} field="overtime_rate" rule={rule} control={control} onCommit={updateField} width={100} />
                </td>
                <td>
                  <NumberField index={idx} field="lunch_duration" rule={rule} control={control} onCommit={updateField} width={100} max="24" />
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
