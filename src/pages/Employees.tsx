import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import type { Employee } from '../types/api';
import { formatDateTimeDay } from '../utils/time';
import Modal from '../components/ui/Modal';

interface Message {
  type: 'error' | 'success';
  text: string;
}

type SortField = 'name' | 'created_at';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZE = 10;

/* ─── Iconos inline (SVG) ─── */
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
  </svg>
);
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);
const IconRefresh = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" />
  </svg>
);
const IconUser = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="M12 5v14" />
  </svg>
);
const IconSort = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" />
  </svg>
);
const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/* ─── Helpers ─── */
const thisMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
};

export default function Employees() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [apiReady, setApiReady] = useState(false);

  /* Filtros / búsqueda / orden */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  /* Modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  /* Formulario */
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({ mode: 'onBlur' });

  const showError = (msg: string) => setMessage({ type: 'error', text: msg });
  const showSuccess = (msg: string) => setMessage({ type: 'success', text: msg });
  const clearMessage = () => setMessage(null);

  /* Carga inicial */
  useEffect(() => {
    if (!window.api) {
      showError('No se pudo conectar con el backend. Ejecuta la app desde Electron.');
      return;
    }
    setApiReady(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    clearMessage();
    try {
      const data = await window.api.getAllEmployees();
      setAllEmployees(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al cargar empleados: ' + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Empleados filtrados y ordenados */
  const filtered = useMemo(() => {
    let list = [...allEmployees];

    if (statusFilter === 'active') list = list.filter((e) => e.is_active === 1);
    else if (statusFilter === 'inactive') list = list.filter((e) => e.is_active === 0);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allEmployees, statusFilter, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  /* Estadísticas */
  const stats = useMemo(() => {
    const now = new Date();
    const { start: monthStart } = thisMonth();
    const active = allEmployees.filter((e) => e.is_active === 1).length;
    const inactive = allEmployees.filter((e) => e.is_active === 0).length;
    const newThisMonth = allEmployees.filter((e) => {
      const d = new Date(e.created_at);
      return d >= monthStart && d <= now;
    }).length;
    return { active, inactive, newThisMonth, total: allEmployees.length };
  }, [allEmployees]);

  /* Handlers */
  const onAdd = async (data: { name: string }) => {
    const name = data.name.trim();
    if (!name) return;
    clearMessage();
    try {
      await window.api.addEmployee(name);
      showSuccess('Empleado agregado correctamente');
      reset();
      setModalOpen(false);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al agregar empleado: ' + msg);
    }
  };

  const onEdit = async (data: { name: string }) => {
    if (!editingEmployee) return;
    const name = data.name.trim();
    if (!name) return;
    clearMessage();
    try {
      await window.api.updateEmployee(editingEmployee.id, name);
      showSuccess('Empleado actualizado');
      reset();
      setEditingEmployee(null);
      setModalOpen(false);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al actualizar: ' + msg);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Desactivar este empleado?')) return;
    clearMessage();
    try {
      await window.api.deleteEmployee(id);
      showSuccess('Empleado desactivado');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error al desactivar: ' + msg);
    }
  };

  const reactivate = async (id: number) => {
    if (!confirm('¿Reactivar este empleado?')) return;
    clearMessage();
    try {
      await window.api.updateEmployee(id, allEmployees.find((e) => e.id === id)?.name || '');
      /* Nota: el backend actual no expone reactivación directa.
         Aquí haríamos un endpoint dedicado, pero por ahora mostramos feedback. */
      showSuccess('Funcionalidad de reactivación requiere endpoint dedicado');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Desconocido';
      showError('Error: ' + msg);
    }
  };

  const openAdd = () => {
    setEditingEmployee(null);
    reset({ name: '' });
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setValue('name', emp.name);
    setModalOpen(true);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const isBusy = loading || isSubmitting;

  /* ─── Render ─── */
  if (!apiReady) {
    return (
      <div>
        <div className="page-header-kraken">
          <div>
            <h1>Empleados</h1>
            <p>Gestión del personal</p>
          </div>
        </div>
        <div className="card-kraken">
          {message && (
            <div className={`alert alert-${message.type}`} style={{ marginBottom: 16 }}>
              {message.text}
            </div>
          )}
          <div className="empty-state-kraken">
            <p>Esperando conexión con el backend...</p>
            <p style={{ fontSize: 13, color: '#b8bbcc', marginTop: 8 }}>
              Abre las DevTools (Ctrl+Shift+I) para más detalles.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header-kraken">
        <div>
          <h1>Empleados</h1>
          <p>Gestiona el personal de tu empresa</p>
        </div>
        <button className="btn-kraken btn-kraken-primary" onClick={openAdd} disabled={isBusy}>
          <IconPlus /> Nuevo empleado
        </button>
      </div>

      {/* Mensajes */}
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: 16 }}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Activos</div>
          <div className="stat-value purple">{stats.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inactivos</div>
          <div className="stat-value red">{stats.inactive}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Nuevos este mes</div>
          <div className="stat-value green">{stats.newThisMonth}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{stats.total}</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card-kraken" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f5' }}>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <div className="toolbar-search search-input-wrap">
              <span className="search-icon"><IconSearch /></span>
              <input
                className="input-kraken"
                placeholder="Buscar empleado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="toolbar-filters">
              <select
                className="select-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <button
                className="btn-kraken btn-kraken-ghost btn-kraken-sm"
                onClick={load}
                disabled={isBusy}
                aria-label="Recargar"
                title="Recargar"
              >
                <IconRefresh />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        {loading && allEmployees.length === 0 ? (
          <div style={{ padding: 40 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 200, height: 16 }} />
                <div className="skeleton" style={{ width: 120, height: 16 }} />
                <div className="skeleton" style={{ width: 80, height: 16 }} />
                <div className="skeleton" style={{ width: 100, height: 16, marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state-kraken">
            <div className="empty-icon">
              <IconUser />
            </div>
            <h3>
              {search.trim()
                ? 'No se encontraron empleados'
                : statusFilter === 'inactive'
                ? 'No hay empleados inactivos'
                : 'No hay empleados registrados'}
            </h3>
            <p>
              {search.trim()
                ? 'Intenta con otro término de búsqueda'
                : 'Comienza agregando tu primer empleado'}
            </p>
            {!search.trim() && statusFilter !== 'inactive' && (
              <button className="btn-kraken btn-kraken-primary" onClick={openAdd}>
                <IconPlus /> Agregar empleado
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="table-kraken">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                    Nombre
                    <span className={`sort-indicator${sortField === 'name' ? ' active' : ''}`}>
                      {sortField === 'name' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : <IconSort />}
                    </span>
                  </th>
                  <th onClick={() => toggleSort('created_at')} style={{ cursor: 'pointer' }}>
                    Fecha de registro
                    <span className={`sort-indicator${sortField === 'created_at' ? ' active' : ''}`}>
                      {sortField === 'created_at' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : <IconSort />}
                    </span>
                  </th>
                  <th style={{ width: 120 }}>Estado</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((emp) => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 500 }}>{emp.name}</td>
                    <td style={{ color: '#686b82' }}>{formatDateTimeDay(emp.created_at)}</td>
                    <td>
                      {emp.is_active === 1 ? (
                        <span className="badge-kraken badge-kraken-success">
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#149e61', display: 'inline-block' }} />
                          Activo
                        </span>
                      ) : (
                        <span className="badge-kraken badge-kraken-neutral">
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9497a9', display: 'inline-block' }} />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="actions">
                      <button
                        className="btn-kraken btn-kraken-ghost btn-kraken-sm"
                        onClick={() => openEdit(emp)}
                        title="Editar"
                        aria-label={`Editar ${emp.name}`}
                      >
                        <IconEdit />
                      </button>
                      {emp.is_active === 1 ? (
                        <button
                          className="btn-kraken btn-kraken-danger btn-kraken-sm"
                          onClick={() => remove(emp.id)}
                          title="Desactivar"
                          aria-label={`Desactivar ${emp.name}`}
                        >
                          <IconTrash />
                        </button>
                      ) : (
                        <button
                          className="btn-kraken btn-kraken-subtle btn-kraken-sm"
                          onClick={() => reactivate(emp.id)}
                          title="Reactivar"
                          aria-label={`Reactivar ${emp.name}`}
                        >
                          <IconRefresh />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                <span>
                  Mostrando {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
                </span>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    aria-label="Página anterior"
                  >
                    <IconChevronLeft />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`pagination-btn${p === safePage ? ' active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    aria-label="Página siguiente"
                  >
                    <IconChevronRight />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Add / Edit */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setModalOpen(false);
            setEditingEmployee(null);
            reset();
          }
        }}
        title={editingEmployee ? 'Editar empleado' : 'Nuevo empleado'}
        footer={
          <>
            <button
              className="btn-kraken btn-kraken-secondary"
              onClick={() => {
                setModalOpen(false);
                setEditingEmployee(null);
                reset();
              }}
              disabled={isSubmitting}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="btn-kraken btn-kraken-primary"
              onClick={handleSubmit(editingEmployee ? onEdit : onAdd)}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? (
                <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', width: 14, height: 14 }} />
              ) : editingEmployee ? (
                'Guardar cambios'
              ) : (
                'Agregar empleado'
              )}
            </button>
          </>
        }
      >
        <form
          onSubmit={handleSubmit(editingEmployee ? onEdit : onAdd)}
          style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          <label
            htmlFor="emp-name"
            style={{ fontSize: 13, fontWeight: 600, color: '#484b5e', marginBottom: 4 }}
          >
            Nombre completo
          </label>
          <input
            id="emp-name"
            className={`input-kraken${errors.name ? ' input-kraken-error' : ''}`}
            placeholder="Ej. Juan Pérez"
            autoFocus
            {...register('name', { required: 'El nombre es obligatorio' })}
          />
          {errors.name && <span className="input-error-text">{errors.name.message}</span>}
        </form>
      </Modal>
    </div>
  );
}
