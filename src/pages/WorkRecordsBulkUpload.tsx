import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBulkWorkRecordUpload, isRowValid } from '../hooks/use-bulk-work-record-upload';

export default function WorkRecordsBulkUpload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get('employeeId') ?? '';

  const {
    selectedEmployee,
    stagedFiles, stagingError, addFiles, removeStagedFile,
    rows, editRow, removeRow, addManualRow,
    analyze, isAnalyzing, analyzeError,
    confirmAll, isSaving, saveError, validRowCount,
  } = useBulkWorkRecordUpload(employeeId);

  const goBack = () => navigate(`/records?employeeId=${employeeId}`);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" className="icon-btn" onClick={goBack} aria-label="Volver" style={{ fontSize: 20 }}>‹</button>
        <div>
          <h1>Carga masiva con IA</h1>
          <p>{selectedEmployee ? `Registro de horas para ${selectedEmployee.name}` : 'Seleccione un empleado'}</p>
        </div>
      </div>

      <div className="card">
        <label className="field-label">Imágenes de asistencia</label>
        <p style={{ fontSize: 13, color: '#666', marginTop: -4, marginBottom: 12 }}>
          Sube fotos de marcajes u hojas de horario y la IA completa fecha, entrada/salida u horas por ti
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label className="btn-pill-outline" style={{ cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}>
            Elegir imágenes
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isAnalyzing}
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {stagedFiles.length > 0 && (
            <button type="button" className="btn-pill-primary" onClick={() => analyze()} disabled={isAnalyzing}>
              {isAnalyzing ? <span className="spinner" /> : `Analizar ${stagedFiles.length} imagen${stagedFiles.length > 1 ? 'es' : ''}`}
            </button>
          )}
        </div>

        {stagingError && <div className="alert alert-error" style={{ marginTop: 12 }}>{stagingError}</div>}
        {analyzeError && <div className="alert alert-error" style={{ marginTop: 12 }}>{analyzeError}</div>}

        {stagedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {stagedFiles.map((f, i) => (
              <span key={`${f.name}-${i}`} className="status-badge" style={{ background: '#f0f0f0', color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
                {f.name}
                <button
                  type="button"
                  onClick={() => removeStagedFile(i)}
                  disabled={isAnalyzing}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c53030', fontSize: 13, lineHeight: 1 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <label className="field-label" style={{ margin: 0 }}>Verificar antes de guardar</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-pill-outline" onClick={addManualRow} disabled={isSaving}>
              + Agregar fila manual
            </button>
            <button type="button" className="btn-pill-primary" onClick={() => confirmAll()} disabled={isSaving || validRowCount === 0}>
              {isSaving ? <span className="spinner" /> : `Guardar ${validRowCount}`}
            </button>
          </div>
        </div>
        {saveError && <div className="alert alert-error">{saveError}</div>}

        {rows.length === 0 ? (
          <div className="empty-state"><p>No hay filas todavía. Sube imágenes o agrega una manualmente.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Archivo</th>
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
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.fileName}
                    {(row.extractError || !isRowValid(row)) && (
                      <div style={{ fontSize: 11, color: '#9e6e0a', marginTop: 2 }}>
                        {row.extractError || 'Revisar campos'}
                      </div>
                    )}
                  </td>
                  <td>
                    <input type="date" className="custom-input" disabled={isSaving}
                      value={row.date} onChange={(e) => editRow(row.id, 'date', e.target.value)} />
                  </td>
                  <td>
                    <select className="custom-input" disabled={isSaving}
                      value={row.isDirectEntry ? 'direct' : 'range'}
                      onChange={(e) => editRow(row.id, 'isDirectEntry', e.target.value === 'direct')}>
                      <option value="range">Entrada/Salida</option>
                      <option value="direct">Horas directas</option>
                    </select>
                  </td>
                  <td>
                    <input type="time" className="custom-input" disabled={isSaving || row.isDirectEntry}
                      value={row.entryTime} onChange={(e) => editRow(row.id, 'entryTime', e.target.value)} />
                  </td>
                  <td>
                    <input type="time" className="custom-input" disabled={isSaving || row.isDirectEntry}
                      value={row.exitTime} onChange={(e) => editRow(row.id, 'exitTime', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" step="0.25" min="0" max="24" className="custom-input" disabled={isSaving || !row.isDirectEntry}
                      value={row.directHours} onChange={(e) => editRow(row.id, 'directHours', e.target.value)} />
                  </td>
                  <td>
                    <input type="text" className="custom-input" disabled={isSaving}
                      value={row.notes} onChange={(e) => editRow(row.id, 'notes', e.target.value)} />
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => removeRow(row.id)} disabled={isSaving}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
