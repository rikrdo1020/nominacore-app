import { Controller } from 'react-hook-form';
import { DAYS, useEmployeeRates } from '../hooks/use-employee-rates';

export default function EmployeeRates() {
  const {
    employees,
    selectedEmployee,
    setSelectedEmployee,
    control,
    hasCustomRate,
    toggleDayRate,
    updateRate,
    isLoading,
    isBusy,
    error,
  } = useEmployeeRates();

  return (
    <div>
      <div className="page-header">
        <h1>Tarifas por Empleado</h1>
        <p>Configure tarifas personalizadas para cada empleado. Si un empleado no tiene tarifa personalizada para un día, se usará la tarifa general.</p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Empleado:</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value ? parseInt(e.target.value) : '')}
            style={{ padding: '8px 12px', fontSize: 14, minWidth: 250 }}
          >
            <option value="">Seleccione un empleado...</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {!selectedEmployee && (
          <div className="empty-state">
            <p>Seleccione un empleado para ver o editar sus tarifas personalizadas.</p>
          </div>
        )}

        {selectedEmployee && isLoading && (
          <div className="empty-state">
            <span className="spinner" style={{ borderColor: 'rgba(15,52,96,0.2)', borderTopColor: '#0f3460' }} />
            <p style={{ marginTop: 12 }}>Cargando tarifas...</p>
          </div>
        )}

        {selectedEmployee && !isLoading && (
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
                                disabled={isBusy}
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
                              onChange={e => onChange(e.target.value)}
                              onBlur={e => isCustom && updateRate(day.dow, 'max_regular_hours', e.target.value)}
                              style={{ width: 80 }}
                              disabled={!isCustom}
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
                              onChange={e => onChange(e.target.value)}
                              onBlur={e => isCustom && updateRate(day.dow, 'regular_rate', e.target.value)}
                              style={{ width: 100 }}
                              disabled={!isCustom}
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
                              onChange={e => onChange(e.target.value)}
                              onBlur={e => isCustom && updateRate(day.dow, 'overtime_rate', e.target.value)}
                              style={{ width: 100 }}
                              disabled={!isCustom}
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
                              onChange={e => onChange(e.target.value)}
                              onBlur={e => isCustom && updateRate(day.dow, 'lunch_duration', e.target.value)}
                              style={{ width: 100 }}
                              disabled={!isCustom}
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
